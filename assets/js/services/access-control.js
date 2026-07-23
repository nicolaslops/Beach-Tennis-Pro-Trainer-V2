(function () {
  "use strict";

  const FEATURE_REQUIREMENTS = Object.freeze({
    dashboard: "free",
    exercises: "free",
    favorites: "free",
    workoutBuilder: "free",
    settings: "free",
    evolution: "plus",
    lessonPlans: "pro"
  });

  function currentPlan() {
    return window.BTPT_SUBSCRIPTION && window.BTPT_SUBSCRIPTION.getState().effectivePlan || "free";
  }

  function rank(plan) {
    return window.BTPT_PLAN_CONFIG.PLAN_RANK[String(plan || "free").toLowerCase()] ?? 0;
  }

  function hasPlan(requiredPlan) {
    return rank(currentPlan()) >= rank(requiredPlan);
  }

  function canAccessFeature(feature) {
    return hasPlan(FEATURE_REQUIREMENTS[feature] || "free");
  }

  function canAccessExercise(exerciseId) {
    return hasPlan("plus") || window.BTPT_FREE_EXERCISES.has(exerciseId);
  }

  function requiredPlanForFeature(feature) {
    return FEATURE_REQUIREMENTS[feature] || "free";
  }

  function requiredPlanForExercise(exerciseId) {
    return canAccessExercise(exerciseId) ? "free" : "plus";
  }

  function guardFeature(feature, options = {}) {
    if (canAccessFeature(feature)) return true;
    if (!options.silent && window.BTPT_PAYWALL) {
      window.BTPT_PAYWALL.show({ feature, requiredPlan: requiredPlanForFeature(feature) });
    }
    return false;
  }

  function guardExercise(exerciseId, options = {}) {
    if (canAccessExercise(exerciseId)) return true;
    if (!options.silent && window.BTPT_PAYWALL) {
      window.BTPT_PAYWALL.show({ feature: "exercise", requiredPlan: "plus" });
    }
    return false;
  }

  window.BTPT_ACCESS = Object.freeze({
    FEATURE_REQUIREMENTS,
    currentPlan,
    hasPlan,
    canAccessFeature,
    canAccessExercise,
    requiredPlanForFeature,
    requiredPlanForExercise,
    guardFeature,
    guardExercise
  });
})();
