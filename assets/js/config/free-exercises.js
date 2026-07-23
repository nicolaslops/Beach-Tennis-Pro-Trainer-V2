(function () {
  "use strict";

  const FREE_EXERCISE_IDS = Object.freeze([
    "BT-V2-INI-001",
    "BT-V2-INI-003",
    "BT-V2-INI-006",
    "BT-V2-INI-008",
    "BT-V2-INI-010",
    "BT-V2-INI-014",
    "BT-V2-INI-018",
    "BT-V2-INI-022",
    "BT-V2-INI-024",
    "BT-V2-INT-002",
    "BT-V2-INT-004",
    "BT-V2-INT-006",
    "BT-V2-INT-010",
    "BT-V2-INT-012",
    "BT-V2-INT-016",
    "BT-V2-INT-022",
    "BT-V2-INT-028",
    "BT-V2-AVA-001",
    "BT-V2-AVA-006",
    "BT-V2-AVA-008",
    "BT-V2-AVA-012",
    "BT-V2-AVA-016",
    "BT-V2-AVA-020",
    "BT-V2-AVA-026",
    "BT-V2-AVA-036"
  ]);

  const freeSet = new Set(FREE_EXERCISE_IDS);

  window.BTPT_FREE_EXERCISES = Object.freeze({
    ids: FREE_EXERCISE_IDS,
    has(exerciseId) {
      return freeSet.has(String(exerciseId || ""));
    },
    validate(exercises) {
      const allIds = new Set((Array.isArray(exercises) ? exercises : []).map((item) => item.id));
      const missing = FREE_EXERCISE_IDS.filter((id) => !allIds.has(id));
      const uniqueCount = new Set(FREE_EXERCISE_IDS).size;
      return {
        valid: FREE_EXERCISE_IDS.length === 25 && uniqueCount === 25 && missing.length === 0,
        count: FREE_EXERCISE_IDS.length,
        uniqueCount,
        missing
      };
    }
  });
})();
