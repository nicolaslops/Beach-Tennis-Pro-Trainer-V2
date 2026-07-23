import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

type Json = Record<string, unknown>;
type PaidPlan = "plus" | "pro";

const APPROVED_EVENTS = new Set(["PURCHASE_APPROVED"]);
const PENDING_EVENTS = new Set(["PURCHASE_DELAYED"]);
const CANCELED_EVENTS = new Set(["PURCHASE_CANCELED", "PURCHASE_EXPIRED"]);
const REFUNDED_EVENTS = new Set(["PURCHASE_REFUNDED", "PURCHASE_REFUND"]);
const CHARGEBACK_EVENTS = new Set(["PURCHASE_CHARGEBACK", "PURCHASE_PROTEST"]);
const HANDLED_EVENTS = new Set([
  ...APPROVED_EVENTS,
  ...PENDING_EVENTS,
  ...CANCELED_EVENTS,
  ...REFUNDED_EVENTS,
  ...CHARGEBACK_EVENTS
]);

function response(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_env_${name}`);
  return value;
}

function optionalEnv(name: string) {
  return Deno.env.get(name)?.trim() || "";
}

function object(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

function path(source: unknown, keys: string[]) {
  return keys.reduce<unknown>((current, key) => object(current)[key], source);
}

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function id(value: unknown) {
  return text(value).replace(/\.0$/, "");
}

function email(value: unknown) {
  return text(value).toLowerCase();
}

function secureEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function isoDate(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const number = Number(raw);
    const date = new Date(number > 10_000_000_000 ? number : number * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parsePayload(payload: Json) {
  const data = object(payload.data);
  const eventType = text(payload.event ?? payload.event_type ?? payload.type).toUpperCase();
  const transactionId = id(
    path(data, ["purchase", "transaction"]) ??
    path(data, ["purchase", "transaction_id"]) ??
    data.transaction_id ??
    payload.transaction_id
  );
  const productId = id(
    path(data, ["product", "id"]) ??
    path(data, ["product", "ucode"]) ??
    payload.product_id
  );
  const productName = text(path(data, ["product", "name"]) ?? payload.product_name);
  const offerId = id(
    path(data, ["purchase", "offer", "code"]) ??
    path(data, ["purchase", "offer", "key"]) ??
    path(data, ["purchase", "offer", "id"]) ??
    payload.offer_id
  );
  const subscriberEmail = email(
    path(data, ["buyer", "email"]) ??
    path(data, ["subscriber", "email"]) ??
    payload.email
  );
  const buyerName = text(
    path(data, ["buyer", "name"]) ??
    path(data, ["buyer", "full_name"]) ??
    path(data, ["subscriber", "name"]) ??
    payload.buyer_name
  );
  const purchaseDate = isoDate(
    path(data, ["purchase", "approved_date"]) ??
    path(data, ["purchase", "order_date"]) ??
    payload.creation_date ??
    payload.purchase_date
  ) || new Date().toISOString();
  const eventId = text(payload.id ?? payload.event_id);
  // Um mesmo evento sem ID continua idempotente mesmo quando for reenviado depois.
  const eventKey = eventId || ["hotmart", eventType, transactionId].join(":");

  return {
    eventId,
    eventKey,
    eventType,
    transactionId,
    productId,
    productName,
    offerId,
    subscriberEmail,
    buyerName,
    purchaseDate
  };
}

function planMappings() {
  return [
    {
      plan: "plus" as PaidPlan,
      productId: id(requiredEnv("HOTMART_PLUS_PRODUCT_ID")),
      offerId: id(optionalEnv("HOTMART_PLUS_OFFER_ID"))
    },
    {
      plan: "pro" as PaidPlan,
      productId: id(requiredEnv("HOTMART_PRO_PRODUCT_ID")),
      offerId: id(optionalEnv("HOTMART_PRO_OFFER_ID"))
    }
  ];
}

function knownProduct(productId: string, mappings: ReturnType<typeof planMappings>) {
  return Boolean(productId) && mappings.some((mapping) => mapping.productId === productId);
}

function resolvePaidPlan(productId: string, offerId: string, mappings: ReturnType<typeof planMappings>): PaidPlan | null {
  if (offerId) {
    const byOffer = mappings.find((mapping) => mapping.offerId && mapping.offerId === offerId);
    if (byOffer && byOffer.productId === productId) return byOffer.plan;
  }
  const byProduct = mappings.filter((mapping) => mapping.productId === productId);
  if (byProduct.length === 1) return byProduct[0].plan;
  return null;
}

function eventResult(eventType: string) {
  if (APPROVED_EVENTS.has(eventType)) return { status: "approved", active: true, emptyStatus: "inactive" };
  if (PENDING_EVENTS.has(eventType)) return { status: "pending", active: false, emptyStatus: "inactive" };
  if (REFUNDED_EVENTS.has(eventType)) return { status: "refunded", active: false, emptyStatus: "refunded" };
  if (CHARGEBACK_EVENTS.has(eventType)) return { status: "chargeback", active: false, emptyStatus: "chargeback" };
  if (eventType === "PURCHASE_EXPIRED") return { status: "expired", active: false, emptyStatus: "expired" };
  return { status: "canceled", active: false, emptyStatus: "canceled" };
}

async function claimEvent(supabase: SupabaseClient, payload: Json, info: ReturnType<typeof parsePayload>) {
  const { data, error } = await supabase.rpc("claim_subscription_event", {
    p_event_key: info.eventKey,
    p_event_id: info.eventId || null,
    p_event_type: info.eventType,
    p_transaction_id: info.transactionId,
    p_recurrence_number: null,
    p_subscriber_email: info.subscriberEmail,
    p_product_id: info.productId,
    p_offer_id: info.offerId || null,
    p_payload: payload
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("claim_event_without_result");
  return {
    claimed: row.claimed === true,
    key: text(row.event_key),
    status: text(row.processing_status)
  };
}

async function markEvent(supabase: SupabaseClient, eventKey: string, status: "processed" | "failed", errorMessage?: string) {
  const { error } = await supabase.rpc("mark_subscription_event", {
    p_event_key: eventKey,
    p_status: status,
    p_error_message: errorMessage ? errorMessage.slice(0, 240) : null
  });
  if (error) throw error;
}

async function profileByEmail(supabase: SupabaseClient, buyerEmail: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", buyerEmail)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Json | null;
}

async function purchaseByTransaction(supabase: SupabaseClient, transactionId: string) {
  const { data, error } = await supabase
    .from("hotmart_purchases")
    .select("*")
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (error) throw error;
  return data as Json | null;
}

async function userByEmail(supabase: SupabaseClient, buyerEmail: string) {
  for (let pageNumber = 1; pageNumber <= 20; pageNumber += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pageNumber, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((candidate) => candidate.email?.toLowerCase() === buyerEmail);
    if (found) return found;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function findUser(supabase: SupabaseClient, buyerEmail: string, purchase: Json | null, profile: Json | null) {
  const userId = id(purchase?.user_id ?? profile?.id);
  if (userId) {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) throw error;
    if (data.user) return data.user;
  }
  return userByEmail(supabase, buyerEmail);
}

function accountPredatesPurchase(
  user: User,
  profile: Json | null,
  existingPurchase: Json | null,
  purchaseDate: string
) {
  if (id(existingPurchase?.user_id) === user.id) return true;
  const accountCreatedAt = isoDate(profile?.created_at ?? user.created_at);
  const purchasedAt = isoDate(purchaseDate);
  if (!accountCreatedAt || !purchasedAt) return false;
  return new Date(accountCreatedAt).getTime() <= new Date(purchasedAt).getTime();
}

async function ensureProfile(supabase: SupabaseClient, user: User, info: ReturnType<typeof parsePayload>) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      name: info.buyerName || object(user.user_metadata).name || null,
      email: info.subscriberEmail,
      access_active: true
    }, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as Json;
}

async function upsertPurchase(
  supabase: SupabaseClient,
  user: User | null,
  existing: Json | null,
  info: ReturnType<typeof parsePayload>,
  plan: PaidPlan,
  result: ReturnType<typeof eventResult>
) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("hotmart_purchases").upsert({
    user_id: user?.id || existing?.user_id || null,
    email: info.subscriberEmail,
    buyer_name: info.buyerName || existing?.buyer_name || null,
    transaction_id: info.transactionId,
    hotmart_transaction_id: info.transactionId,
    product_id: info.productId,
    product_name: info.productName || existing?.product_name || null,
    offer_id: info.offerId || existing?.offer_id || null,
    plan,
    access_model: "one_time",
    purchase_status: result.status,
    access_active: result.active,
    must_change_password: existing?.must_change_password === true,
    purchase_date: existing?.purchase_date || info.purchaseDate,
    revoked_at: result.active ? null : now,
    event_id: info.eventId || null,
    updated_at: now
  }, { onConflict: "transaction_id" });
  if (error) throw error;
}

async function recomputeAccess(supabase: SupabaseClient, userId: string, emptyStatus: string) {
  const { data, error } = await supabase.rpc("recompute_one_time_access", {
    p_user_id: userId,
    p_empty_status: emptyStatus
  });
  if (error) throw error;
  return text(data);
}

serve(async (request) => {
  if (request.method !== "POST") return response(405, { ok: false, error: "method_not_allowed" });

  let claimedEventKey = "";
  let supabase: SupabaseClient | null = null;
  try {
    const suppliedToken = request.headers.get("x-hotmart-hottok")?.trim() || "";
    if (!suppliedToken || !secureEqual(suppliedToken, requiredEnv("HOTMART_HOTTOK"))) {
      return response(401, { ok: false, error: "invalid_hottok" });
    }

    const payload = await request.json() as Json;
    const info = parsePayload(payload);
    if (!info.eventType || !info.transactionId || !info.subscriberEmail || !info.productId || !info.eventKey) {
      return response(400, { ok: false, error: "invalid_payload" });
    }
    if (!HANDLED_EVENTS.has(info.eventType)) {
      return response(202, { ok: true, ignored: true, reason: "event_not_handled" });
    }

    const mappings = planMappings();
    if (!knownProduct(info.productId, mappings)) {
      return response(403, { ok: false, error: "unknown_product" });
    }

    supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const claim = await claimEvent(supabase, payload, info);
    claimedEventKey = claim.key;
    if (!claim.claimed) return response(200, { ok: true, duplicate: true, status: claim.status });

    const existingPurchase = await purchaseByTransaction(supabase, info.transactionId);
    const resolvedPlan = resolvePaidPlan(info.productId, info.offerId, mappings);
    const previousPlan = ["plus", "pro"].includes(text(existingPurchase?.plan).toLowerCase())
      ? text(existingPurchase?.plan).toLowerCase() as PaidPlan
      : null;
    const plan = resolvedPlan || previousPlan;
    if (!plan) throw new Error("plan_mapping_not_resolved");

    let profile = await profileByEmail(supabase, info.subscriberEmail);
    let user = await findUser(supabase, info.subscriberEmail, existingPurchase, profile);
    if (user && !accountPredatesPurchase(user, profile, existingPurchase, info.purchaseDate)) {
      user = null;
    }
    if (user) profile = await ensureProfile(supabase, user, info);

    let result = eventResult(info.eventType);
    const existingStatus = text(existingPurchase?.purchase_status).toLowerCase();
    const existingIsApproved = existingStatus === "approved" && existingPurchase?.access_active === true;
    if (PENDING_EVENTS.has(info.eventType) && existingIsApproved) {
      result = { status: "approved", active: true, emptyStatus: "inactive" };
    }
    if (APPROVED_EVENTS.has(info.eventType) && ["refunded", "chargeback"].includes(existingStatus)) {
      result = { status: existingStatus, active: false, emptyStatus: existingStatus };
    }
    await upsertPurchase(supabase, user, existingPurchase, info, plan, result);

    let effectivePlan = plan;
    if (user) effectivePlan = await recomputeAccess(supabase, user.id, result.emptyStatus);

    await markEvent(supabase, claimedEventKey, "processed");
    return response(200, {
      ok: true,
      processed: true,
      plan: effectivePlan,
      access_linked: Boolean(user),
      pending_account_link: !user
    });
  } catch (error) {
    console.error("Hotmart webhook failed without sensitive details.");
    if (supabase && claimedEventKey) {
      try {
        await markEvent(supabase, claimedEventKey, "failed", error instanceof Error ? error.message : "unknown_error");
      } catch {
        console.error("Could not mark failed purchase event.");
      }
    }
    return response(500, { ok: false, error: "webhook_processing_failed" });
  }
});
