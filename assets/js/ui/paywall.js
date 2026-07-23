(function () {
  "use strict";

  function escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function content(feature) {
    const current = window.BTPT_ACCESS.currentPlan();
    const plans = window.BTPT_PLAN_CONFIG.PLANS;
    if (feature === "lessonPlans") {
      return current === "plus"
        ? {
          eyebrow: "Exclusivo Pro",
          title: "Planos de Aula completos",
          text: "Os Planos de Aula são exclusivos do Pro. Faça o upgrade para manter acesso permanente, sem mensalidade.",
          plan: "pro"
        }
        : {
          eyebrow: "Conteúdo Pro",
          title: "Aulas prontas para aplicar",
          text: `Compre o Pro por ${plans.pro.priceLabel}, em pagamento único, para acessar os Planos de Aula e todo o aplicativo.`,
          plan: "pro"
        };
    }
    if (feature === "evolution") {
      return {
        eyebrow: "Disponível no Plus e Pro",
        title: "Evolução guiada por semanas",
        text: "Acompanhe os planos de 4, 8 e 12 semanas, conclua exercícios e veja seu progresso real.",
        plan: "plus"
      };
    }
    return {
      eyebrow: "Exercício premium",
      title: "Libere todo o banco de exercícios",
      text: `Este exercício está disponível no Plus e no Pro. Libere a partir de ${plans.plus.priceLabel}, em pagamento único.`,
      plan: "plus"
    };
  }

  function markup(feature, inline) {
    const item = content(feature);
    return `
      <section class="paywall-card ${inline ? "is-inline" : ""}">
        <span class="paywall-lock" aria-hidden="true">&#128274;</span>
        <span class="eyebrow">${escapeHTML(item.eyebrow)}</span>
        <h2>${escapeHTML(item.title)}</h2>
        <p>${escapeHTML(item.text)}</p>
        <div class="paywall-actions">
          <button class="button primary" type="button" data-subscription-action="view-plans">Ver planos</button>
          ${inline ? "" : '<button class="button ghost" type="button" data-subscription-action="close-paywall">Agora não</button>'}
        </div>
      </section>
    `;
  }

  function show(options = {}) {
    const root = document.getElementById("modalRoot");
    if (!root) return;
    root.innerHTML = `<div class="modal paywall-modal" role="dialog" aria-modal="true" aria-label="Conteúdo do plano">${markup(options.feature || "exercise", false)}</div>`;
    root.hidden = false;
    document.body.classList.add("modal-open");
  }

  function close() {
    const root = document.getElementById("modalRoot");
    if (!root || root.hidden) return;
    root.hidden = true;
    root.innerHTML = "";
    document.body.classList.remove("modal-open");
  }

  function inline(feature) {
    return markup(feature, true);
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-subscription-action]");
    if (!button) return;
    const action = button.dataset.subscriptionAction;
    if (action === "close-paywall") close();
    if (action === "view-plans") {
      close();
      window.dispatchEvent(new CustomEvent("btpt:open-plans"));
    }
  });

  window.BTPT_PAYWALL = Object.freeze({ show, close, inline });
})();
