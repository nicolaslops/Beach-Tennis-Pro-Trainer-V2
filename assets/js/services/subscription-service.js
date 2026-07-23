(function () {
  "use strict";

  const config = () => window.BTPT_PLAN_CONFIG;
  const PENDING_CHECKOUT_KEY = "btpt_purchase_pending_v1";
  const VERIFIED_STATE_TTL_MS = 15 * 60 * 1000;
  const DEFAULT_STATE = Object.freeze({
    plan: "free",
    effectivePlan: "free",
    status: "inactive",
    active: true,
    lifetimeAccess: false,
    legacyReviewRequired: false,
    legacyPlan: null,
    accessType: "free",
    permanentPlan: null,
    purchasedAt: null,
    currentPeriodEnd: null,
    canceledAt: null,
    nextPlan: null,
    pendingPlanEffectiveAt: null,
    provider: null,
    productId: null,
    offerId: null,
    transactionId: null,
    profile: null,
    user: null,
    verifiedAt: null,
    loading: true,
    error: null
  });

  let client = null;
  let session = null;
  let state = { ...DEFAULT_STATE };

  function normalizePlan(value) {
    const plan = String(value || "free").toLowerCase();
    return ["free", "plus", "pro"].includes(plan) ? plan : "free";
  }

  function normalizeProfile(profile, user) {
    const plan = normalizePlan(profile && profile.plan);
    const lifetimeAccess = profile && profile.lifetime_access === true;
    const legacyReviewRequired = profile && profile.legacy_review_required === true;
    const accessType = String(profile && profile.access_type || (lifetimeAccess ? "legacy_lifetime" : "free")).toLowerCase();
    const permanentPlan = accessType === "one_time"
      ? normalizePlan(profile && profile.permanent_plan || plan)
      : null;
    const legacyPlan = lifetimeAccess && accessType !== "one_time"
      ? normalizePlan(profile.legacy_plan || profile.permanent_plan || plan || "pro")
      : null;
    return {
      ...DEFAULT_STATE,
      plan,
      effectivePlan: permanentPlan || (lifetimeAccess ? legacyPlan : legacyReviewRequired ? "pro" : plan),
      status: String(profile && profile.subscription_status || "inactive").toLowerCase(),
      active: profile ? profile.access_active !== false : true,
      lifetimeAccess,
      legacyReviewRequired,
      legacyPlan,
      accessType,
      permanentPlan,
      purchasedAt: profile && profile.purchased_at || null,
      currentPeriodEnd: profile && profile.subscription_current_period_end || null,
      canceledAt: profile && profile.subscription_canceled_at || null,
      nextPlan: profile && profile.next_plan || null,
      pendingPlanEffectiveAt: profile && profile.pending_plan_effective_at || null,
      provider: profile && (profile.purchase_provider || profile.subscription_provider) || null,
      productId: profile && (profile.purchase_product_id || profile.subscription_product_id) || null,
      offerId: profile && (profile.purchase_offer_id || profile.subscription_offer_id) || null,
      transactionId: profile && (profile.purchase_transaction_id || profile.subscription_transaction_id) || null,
      profile: profile || null,
      user: user || session && session.user || null,
      verifiedAt: new Date().toISOString(),
      loading: false,
      error: null
    };
  }

  function emit() {
    window.dispatchEvent(new CustomEvent("btpt:subscription-changed", {
      detail: getState()
    }));
  }

  function effectivePlanNow(value) {
    if (value.accessType === "one_time" || value.lifetimeAccess || value.legacyReviewRequired) return value.effectivePlan;
    if (value.accessType !== "legacy_subscription") return value.effectivePlan;
    const periodEnd = value.currentPeriodEnd ? new Date(value.currentPeriodEnd).getTime() : NaN;
    const expiresByPeriod = ["active", "past_due", "canceled"].includes(value.status)
      && Number.isFinite(periodEnd)
      && periodEnd <= Date.now();
    return expiresByPeriod ? normalizePlan(value.nextPlan || "free") : value.effectivePlan;
  }

  function getState() {
    return { ...state, effectivePlan: effectivePlanNow(state) };
  }

  function getPendingCheckout() {
    try {
      const pending = JSON.parse(window.sessionStorage.getItem(PENDING_CHECKOUT_KEY) || "null");
      if (!pending?.plan || !pending?.startedAt) return null;
      if (Date.now() - Number(pending.startedAt) > 30 * 60 * 1000) {
        window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
        return null;
      }
      return pending;
    } catch (_error) {
      return null;
    }
  }

  function setPendingCheckout(plan) {
    const pending = { plan: normalizePlan(plan), startedAt: Date.now() };
    try {
      window.sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(pending));
    } catch (_error) {
      // A confirmação também funciona pelo parâmetro de retorno do checkout.
    }
    return pending;
  }

  function clearPendingCheckout() {
    try {
      window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
    } catch (_error) {
      // Sem ação necessária.
    }
  }

  function resolvePendingCheckout() {
    const pending = getPendingCheckout();
    if (!pending) return;
    const rank = config().PLAN_RANK;
    if ((rank[getState().effectivePlan] ?? 0) >= (rank[pending.plan] ?? 0)) clearPendingCheckout();
  }

  function setContext(options) {
    client = options && options.client || client;
    session = options && options.session || session;
    if (options && options.profile) {
      state = normalizeProfile(options.profile, session && session.user);
      resolvePendingCheckout();
      emit();
    }
    return getState();
  }

  async function refresh(options = {}) {
    if (!client || !session || !session.user) {
      state = { ...DEFAULT_STATE, loading: false, error: "session_unavailable" };
      emit();
      return getState();
    }

    if (!options.silent) {
      state = { ...state, loading: true, error: null };
      emit();
    }

    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error || !data) {
      const verifiedAge = state.verifiedAt ? Date.now() - new Date(state.verifiedAt).getTime() : Infinity;
      state = state.profile && verifiedAge <= VERIFIED_STATE_TTL_MS
        ? { ...state, loading: false, error: error && error.message || "profile_not_found" }
        : {
          ...DEFAULT_STATE,
          user: session.user,
          loading: false,
          error: error && error.message || "profile_not_found"
        };
      emit();
      return getState();
    }

    state = normalizeProfile(data, session.user);
    resolvePendingCheckout();
    emit();
    return getState();
  }

  function checkoutUrl(plan) {
    return config().checkoutUrls()[normalizePlan(plan)] || "";
  }

  function openCheckout(plan) {
    const normalized = normalizePlan(plan);
    if (normalized === "free") return { ok: false, reason: "free_plan" };
    const url = checkoutUrl(normalized);
    if (!config().isConfiguredUrl(url)) {
      window.dispatchEvent(new CustomEvent("btpt:subscription-message", {
        detail: {
          type: "warning",
          message: "O checkout deste plano ainda não foi configurado."
        }
      }));
      return { ok: false, reason: "checkout_not_configured" };
    }
    setPendingCheckout(normalized);
    window.location.assign(url);
    return { ok: true };
  }

  window.BTPT_SUBSCRIPTION = Object.freeze({
    setContext,
    refresh,
    getState,
    openCheckout,
    getPendingCheckout,
    clearPendingCheckout,
    normalizePlan
  });
})();
