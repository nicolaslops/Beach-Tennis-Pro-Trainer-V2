(() => {
  const ACCESS_CHOICE_KEY = "btpt_access_choice";
  const USE_HASH_ROUTING = window.location.protocol === "file:";
  const ROUTES = {
    access: "/acesso",
    login: "/login",
    forgot: "/esqueci-senha",
    reset: "/redefinir-senha",
    firstAccess: "/primeiro-acesso",
    app: "/"
  };
  const AUTH_ROUTES = new Set(Object.values(ROUTES).filter((route) => route !== ROUTES.app));
  const ACTIVE_PURCHASE_STATUSES = new Set([
    "approved"
  ]);

  const state = {
    client: null,
    session: null,
    accessRecord: null,
    flash: null,
    firstAccessPasswordChanged: false,
    initialized: false,
    validating: false
  };

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizePath(path) {
    if (!path || path === "/index.html") return "/";
    const cleaned = path.replace(/\/+$/, "") || "/";
    return cleaned.endsWith("/index.html") ? "/" : cleaned;
  }

  function currentRoute() {
    if (USE_HASH_ROUTING) {
      const hashRoute = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      return normalizePath(hashRoute || ROUTES.app);
    }
    return normalizePath(window.location.pathname);
  }

  function routeTarget(route) {
    const targetRoute = normalizePath(route);
    return USE_HASH_ROUTING ? `#${targetRoute}` : targetRoute;
  }

  function replaceRouteSilently(route) {
    window.history.replaceState({}, "", routeTarget(route));
  }

  function navigate(route, options = {}) {
    const targetRoute = normalizePath(route);
    if (options.message) {
      state.flash = {
        route: targetRoute,
        message: options.message,
        type: options.type || "info"
      };
    }
    if (options.replace) {
      window.history.replaceState({}, "", routeTarget(targetRoute));
    } else {
      window.history.pushState({}, "", routeTarget(targetRoute));
    }
    renderCurrentRoute();
  }

  function consumeFlash(route) {
    if (!state.flash || state.flash.route !== route) return null;
    const flash = state.flash;
    state.flash = null;
    return flash;
  }

  function getAuthRoot() {
    let root = document.getElementById("pwaWelcome");
    if (!root) {
      root = document.createElement("section");
      root.id = "pwaWelcome";
      document.body.prepend(root);
    }
    root.classList.add("pwa-welcome", "auth-shell");
    root.removeAttribute("hidden");
    root.classList.remove("is-hidden");
    root.setAttribute("aria-labelledby", "authTitle");
    return root;
  }

  function lockApp() {
    document.body.classList.add("auth-locked");
    document.body.classList.remove("auth-ready");
    const root = getAuthRoot();
    root.hidden = false;
    root.classList.remove("is-hidden");
  }

  function unlockApp() {
    const root = getAuthRoot();
    root.classList.add("is-hidden");
    root.hidden = true;
    document.body.classList.remove("auth-locked", "auth-pending");
    document.body.classList.add("auth-ready");
    injectAccountActions();
  }

  function readEnv() {
    const env = window.BTPT_ENV || {};
    return {
      url: String(env.VITE_SUPABASE_URL || "").trim(),
      key: String(env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim()
    };
  }

  function getSupabaseClient() {
    if (state.client) return state.client;
    const { url, key } = readEnv();
    if (!url || !key || !window.supabase?.createClient) return null;
    state.client = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    });
    return state.client;
  }

  function configMessage() {
    const { url, key } = readEnv();
    if (!url || !key) {
      return "Configure o Supabase em assets/js/env.js antes de liberar o acesso.";
    }
    if (!window.supabase?.createClient) {
      return "A biblioteca do Supabase não carregou. Verifique a conexão ou publique com acesso ao CDN.";
    }
    return "";
  }

  function installButtonText() {
    const pwa = window.BTPT_PWA;
    if (pwa?.isStandalone) return "Abrir aplicativo";
    if (pwa?.isIOS) return "📱 COMO BAIXAR NO IPHONE";
    if (pwa?.canInstall || (pwa?.isAndroid && pwa?.isChromeLike)) return "📥 BAIXAR APLICATIVO";
    return "Usar como aplicativo";
  }

  function messageHTML(message, type = "info") {
    if (!message) return "";
    return `<div class="auth-message is-${escapeHTML(type)}" role="status">${escapeHTML(message)}</div>`;
  }

  function renderAuth(html) {
    const root = getAuthRoot();
    root.innerHTML = html;
  }

  function renderLoading(message = "Verificando acesso...") {
    renderAuth(`
      <div class="pwa-welcome-card auth-card auth-card-compact">
        <img class="pwa-welcome-logo" src="assets/images/logo-beach-tennis-192.png" alt="">
        <span class="eyebrow">Beach Tennis Pro Trainer</span>
        <h1 id="authTitle">Preparando seu app</h1>
        <p>${escapeHTML(message)}</p>
        <div class="auth-loading" aria-hidden="true"><span></span><span></span><span></span></div>
      </div>
    `);
  }

  function renderAccess(options = {}) {
    const setupWarning = configMessage();
    renderAuth(`
      <div class="pwa-welcome-card auth-card">
        <img class="pwa-welcome-logo" src="assets/images/logo-beach-tennis-192.png" alt="">
        <span class="eyebrow">Acesso do aluno</span>
        <h1 id="authTitle">Escolha como deseja acessar</h1>
        <p>Instale como aplicativo ou continue no navegador. Depois, entre com o e-mail liberado pela sua compra.</p>
        ${messageHTML(options.message || setupWarning, options.type || (setupWarning ? "warning" : "info"))}
        <div class="pwa-welcome-actions auth-actions">
          <button class="pwa-install-button is-visible" id="pwaInstallButton" type="button" data-auth-action="choose-app">${installButtonText()}</button>
          <button class="pwa-web-button" id="pwaContinueButton" type="button" data-auth-action="choose-web">Continuar no navegador</button>
        </div>
        <button class="auth-link-button" type="button" data-auth-nav="${ROUTES.login}">Já tenho acesso e quero entrar</button>
      </div>
    `);
  }

  function renderLogin(options = {}) {
    const setupWarning = configMessage();
    const disabled = setupWarning ? "disabled" : "";
    renderAuth(`
      <div class="pwa-welcome-card auth-card">
        <img class="pwa-welcome-logo" src="assets/images/logo-beach-tennis-192.png" alt="">
        <span class="eyebrow">Área exclusiva</span>
        <h1 id="authTitle">Entrar no app</h1>
        <p>Use o e-mail da compra e a senha enviada para acessar seus treinos.</p>
        ${messageHTML(options.message || setupWarning, options.type || (setupWarning ? "warning" : "info"))}
        <form class="auth-form" data-auth-form="login">
          <label>
            <span>E-mail</span>
            <input name="email" type="email" autocomplete="email" required ${disabled}>
          </label>
          <label>
            <span>Senha</span>
            <input name="password" type="password" autocomplete="current-password" required ${disabled}>
          </label>
          <button class="button primary auth-submit" type="submit" ${disabled}>Entrar</button>
        </form>
        <div class="auth-secondary-actions">
          <button class="auth-link-button" type="button" data-auth-nav="${ROUTES.forgot}">Esqueci minha senha</button>
          <button class="auth-link-button" type="button" data-auth-nav="${ROUTES.access}">Voltar para acesso</button>
        </div>
      </div>
    `);
  }

  function renderForgot(options = {}) {
    const setupWarning = configMessage();
    const disabled = setupWarning ? "disabled" : "";
    renderAuth(`
      <div class="pwa-welcome-card auth-card">
        <img class="pwa-welcome-logo" src="assets/images/logo-beach-tennis-192.png" alt="">
        <span class="eyebrow">Recuperação de acesso</span>
        <h1 id="authTitle">Redefinir senha</h1>
        <p>Informe seu e-mail. Se ele estiver cadastrado, você receberá um link seguro para criar uma nova senha.</p>
        ${messageHTML(options.message || setupWarning, options.type || (setupWarning ? "warning" : "info"))}
        <form class="auth-form" data-auth-form="forgot">
          <label>
            <span>E-mail da compra</span>
            <input name="email" type="email" autocomplete="email" required ${disabled}>
          </label>
          <button class="button primary auth-submit" type="submit" ${disabled}>Enviar link</button>
        </form>
        <button class="auth-link-button" type="button" data-auth-nav="${ROUTES.login}">Voltar para login</button>
      </div>
    `);
  }

  function passwordFields() {
    return `
      <label class="auth-password-field">
        <span>Nova senha</span>
        <div class="auth-password-control">
          <input name="password" type="password" autocomplete="new-password" minlength="8" required>
          <button class="auth-password-toggle" type="button" data-auth-action="toggle-password" aria-label="Mostrar senha">Mostrar</button>
        </div>
      </label>
      <label class="auth-password-field">
        <span>Confirmar nova senha</span>
        <div class="auth-password-control">
          <input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required>
          <button class="auth-password-toggle" type="button" data-auth-action="toggle-password" aria-label="Mostrar senha">Mostrar</button>
        </div>
      </label>
    `;
  }

  function renderReset(options = {}) {
    const hasSession = Boolean(state.session);
    renderAuth(`
      <div class="pwa-welcome-card auth-card">
        <img class="pwa-welcome-logo" src="assets/images/logo-beach-tennis-192.png" alt="">
        <span class="eyebrow">Nova senha</span>
        <h1 id="authTitle">Crie uma senha segura</h1>
        <p>${hasSession ? "Digite uma senha nova para continuar." : "Abra esta tela pelo link recebido no seu e-mail."}</p>
        ${messageHTML(options.message || (!hasSession ? "Este link de redefinição não é mais válido. Solicite um novo link." : ""), options.type || (!hasSession ? "warning" : "info"))}
        ${hasSession ? `
          <form class="auth-form" data-auth-form="reset">
            ${passwordFields()}
            <button class="button primary auth-submit" type="submit">Salvar nova senha</button>
          </form>
        ` : ""}
        <button class="auth-link-button" type="button" data-auth-nav="${ROUTES.login}">Voltar para login</button>
      </div>
    `);
  }

  function renderFirstAccess(options = {}) {
    const passwordAlreadyChanged = Boolean(options.passwordUpdated || state.firstAccessPasswordChanged);
    renderAuth(`
      <div class="pwa-welcome-card auth-card">
        <img class="pwa-welcome-logo" src="assets/images/logo-beach-tennis-192.png" alt="">
        <span class="eyebrow">Primeiro acesso</span>
        <h1 id="authTitle">${passwordAlreadyChanged ? "Concluir liberação" : "Troque sua senha temporária"}</h1>
        <p>${passwordAlreadyChanged ? "Sua senha já foi alterada. Agora finalize a liberação segura do app." : "Para liberar o app, crie uma senha própria. O acesso só abre depois que o Supabase confirmar essa troca."}</p>
        ${messageHTML(options.message, options.type)}
        ${passwordAlreadyChanged ? `
          <form class="auth-form" data-auth-form="first-access-complete">
            <button class="button primary auth-submit" type="submit">Concluir liberação</button>
          </form>
        ` : `
          <form class="auth-form" data-auth-form="first-access">
            ${passwordFields()}
            <button class="button primary auth-submit" type="submit">Salvar e liberar app</button>
          </form>
        `}
        <button class="auth-link-button" type="button" data-auth-action="logout">Sair desta conta</button>
      </div>
    `);
  }

  function preferredSignedOutRoute() {
    return window.localStorage.getItem(ACCESS_CHOICE_KEY) ? ROUTES.login : ROUTES.access;
  }

  function renderCurrentRoute() {
    const route = currentRoute();
    const flash = consumeFlash(route);
    if (route === ROUTES.firstAccess && !state.session) {
      lockApp();
      navigate(ROUTES.login, {
        replace: true,
        message: "Entre na sua conta antes de trocar a senha temporária.",
        type: "warning"
      });
      return;
    }

    if (
      state.session &&
      state.accessRecord &&
      isAccessActive(state.accessRecord) &&
      mustChangePassword(state.accessRecord)
    ) {
      if (route !== ROUTES.firstAccess) {
        lockApp();
        navigate(ROUTES.firstAccess, { replace: true });
        return;
      }
      lockApp();
      return renderFirstAccess(flash || {});
    }

    if (
      state.session &&
      state.accessRecord &&
      isAccessActive(state.accessRecord) &&
      !mustChangePassword(state.accessRecord) &&
      route !== ROUTES.reset &&
      route !== ROUTES.firstAccess
    ) {
      if (AUTH_ROUTES.has(route)) replaceRouteSilently(ROUTES.app);
      unlockApp();
      return;
    }

    lockApp();

    if (route === ROUTES.access) return renderAccess(flash || {});
    if (route === ROUTES.login) return renderLogin(flash || {});
    if (route === ROUTES.forgot) return renderForgot(flash || {});
    if (route === ROUTES.reset) return renderReset(flash || {});
    if (route === ROUTES.firstAccess) return renderFirstAccess(flash || {});

    navigate(preferredSignedOutRoute(), { replace: true });
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePasswords(form) {
    const password = String(form.elements.password?.value || "");
    const confirmPassword = String(form.elements.confirmPassword?.value || "");
    if (password.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
    if (password !== confirmPassword) return "As senhas não conferem.";
    return "";
  }

  function setFormBusy(form, busy) {
    form.querySelectorAll("input, button").forEach((element) => {
      element.disabled = busy;
    });
    const submit = form.querySelector(".auth-submit");
    if (submit) {
      submit.dataset.originalText ||= submit.textContent;
      submit.textContent = busy ? "Aguarde..." : submit.dataset.originalText;
    }
  }

  async function fetchPurchase(session) {
    const client = getSupabaseClient();
    const user = session?.user;
    if (!client || !user) return null;
    const selectFields = "id,user_id,email,access_active,purchase_status,must_change_password";
    const attempts = [
      { column: "user_id", value: user.id },
      { column: "email", value: user.email }
    ].filter((attempt) => attempt.value);

    let lastError = null;
    for (const attempt of attempts) {
      const { data, error } = await client
        .from("hotmart_purchases")
        .select(selectFields)
        .eq(attempt.column, attempt.value)
        .maybeSingle();
      if (data) return data;
      if (error) lastError = error;
    }
    if (lastError) throw lastError;
    return null;
  }

  function isAccessActive(record) {
    if (!record) return false;
    const status = String(record.purchase_status || "").trim().toLowerCase();
    return record.access_active === true && ACTIVE_PURCHASE_STATUSES.has(status);
  }

  function mustChangePassword(record) {
    return record?.must_change_password === true || String(record?.must_change_password).toLowerCase() === "true";
  }

  async function validateAccess(session) {
    if (state.validating) return;
    state.validating = true;
    state.session = session;
    renderLoading("Validando sua compra...");

    try {
      const record = await fetchPurchase(session);
      state.accessRecord = record;

      if (!isAccessActive(record)) {
        state.firstAccessPasswordChanged = false;
        await getSupabaseClient()?.auth.signOut();
        lockApp();
        navigate(ROUTES.login, {
          replace: true,
          message: "Seu acesso não está ativo. Confirme a compra ou fale com o suporte.",
          type: "warning"
        });
        return;
      }

      if (mustChangePassword(record)) {
        lockApp();
        navigate(ROUTES.firstAccess, { replace: true });
        return;
      }

      state.firstAccessPasswordChanged = false;
      unlockApp();
      if (AUTH_ROUTES.has(currentRoute())) {
        replaceRouteSilently(ROUTES.app);
      }
    } catch (error) {
      await getSupabaseClient()?.auth.signOut();
      lockApp();
      navigate(ROUTES.login, {
        replace: true,
        message: "Não foi possível entrar. Tente novamente.",
        type: "warning"
      });
    } finally {
      state.validating = false;
      document.body.classList.remove("auth-pending");
    }
  }

  async function handleChooseApp() {
    window.localStorage.setItem(ACCESS_CHOICE_KEY, "app");
    const pwa = window.BTPT_PWA;
    if (pwa?.requestInstall) {
      await pwa.requestInstall();
    }
    navigate(ROUTES.login, { replace: false });
  }

  function handleChooseWeb() {
    window.localStorage.setItem(ACCESS_CHOICE_KEY, "web");
    navigate(ROUTES.login, { replace: false });
  }

  async function handleLogin(form) {
    const client = getSupabaseClient();
    if (!client) {
      renderLogin({ message: configMessage(), type: "warning" });
      return;
    }
    const email = String(form.elements.email?.value || "").trim().toLowerCase();
    const password = String(form.elements.password?.value || "");
    if (!validateEmail(email)) {
      renderLogin({ message: "Digite um e-mail válido.", type: "warning" });
      return;
    }
    setFormBusy(form, true);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    setFormBusy(form, false);
    if (error) {
      renderLogin({ message: "E-mail ou senha incorretos.", type: "warning" });
      return;
    }
    if (data.session) await validateAccess(data.session);
  }

  function resetRedirectUrl() {
    if (USE_HASH_ROUTING) {
      return `${window.location.href.split("#")[0]}#${ROUTES.reset}`;
    }
    return `${window.location.origin}${ROUTES.reset}`;
  }

  async function handleForgot(form) {
    const client = getSupabaseClient();
    if (!client) {
      renderForgot({ message: configMessage(), type: "warning" });
      return;
    }
    const email = String(form.elements.email?.value || "").trim().toLowerCase();
    if (!validateEmail(email)) {
      renderForgot({ message: "Digite um e-mail válido.", type: "warning" });
      return;
    }
    setFormBusy(form, true);
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: resetRedirectUrl()
    });
    setFormBusy(form, false);
    if (error) {
      renderForgot({ message: "Não foi possível enviar o link agora. Tente novamente.", type: "warning" });
      return;
    }
    renderForgot({
      message: "Caso exista uma conta vinculada a este e-mail, você receberá as instruções para redefinir sua senha.",
      type: "success"
    });
  }

  async function handleResetPassword(form) {
    const client = getSupabaseClient();
    const passwordError = validatePasswords(form);
    if (passwordError) {
      renderReset({ message: passwordError, type: "warning" });
      return;
    }
    setFormBusy(form, true);
    const { error } = await client.auth.updateUser({
      password: String(form.elements.password?.value || "")
    });
    setFormBusy(form, false);
    if (error) {
      renderReset({ message: "Não foi possível salvar a nova senha. Solicite outro link.", type: "warning" });
      return;
    }
    await client.auth.signOut();
    lockApp();
    navigate(ROUTES.login, {
      replace: true,
      message: "Senha alterada. Entre novamente para acessar o app.",
      type: "success"
    });
  }

  async function handleFirstAccess(form) {
    const client = getSupabaseClient();
    const passwordError = validatePasswords(form);
    if (passwordError) {
      renderFirstAccess({ message: passwordError, type: "warning" });
      return;
    }
    setFormBusy(form, true);
    const { error: passwordErrorResponse } = await client.auth.updateUser({
      password: String(form.elements.password?.value || "")
    });
    if (passwordErrorResponse) {
      setFormBusy(form, false);
      renderFirstAccess({ message: "Não foi possível alterar a senha. Tente novamente.", type: "warning" });
      return;
    }

    const { data: completed, error: rpcError } = await client.rpc("complete_first_access");
    setFormBusy(form, false);
    if (rpcError || completed !== true) {
      state.firstAccessPasswordChanged = true;
      renderFirstAccess({
        message: "Senha alterada, mas não foi possível confirmar a liberação do acesso. Tente concluir novamente.",
        type: "warning"
      });
      return;
    }

    state.firstAccessPasswordChanged = false;
    const { data } = await client.auth.getSession();
    if (data.session) {
      await validateAccess(data.session);
    }
  }

  async function handleFirstAccessCompletion(form) {
    const client = getSupabaseClient();
    if (!client) {
      renderFirstAccess({ message: configMessage(), type: "warning", passwordUpdated: true });
      return;
    }
    setFormBusy(form, true);
    const { data: completed, error: rpcError } = await client.rpc("complete_first_access");
    setFormBusy(form, false);
    if (rpcError || completed !== true) {
      state.firstAccessPasswordChanged = true;
      renderFirstAccess({
        message: "Ainda não foi possível confirmar a liberação do acesso. Tente novamente em instantes.",
        type: "warning",
        passwordUpdated: true
      });
      return;
    }
    state.firstAccessPasswordChanged = false;
    const { data } = await client.auth.getSession();
    if (data.session) await validateAccess(data.session);
  }

  async function logout(options = {}) {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
    state.session = null;
    state.accessRecord = null;
    state.firstAccessPasswordChanged = false;
    lockApp();
    navigate(options.route || preferredSignedOutRoute(), {
      replace: true,
      message: options.message || "Você saiu da conta.",
      type: options.type || "success"
    });
  }

  function injectAccountActions() {
    const settingsPanel = document.querySelector("#settings-view .settings-panel");
    if (!settingsPanel || settingsPanel.querySelector(".auth-account-actions")) return;
    const actions = document.createElement("div");
    actions.className = "inline-actions auth-account-actions";
    actions.innerHTML = `
      <button class="button ghost danger" type="button" data-auth-action="logout">Sair da conta</button>
    `;
    settingsPanel.appendChild(actions);
  }

  document.addEventListener("click", (event) => {
    const navButton = event.target.closest("[data-auth-nav]");
    if (navButton) {
      event.preventDefault();
      event.stopPropagation();
      navigate(navButton.dataset.authNav);
      return;
    }

    const actionButton = event.target.closest("[data-auth-action]");
    if (!actionButton) return;
    event.preventDefault();
    event.stopPropagation();
    const action = actionButton.dataset.authAction;
    if (action === "choose-app") handleChooseApp();
    if (action === "choose-web") handleChooseWeb();
    if (action === "logout") logout();
    if (action === "toggle-password") {
      const control = actionButton.closest(".auth-password-control");
      const input = control?.querySelector("input");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      actionButton.textContent = show ? "Ocultar" : "Mostrar";
      actionButton.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
    }
  }, true);

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-auth-form]");
    if (!form) return;
    event.preventDefault();
    event.stopPropagation();
    const formName = form.dataset.authForm;
    if (formName === "login") handleLogin(form);
    if (formName === "forgot") handleForgot(form);
    if (formName === "reset") handleResetPassword(form);
    if (formName === "first-access") handleFirstAccess(form);
    if (formName === "first-access-complete") handleFirstAccessCompletion(form);
  }, true);

  window.addEventListener("popstate", renderCurrentRoute);
  window.addEventListener("hashchange", () => {
    if (USE_HASH_ROUTING) renderCurrentRoute();
  });
  window.addEventListener("btpt:pwa-state", () => {
    if (currentRoute() === ROUTES.access) renderAccess();
  });
  window.addEventListener("storage", (event) => {
    if (event.key && event.key.includes("supabase")) {
      getSupabaseClient()?.auth.getSession().then(({ data }) => {
        if (data.session) validateAccess(data.session);
        else logout({ route: preferredSignedOutRoute(), message: "Sessão encerrada em outra aba.", type: "info" });
      });
    }
  });

  async function init() {
    lockApp();
    const client = getSupabaseClient();
    if (!client) {
      document.body.classList.remove("auth-pending");
      if (!AUTH_ROUTES.has(currentRoute())) {
        navigate(preferredSignedOutRoute(), { replace: true });
      } else {
        renderCurrentRoute();
      }
      return;
    }

    client.auth.onAuthStateChange((event, session) => {
      state.session = session;
      if (event === "PASSWORD_RECOVERY") {
        navigate(ROUTES.reset, { replace: true });
        return;
      }
      if (event === "SIGNED_OUT") {
        state.session = null;
        state.accessRecord = null;
        document.body.classList.remove("auth-pending");
        if (!AUTH_ROUTES.has(currentRoute())) renderCurrentRoute();
        return;
      }
      if (
        session &&
        ["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event) &&
        currentRoute() !== ROUTES.reset &&
        currentRoute() !== ROUTES.firstAccess
      ) {
        validateAccess(session);
      }
    });

    const { data } = await client.auth.getSession();
    state.session = data.session;
    if (data.session) {
      if (currentRoute() === ROUTES.reset) {
        document.body.classList.remove("auth-pending");
        renderReset();
      } else {
        await validateAccess(data.session);
      }
    } else {
      document.body.classList.remove("auth-pending");
      renderCurrentRoute();
    }
  }

  window.BTPT_AUTH = {
    logout,
    validateAccess,
    get session() {
      return state.session;
    },
    get accessRecord() {
      return state.accessRecord;
    }
  };

  window.addEventListener("DOMContentLoaded", init);
})();
