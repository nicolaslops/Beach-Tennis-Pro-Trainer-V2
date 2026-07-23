const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "tmp", "visual-smoke");
const baseUrl = process.env.BTPT_BASE_URL || "http://127.0.0.1:4182";
const source = JSON.parse(fs.readFileSync(path.join(root, "supabase/functions/app-content/content.json"), "utf8"));
const freeIds = [
  "BT-V2-INI-001", "BT-V2-INI-003", "BT-V2-INI-006", "BT-V2-INI-008", "BT-V2-INI-010",
  "BT-V2-INI-014", "BT-V2-INI-018", "BT-V2-INI-022", "BT-V2-INI-024",
  "BT-V2-INT-002", "BT-V2-INT-004", "BT-V2-INT-006", "BT-V2-INT-010", "BT-V2-INT-012",
  "BT-V2-INT-016", "BT-V2-INT-022", "BT-V2-INT-028",
  "BT-V2-AVA-001", "BT-V2-AVA-006", "BT-V2-AVA-008", "BT-V2-AVA-012", "BT-V2-AVA-016",
  "BT-V2-AVA-020", "BT-V2-AVA-026", "BT-V2-AVA-036"
];

function contentFor(plan) {
  if (plan === "pro") return source;
  if (plan === "plus") return { exercicios: source.exercicios, planos_aula: [], planos_evolucao: source.planos_evolucao };
  return { exercicios: source.exercicios.filter((item) => freeIds.includes(item.id)), planos_aula: [], planos_evolucao: [] };
}

function fakeSupabaseScript() {
  return `
    (() => {
      const profile = window.__TEST_PROFILE;
      const session = { access_token: "visual-token", user: { id: profile.id, email: profile.email, user_metadata: { name: profile.name } } };
      const resultFor = (table) => table === "profiles"
        ? { data: profile, error: null }
        : table === "hotmart_purchases" || table === "user_app_data"
          ? { data: null, error: null }
          : { data: null, error: null };
      const builder = (table) => {
        let result = resultFor(table);
        const api = {
          select() { return api; }, eq() { return api; }, ilike() { return api; }, order() { return api; }, limit() { return api; },
          update(values) { Object.assign(profile, values); result = { data: profile, error: null }; return api; },
          upsert() { result = { data: null, error: null }; return api; },
          maybeSingle: async () => result,
          single: async () => result,
          then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); }
        };
        return api;
      };
      const client = {
        auth: {
          getSession: async () => ({ data: { session } }),
          getUser: async () => ({ data: { user: session.user }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
          signOut: async () => ({ error: null }),
          signInWithPassword: async () => ({ data: { session }, error: null }),
          signUp: async () => ({ data: { session }, error: null }),
          updateUser: async () => ({ data: { user: session.user }, error: null }),
          resetPasswordForEmail: async () => ({ error: null })
        },
        from: builder,
        rpc: async (name) => ({ data: name === "ensure_current_profile" ? profile : true, error: null }),
        functions: { invoke: async () => ({ data: { ok: true, version: "120", plan: profile.plan, content: window.__TEST_CONTENT }, error: null }) }
      };
      window.supabase = { createClient: () => client };
    })();
  `;
}

async function runScenario(browser, { plan, viewport, theme, name, requestedPlan = "" }) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const id = `visual-user-${plan}-${name}`;
  await page.addInitScript(({ profile, content, storageKey, themeValue }) => {
    window.__TEST_PROFILE = profile;
    window.__TEST_CONTENT = content;
    window.localStorage.setItem(storageKey, themeValue);
  }, {
    profile: {
      id,
      name: "Atleta Visual",
      email: `${id}@example.com`,
      plan,
      subscription_status: plan === "free" ? "inactive" : "active",
      access_active: true,
      access_type: plan === "free" ? "free" : "one_time",
      permanent_plan: plan === "free" ? null : plan,
      purchased_at: plan === "free" ? null : new Date().toISOString(),
      lifetime_access: plan !== "free",
      legacy_review_required: false,
      subscription_current_period_end: null
    },
    content: contentFor(plan),
    storageKey: `btpt_user_${id}_btpt_theme`,
    themeValue: theme
  });
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript; charset=utf-8",
    body: fakeSupabaseScript()
  }));
  const query = requestedPlan ? `plan=${requestedPlan}` : `visual=${name}`;
  await page.goto(`${baseUrl}/?${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("body.auth-ready", { timeout: 15000 });
  await page.waitForSelector(requestedPlan ? "#plans-view.active" : "#dashboard-view.active", { timeout: 15000 });
  if (requestedPlan) {
    assert.equal(await page.evaluate(() => window.sessionStorage.getItem("btpt_requested_plan")), null);
    await page.evaluate(() => window.appController.ui.switchView("dashboard"));
    await page.waitForSelector("#dashboard-view.active");
  }
  await page.waitForTimeout(3400);

  assert.equal(await page.locator("#exerciseGrid .exercise-card").count(), plan === "free" ? 25 : 120);
  assert.equal(
    (await page.locator("[data-current-plan-name]").first().textContent()).trim(),
    plan === "free" ? "Grátis" : plan === "plus" ? "Plus permanente" : "Pro permanente"
  );

  await page.screenshot({ path: path.join(output, `${name}-dashboard.png`), fullPage: true });
  await page.evaluate(() => window.appController.ui.switchView("plans"));
  await page.waitForSelector("#plans-view.active");
  assert.equal(await page.locator("#pricingGrid .pricing-card").count(), 3);
  await page.screenshot({ path: path.join(output, `${name}-plans.png`), fullPage: true });

  if (plan === "free") {
    await page.evaluate(() => window.appController.ui.switchView("evolution"));
    await page.waitForSelector("#evolution-view.active .paywall-card");
    assert.ok((await page.locator("#evolution-view .paywall-card").innerText()).length > 40);
  }
  if (plan === "plus") {
    await page.evaluate(() => window.appController.ui.switchView("evolution"));
    await page.waitForSelector("#evolution-view.active .evolution-card");
    assert.equal(await page.locator("#evolutionGrid .evolution-card").count(), 3);
    await page.evaluate(() => window.appController.ui.switchView("lessons"));
    await page.waitForSelector("#lessons-view.active .paywall-card");
    assert.match(await page.locator("#lessons-view .paywall-card").innerText(), /Pro|permanente/i);
  }
  if (plan === "pro") {
    await page.evaluate(() => window.appController.ui.switchView("lessons"));
    await page.waitForSelector("#lessons-view.active");
    assert.equal(await page.locator("#lessonGrid .lesson-card").count(), 50);
    await page.screenshot({ path: path.join(output, `${name}-lessons.png`), fullPage: true });
  }

  assert.deepEqual(errors, []);
  await context.close();
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const executablePath = process.env.BTPT_BROWSER_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    await runScenario(browser, { plan: "free", viewport: { width: 390, height: 844 }, theme: "light", name: "mobile-free-light" });
    await runScenario(browser, { plan: "free", viewport: { width: 390, height: 844 }, theme: "light", name: "mobile-plan-entry", requestedPlan: "plus" });
    await runScenario(browser, { plan: "plus", viewport: { width: 414, height: 896 }, theme: "dark", name: "mobile-plus-dark" });
    await runScenario(browser, { plan: "pro", viewport: { width: 1440, height: 900 }, theme: "dark", name: "desktop-pro-dark" });
    console.log(`PASS visual smoke: ${output}`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
