(function () {
  "use strict";

  const PLANS = Object.freeze({
    free: Object.freeze({
      id: "free",
      name: "Grátis",
      price: 0,
      priceLabel: "R$ 0",
      billingPeriod: "free",
      exerciseAccess: "limited",
      evolution: false,
      lessonPlans: false,
      workoutBuilder: true,
      benefits: Object.freeze([
        "25 exercícios nos três níveis",
        "Montador e treinos salvos",
        "Favoritos, áudio e temas",
        "Grátis para sempre"
      ])
    }),
    plus: Object.freeze({
      id: "plus",
      name: "Plus",
      price: 30,
      priceLabel: "R$ 30",
      billingPeriod: "one_time",
      exerciseAccess: "all",
      evolution: true,
      lessonPlans: false,
      workoutBuilder: true,
      benefits: Object.freeze([
        "Todos os exercícios e níveis",
        "Evolução completa",
        "Tudo do plano Grátis",
        "Pagamento único e acesso permanente"
      ])
    }),
    pro: Object.freeze({
      id: "pro",
      name: "Pro",
      price: 40,
      priceLabel: "R$ 40",
      billingPeriod: "one_time",
      exerciseAccess: "all",
      evolution: true,
      lessonPlans: true,
      workoutBuilder: true,
      benefits: Object.freeze([
        "Todos os planos de aula",
        "Acesso completo ao aplicativo",
        "Tudo do plano Plus",
        "Pagamento único e acesso permanente"
      ])
    })
  });

  const PLAN_RANK = Object.freeze({ free: 0, plus: 1, pro: 2 });

  function publicEnv() {
    return window.BTPT_ENV || {};
  }

  function checkoutUrls() {
    const env = publicEnv();
    return {
      plus: String(env.VITE_HOTMART_PLUS_CHECKOUT_URL || "URL_CHECKOUT_PLUS").trim(),
      pro: String(env.VITE_HOTMART_PRO_CHECKOUT_URL || "URL_CHECKOUT_PRO").trim()
    };
  }

  function isConfiguredUrl(value) {
    return /^https:\/\//i.test(String(value || "")) && !String(value).includes("URL_CHECKOUT_");
  }

  window.BTPT_PLAN_CONFIG = Object.freeze({
    PLANS,
    PLAN_RANK,
    checkoutUrls,
    isConfiguredUrl
  });
})();
