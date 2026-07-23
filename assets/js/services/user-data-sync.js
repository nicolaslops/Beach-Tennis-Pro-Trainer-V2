(function () {
  "use strict";

  const SYNC_DELAY_MS = 1400;
  let client = null;
  let userId = "";
  let timer = null;
  let syncing = false;
  let applying = false;

  function prefix() {
    return userId ? `btpt_user_${userId}_` : "";
  }

  function snapshot() {
    if (!userId) return {};
    const result = {};
    const keyPrefix = prefix();
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(keyPrefix)) continue;
      result[key.slice(keyPrefix.length)] = window.localStorage.getItem(key);
    }
    return result;
  }

  function applySnapshot(payload) {
    if (!userId || !payload || typeof payload !== "object") return;
    applying = true;
    Object.entries(payload).forEach(([key, value]) => {
      if (typeof value === "string") window.localStorage.setItem(`${prefix()}${key}`, value);
    });
    applying = false;
  }

  async function upload() {
    if (!client || !userId || syncing || applying) return false;
    syncing = true;
    try {
      const { error } = await client.from("user_app_data").upsert({
        user_id: userId,
        payload: snapshot(),
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (error) throw error;
      return true;
    } catch (error) {
      console.warn("Não foi possível sincronizar os dados do app.");
      return false;
    } finally {
      syncing = false;
    }
  }

  function schedule() {
    if (!client || !userId || applying) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(upload, SYNC_DELAY_MS);
  }

  async function initialize(options) {
    client = options && options.client || null;
    userId = options && options.session && options.session.user && options.session.user.id || "";
    if (!client || !userId) return { ok: false, reason: "missing_context" };

    try {
      const { data, error } = await client
        .from("user_app_data")
        .select("payload,updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data && data.payload && Object.keys(data.payload).length) {
        applySnapshot(data.payload);
      } else {
        await upload();
      }
      return { ok: true };
    } catch (error) {
      console.warn("Dados locais mantidos; sincronização ficará pendente.");
      return { ok: false, reason: "sync_failed" };
    }
  }

  window.addEventListener("pagehide", () => {
    if (timer) {
      window.clearTimeout(timer);
      upload();
    }
  });

  window.BTPT_USER_DATA_SYNC = Object.freeze({
    initialize,
    schedule,
    upload,
    get userId() {
      return userId;
    }
  });
})();
