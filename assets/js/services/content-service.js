(function () {
  "use strict";

  function emptyContent() {
    return { exercicios: [], planos_aula: [], planos_evolucao: [] };
  }

  function normalizeContent(value) {
    const content = value && typeof value === "object" ? value : {};
    return {
      exercicios: Array.isArray(content.exercicios) ? content.exercicios : [],
      planos_aula: Array.isArray(content.planos_aula) ? content.planos_aula : [],
      planos_evolucao: Array.isArray(content.planos_evolucao) ? content.planos_evolucao : []
    };
  }

  function restrictToCurrentPlan(value) {
    const content = normalizeContent(value);
    const plan = window.BTPT_ACCESS?.currentPlan() || "free";
    if (plan === "pro") return content;
    if (plan === "plus") {
      return {
        exercicios: content.exercicios,
        planos_aula: [],
        planos_evolucao: content.planos_evolucao
      };
    }
    return {
      exercicios: content.exercicios.filter((exercise) => window.BTPT_FREE_EXERCISES.has(exercise.id)),
      planos_aula: [],
      planos_evolucao: []
    };
  }

  async function load(client) {
    if (!client) return { ok: false, data: emptyContent(), reason: "client_unavailable" };
    try {
      const { data, error } = await client.functions.invoke("app-content", { body: {} });
      if (error) throw error;
      if (!data?.ok || !data.content) throw new Error(data?.error || "invalid_content_response");
      return {
        ok: true,
        data: restrictToCurrentPlan(data.content),
        plan: data.plan || "free",
        version: data.version || "",
        source: "network"
      };
    } catch (error) {
      return {
        ok: false,
        data: emptyContent(),
        reason: error?.message || "content_unavailable",
        source: "network"
      };
    }
  }

  window.BTPT_CONTENT = Object.freeze({ load, restrictToCurrentPlan, normalizeContent });
})();
