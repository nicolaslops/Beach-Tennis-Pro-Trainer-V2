import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const json = (relativePath) => JSON.parse(read(relativePath));
const checks = [];

function test(name, callback) {
  try {
    callback();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

function browserContext() {
  const storage = new Map();
  const window = {
    BTPT_ENV: {},
    dispatchEvent() {},
    addEventListener() {},
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    }
  };
  const context = vm.createContext({ window, Set, Object, String, Array, Math, Date, JSON, CustomEvent: class {} });
  return { context, window };
}

const content = json("supabase/functions/app-content/content.json");

test("banco completo preservado", () => {
  assert.equal(content.exercicios.length, 120);
  assert.equal(content.planos_aula.length, 50);
  assert.equal(content.planos_evolucao.length, 3);
});

test("configuração central tem exatamente 25 IDs gratuitos válidos", () => {
  const { context, window } = browserContext();
  vm.runInContext(read("assets/js/config/free-exercises.js"), context);
  const result = window.BTPT_FREE_EXERCISES.validate(content.exercicios);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    valid: true,
    count: 25,
    uniqueCount: 25,
    missing: []
  });
});

test("25 exercícios estão distribuídos 9/8/8 entre os níveis", () => {
  const { context, window } = browserContext();
  vm.runInContext(read("assets/js/config/free-exercises.js"), context);
  const free = content.exercicios.filter((exercise) => window.BTPT_FREE_EXERCISES.has(exercise.id));
  const counts = Object.fromEntries(["iniciante", "intermediário", "avançado"].map((level) => [
    level,
    free.filter((exercise) => exercise.nivel.toLowerCase() === level).length
  ]));
  assert.deepEqual(counts, { iniciante: 9, intermediário: 8, avançado: 8 });
});

test("preços são compra única de R$ 30 e R$ 40", () => {
  const { context, window } = browserContext();
  vm.runInContext(read("assets/js/config/plans.js"), context);
  const plans = window.BTPT_PLAN_CONFIG.PLANS;
  assert.equal(plans.free.price, 0);
  assert.equal(plans.plus.price, 30);
  assert.equal(plans.pro.price, 40);
  assert.equal(plans.plus.billingPeriod, "one_time");
  assert.equal(plans.pro.billingPeriod, "one_time");
  assert.deepEqual(JSON.parse(JSON.stringify(window.BTPT_PLAN_CONFIG.PLAN_RANK)), { free: 0, plus: 1, pro: 2 });
});

test("matriz Free, Plus e Pro é cumulativa", () => {
  for (const [plan, expected] of Object.entries({
    free: { evolution: false, lessonPlans: false, premiumExercise: false },
    plus: { evolution: true, lessonPlans: false, premiumExercise: true },
    pro: { evolution: true, lessonPlans: true, premiumExercise: true }
  })) {
    const { context, window } = browserContext();
    vm.runInContext(read("assets/js/config/plans.js"), context);
    vm.runInContext(read("assets/js/config/free-exercises.js"), context);
    window.BTPT_SUBSCRIPTION = { getState: () => ({ effectivePlan: plan }) };
    vm.runInContext(read("assets/js/services/access-control.js"), context);
    assert.equal(window.BTPT_ACCESS.canAccessFeature("workoutBuilder"), true);
    assert.equal(window.BTPT_ACCESS.canAccessFeature("evolution"), expected.evolution);
    assert.equal(window.BTPT_ACCESS.canAccessFeature("lessonPlans"), expected.lessonPlans);
    assert.equal(window.BTPT_ACCESS.canAccessExercise("BT-V2-INI-001"), true);
    assert.equal(window.BTPT_ACCESS.canAccessExercise("BT-V2-AVA-040"), expected.premiumExercise);
  }
});

test("compra única Plus não é promovida para Pro nem expira", () => {
  const { context, window } = browserContext();
  window.BTPT_PLAN_CONFIG = { PLAN_RANK: { free: 0, plus: 1, pro: 2 }, checkoutUrls: () => ({}), isConfiguredUrl: () => false };
  vm.runInContext(read("assets/js/services/subscription-service.js"), context);
  window.BTPT_SUBSCRIPTION.setContext({
    session: { user: { id: "test-user" } },
    profile: {
      plan: "plus",
      access_type: "one_time",
      permanent_plan: "plus",
      lifetime_access: true,
      subscription_status: "active",
      subscription_current_period_end: "2020-01-01T00:00:00.000Z"
    }
  });
  const state = window.BTPT_SUBSCRIPTION.getState();
  assert.equal(state.effectivePlan, "plus");
  assert.equal(state.accessType, "one_time");
  assert.equal(state.permanentPlan, "plus");
});

test("conteúdo premium não está embutido no app público", () => {
  const app = read("assets/js/app.js");
  assert.equal(app.includes("const INITIAL_DATA"), false);
  assert.ok(app.length < 400_000);
  assert.equal(fs.existsSync(path.join(root, "assets/data/banco_completo_beach_tennis_app_v57.json")), false);
});

test("Service Worker usa cache V120 e não armazena APIs", () => {
  const worker = read("sw.js");
  assert.ok(worker.includes("requestUrl.origin !== self.location.origin"));
  assert.ok(worker.includes("content-service.js?v=119"));
  assert.ok(worker.includes("beach-tennis-pro-trainer-v120"));
  assert.equal(worker.includes("banco_completo_beach_tennis_app_v57.json"), false);
});

test("frontend não contém segredos administrativos", () => {
  const publicFiles = [
    "index.html", "assets/js/app.js", "assets/js/auth.js", "assets/js/env.js",
    "assets/js/services/subscription-service.js", "assets/js/services/content-service.js"
  ].map(read).join("\n");
  assert.equal(/SUPABASE_SERVICE_ROLE_KEY|HOTMART_HOTTOK|sb_secret_/i.test(publicFiles), false);
});

test("migrations V120 criam acesso permanente e vínculo sem e-mail", () => {
  const base = read("supabase/migrations/20260721_freemium_subscription_model.sql");
  const sql = read("supabase/migrations/20260722_one_time_access_model.sql");
  const claim = read("supabase/migrations/20260723_no_email_purchase_link.sql");
  assert.ok(base.includes("grant update (name) on table public.profiles to authenticated"));
  assert.ok(sql.includes("access_type in ('free', 'one_time', 'legacy_lifetime', 'legacy_subscription')"));
  assert.ok(sql.includes("create or replace function public.recompute_one_time_access"));
  assert.ok(sql.includes("grant execute on function public.recompute_one_time_access(uuid, text) to service_role"));
  assert.ok(sql.includes("case purchases.plan when 'pro' then 2 when 'plus' then 1"));
  assert.ok(sql.includes("where access_type = 'legacy_subscription'"));
  assert.ok(claim.includes("create or replace function public.claim_current_user_purchases"));
  assert.ok(claim.includes("lower(purchases.email) = current_email"));
  assert.ok(claim.includes("purchases.user_id is null or purchases.user_id = current_user_id"));
  assert.ok(claim.includes("profiles.created_at <= purchases.purchase_date"));
  assert.ok(claim.includes("grant execute on function public.claim_current_user_purchases() to authenticated"));
});

test("app-content prioriza permanent_plan e mantém Plus separado de Pro", () => {
  const appContent = read("supabase/functions/app-content/index.ts");
  assert.ok(appContent.includes('profile.access_type === "one_time"'));
  assert.ok(appContent.includes("profile.permanent_plan || profile.plan"));
  assert.ok(appContent.includes('version: "120"'));
});

test("webhook trata compra única sem convite, e-mail ou Resend", () => {
  const webhook = read("supabase/functions/hotmart-webhook/index.ts");
  for (const event of [
    "PURCHASE_APPROVED", "PURCHASE_DELAYED", "PURCHASE_CANCELED",
    "PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_EXPIRED"
  ]) assert.ok(webhook.includes(event), `evento ausente: ${event}`);
  assert.equal(/SUBSCRIPTION_CANCELLATION|SWITCH_PLAN|UPDATE_SUBSCRIPTION_CHARGE_DATE/.test(webhook), false);
  assert.equal(/RESEND_API_KEY|EMAIL_FROM|resend\.com|inviteUserByEmail|APP_INVITE_URL/i.test(webhook), false);
  assert.ok(webhook.includes("recompute_one_time_access"));
  assert.ok(webhook.includes("pending_account_link"));
  assert.equal(webhook.includes("approved_purchase_without_user"), false);
  assert.ok(webhook.includes('["hotmart", eventType, transactionId].join(":")'));
  assert.ok(webhook.includes("existingIsApproved"));
});

test("frontend reivindica compras aprovadas antes de carregar o perfil", () => {
  const auth = read("assets/js/auth.js");
  assert.ok(auth.includes('client.rpc("claim_current_user_purchases")'));
  assert.ok(auth.includes("await claimApprovedPurchases(session)"));
  assert.ok(auth.includes("await claimApprovedPurchases(state.session)"));
});

test("interface pública não anuncia preços mensais antigos", () => {
  const ui = ["index.html", "assets/js/config/plans.js", "assets/js/ui/paywall.js", "assets/js/app.js"].map(read).join("\n");
  assert.equal(/R\$\s*15|R\$\s*20|\/mês|por mês/i.test(ui), false);
  assert.match(ui, /R\$\s*30/);
  assert.match(ui, /R\$\s*40/);
});

test("manifesto e configuração Vercel são JSON válidos", () => {
  const manifest = json("manifest.json");
  const vercel = json("vercel.json");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons.length >= 2, true);
  assert.equal(Array.isArray(vercel.rewrites), true);
});

const failed = checks.filter((item) => !item.ok);
checks.forEach((item) => console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.name}`));
if (failed.length) {
  failed.forEach((item) => console.error(item.error));
  process.exitCode = 1;
} else {
  console.log(`\n${checks.length} verificações automatizadas concluídas com sucesso.`);
}
