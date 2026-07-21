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
  const SESSION_CHECK_INTERVAL_MS = 15000;
  const SESSION_REPLACED_MESSAGE = "Sua conta foi acessada em outro dispositivo. Entre novamente para continuar.";

  const state = {
    client: null,
    session: null,
    accessRecord: null,
    flash: null,
    firstAccessPasswordChanged: false,
    initialized: false,
    validating: false,
    authMutationInProgress: false,
    sessionCheckInFlight: false,
    handlingReplacedSession: false,
    sessionMonitorTimer: null,
    sessionMonitorFocusHandler: null,
    sessionMonitorVisibilityHandler: null,
    logoutInProgress: false
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

  function isPrivateRoute(route = currentRoute()) {
    return ![ROUTES.access, ROUTES.login, ROUTES.forgot, ROUTES.reset].includes(normalizePath(route));
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
    if (pwa?.isIOS) return "Como baixar no iPhone";
    if (pwa?.canInstall || (pwa?.isAndroid && pwa?.isChromeLike)) return "Baixar aplicativo";
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
      <div class="pwa-welcome-card auth-card auth-access-card">
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
      <div class="pwa-welcome-card auth-card auth-login-card">
        <img class="pwa-welcome-logo" src="assets/images/logo-beach-tennis-192.png" alt="">
        <span class="eyebrow">Área exclusiva</span>
        <h1 id="authTitle">Entrar no App</h1>
        <p>Use o e-mail da compra e a senha que você criou para acessar seus treinos.</p>
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
    if (options.inviteExpired) {
      renderAuth(`
        <div class="pwa-welcome-card auth-card">
          <img class="pwa-welcome-logo" src="assets/images/logo-beach-tennis-192.png" alt="">
          <span class="eyebrow">Primeiro acesso</span>
          <h1 id="authTitle">Crie sua senha</h1>
          ${messageHTML(options.message || "Este link expirou ou já foi utilizado. Solicite um novo acesso.", options.type || "warning")}
          <button class="auth-link-button" type="button" data-auth-nav="${ROUTES.login}">Voltar para login</button>
        </div>
      `);
      return;
    }
    const passwordAlreadyChanged = Boolean(options.passwordUpdated || state.firstAccessPasswordChanged);
    renderAuth(`
      <div class="pwa-welcome-card auth-card">
        <img class="pwa-welcome-logo" src="assets/images/logo-beach-tennis-192.png" alt="">
        <span class="eyebrow">Primeiro acesso</span>
        <h1 id="authTitle">${passwordAlreadyChanged ? "Concluir liberação" : "Crie sua senha"}</h1>
        <p>${passwordAlreadyChanged ? "Sua senha já foi criada. Agora finalize a liberação segura do app." : "Defina uma senha própria para liberar seu acesso. O app só abre depois que o Supabase confirmar essa criação."}</p>
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
      renderFirstAccess({
        inviteExpired: true,
        message: "Este link expirou ou já foi utilizado. Solicite um novo acesso.",
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
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return "Use uma senha com letras maiúsculas, minúsculas e números.";
    }
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

  function clearPrivateAuthState() {
    state.session = null;
    state.accessRecord = null;
    state.firstAccessPasswordChanged = false;
  }

  async function registerCurrentSession(client = getSupabaseClient()) {
    if (!client) return false;
    const { data, error } = await client.rpc("register_current_session");
    if (error || data !== true) {
      console.warn("Não foi possível registrar a sessão atual.", error || data);
      return false;
    }
    return true;
  }

  async function isCurrentSession(client = getSupabaseClient()) {
    if (!client || !state.session) return false;
    const { data, error } = await client.rpc("is_current_session");
    if (error) throw error;
    return data === true;
  }

  async function endCurrentSession(client = getSupabaseClient()) {
    if (!client || !state.session) return false;
    const { data, error } = await client.rpc("end_current_session");
    if (error) {
      console.warn("Não foi possível encerrar a sessão ativa no servidor.", error);
      return false;
    }
    return data === true;
  }

  function stopSessionMonitor() {
    if (state.sessionMonitorTimer) {
      window.clearInterval(state.sessionMonitorTimer);
      state.sessionMonitorTimer = null;
    }
    if (state.sessionMonitorFocusHandler) {
      window.removeEventListener("focus", state.sessionMonitorFocusHandler);
      state.sessionMonitorFocusHandler = null;
    }
    if (state.sessionMonitorVisibilityHandler) {
      document.removeEventListener("visibilitychange", state.sessionMonitorVisibilityHandler);
      state.sessionMonitorVisibilityHandler = null;
    }
  }

  function startSessionMonitor() {
    if (state.sessionMonitorTimer || !state.session) return;
    state.sessionMonitorFocusHandler = () => verifyCurrentSession({ silentError: true });
    state.sessionMonitorVisibilityHandler = () => {
      if (document.visibilityState === "visible") verifyCurrentSession({ silentError: true });
    };
    window.addEventListener("focus", state.sessionMonitorFocusHandler);
    document.addEventListener("visibilitychange", state.sessionMonitorVisibilityHandler);
    state.sessionMonitorTimer = window.setInterval(() => {
      verifyCurrentSession({ silentError: true });
    }, SESSION_CHECK_INTERVAL_MS);
  }

  async function handleReplacedSession() {
    if (state.handlingReplacedSession) return;
    state.handlingReplacedSession = true;
    const client = getSupabaseClient();
    stopSessionMonitor();
    try {
      if (client) {
        await client.auth.signOut({ scope: "local" });
      }
    } catch (error) {
      console.warn("Não foi possível encerrar a sessão local substituída.", error);
    }
    clearPrivateAuthState();
    lockApp();
    navigate(ROUTES.login, {
      replace: true,
      message: SESSION_REPLACED_MESSAGE,
      type: "warning"
    });
    state.handlingReplacedSession = false;
  }

  function setLogoutButtonsBusy(activeButton, busy, text = "Saindo...") {
    document.querySelectorAll("[data-auth-action='logout']").forEach((button) => {
      if (busy) {
        button.dataset.originalText ||= button.textContent;
        button.disabled = true;
        if (button === activeButton) button.textContent = text;
      } else {
        button.disabled = false;
        if (button.dataset.originalText) button.textContent = button.dataset.originalText;
      }
    });
  }

  async function verifyCurrentSession(options = {}) {
    if (!state.session || !isPrivateRoute()) return true;
    if (state.sessionCheckInFlight) return true;
    state.sessionCheckInFlight = true;
    try {
      const current = await isCurrentSession();
      if (!current) {
        await handleReplacedSession();
        return false;
      }
      return true;
    } catch (error) {
      console.warn("Não foi possível confirmar a sessão atual.", error);
      if (!options.silentError) throw error;
      return true;
    } finally {
      state.sessionCheckInFlight = false;
    }
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
        await endCurrentSession();
        stopSessionMonitor();
        clearPrivateAuthState();
        await getSupabaseClient()?.auth.signOut({ scope: "local" });
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

      const sessionIsValid = await verifyCurrentSession();
      if (!sessionIsValid) return;

      state.firstAccessPasswordChanged = false;
      unlockApp();
      startSessionMonitor();
      if (AUTH_ROUTES.has(currentRoute())) {
        replaceRouteSilently(ROUTES.app);
      }
    } catch (error) {
      stopSessionMonitor();
      clearPrivateAuthState();
      await getSupabaseClient()?.auth.signOut({ scope: "local" });
      lockApp();
      navigate(ROUTES.login, {
        replace: true,
        message: "Não foi possível confirmar sua sessão. Entre novamente.",
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
    state.authMutationInProgress = true;
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        renderLogin({ message: "E-mail ou senha incorretos.", type: "warning" });
        return;
      }
      if (data.session) {
        state.session = data.session;
        const registered = await registerCurrentSession(client);
        if (!registered) {
          await client.auth.signOut({ scope: "local" });
          clearPrivateAuthState();
          renderLogin({
            message: "Não foi possível autorizar este dispositivo agora. Tente novamente.",
            type: "warning"
          });
          return;
        }
        await validateAccess(data.session);
      }
    } finally {
      state.authMutationInProgress = false;
      setFormBusy(form, false);
    }
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

  async function completeAccessAndRegisterSession(client) {
    const { data: completed, error: rpcError } = await client.rpc("complete_first_access");
    if (rpcError || completed !== true) {
      return { session: null, error: rpcError || new Error("complete_first_access_false") };
    }

    const { data } = await client.auth.getSession();
    const session = data.session || null;
    if (!session) {
      return { session: null, error: new Error("session_not_found_after_password_update") };
    }

    state.session = session;
    const registered = await registerCurrentSession(client);
    if (!registered) {
      return { session: null, error: new Error("register_current_session_failed") };
    }

    return { session, error: null };
  }

  async function handleResetPassword(form) {
    const client = getSupabaseClient();
    if (!client) {
      renderReset({ message: configMessage(), type: "warning" });
      return;
    }
    const passwordError = validatePasswords(form);
    if (passwordError) {
      renderReset({ message: passwordError, type: "warning" });
      return;
    }
    setFormBusy(form, true);
    state.authMutationInProgress = true;
    try {
      const { error } = await client.auth.updateUser({
        password: String(form.elements.password?.value || "")
      });
      if (error) {
        renderReset({ message: "Não foi possível salvar a nova senha. Solicite outro link.", type: "warning" });
        return;
      }
      const result = await completeAccessAndRegisterSession(client);
      if (result.error || !result.session) {
        await client.auth.signOut({ scope: "local" });
        clearPrivateAuthState();
        lockApp();
        navigate(ROUTES.login, {
          replace: true,
          message: "Senha alterada. Entre novamente para acessar o app.",
          type: "success"
        });
        return;
      }
      await validateAccess(result.session);
    } finally {
      state.authMutationInProgress = false;
      setFormBusy(form, false);
    }
  }

  async function handleFirstAccess(form) {
    const client = getSupabaseClient();
    if (!client) {
      renderFirstAccess({ message: configMessage(), type: "warning" });
      return;
    }
    const passwordError = validatePasswords(form);
    if (passwordError) {
      renderFirstAccess({ message: passwordError, type: "warning" });
      return;
    }
    setFormBusy(form, true);
    state.authMutationInProgress = true;
    try {
      const { error: passwordErrorResponse } = await client.auth.updateUser({
        password: String(form.elements.password?.value || "")
      });
      if (passwordErrorResponse) {
        renderFirstAccess({ message: "Não foi possível alterar a senha. Tente novamente.", type: "warning" });
        return;
      }

      const result = await completeAccessAndRegisterSession(client);
      if (result.error || !result.session) {
        state.firstAccessPasswordChanged = true;
        renderFirstAccess({
          message: "Senha alterada, mas não foi possível confirmar a liberação do acesso. Tente concluir novamente.",
          type: "warning"
        });
        return;
      }

      state.firstAccessPasswordChanged = false;
      await validateAccess(result.session);
    } finally {
      state.authMutationInProgress = false;
      setFormBusy(form, false);
    }
  }

  async function handleFirstAccessCompletion(form) {
    const client = getSupabaseClient();
    if (!client) {
      renderFirstAccess({ message: configMessage(), type: "warning", passwordUpdated: true });
      return;
    }
    setFormBusy(form, true);
    state.authMutationInProgress = true;
    try {
      const result = await completeAccessAndRegisterSession(client);
      if (result.error || !result.session) {
        state.firstAccessPasswordChanged = true;
        renderFirstAccess({
          message: "Ainda não foi possível confirmar a liberação do acesso. Tente novamente em instantes.",
          type: "warning",
          passwordUpdated: true
        });
        return;
      }
      state.firstAccessPasswordChanged = false;
      await validateAccess(result.session);
    } finally {
      state.authMutationInProgress = false;
      setFormBusy(form, false);
    }
  }

  async function logout(options = {}, activeButton = null) {
    if (state.logoutInProgress) return;
    state.logoutInProgress = true;
    setLogoutButtonsBusy(activeButton, true, options.loadingText || "Saindo...");
    const client = getSupabaseClient();
    let signOutError = null;
    stopSessionMonitor();

    try {
      if (client && !options.skipEndSession) {
        await endCurrentSession(client);
      }
    } catch (error) {
      console.warn("Não foi possível finalizar a sessão ativa antes do logout.", error);
    }

    try {
      if (client) {
        const { error } = await client.auth.signOut({ scope: options.scope || "local" });
        signOutError = error || null;
      }
    } catch (error) {
      signOutError = error;
    }

    clearPrivateAuthState();
    lockApp();
    navigate(options.route || ROUTES.login, {
      replace: true,
      message: signOutError
        ? "Não foi possível encerrar a sessão corretamente. Atualize a página e tente novamente."
        : options.message || "Sessão encerrada com sucesso.",
      type: signOutError ? "warning" : options.type || "success"
    });
    setLogoutButtonsBusy(activeButton, false);
    state.logoutInProgress = false;
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
    if (action === "logout") logout({}, actionButton);
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
        else logout({
          route: ROUTES.login,
          message: "Sessão encerrada em outra aba.",
          type: "info",
          skipEndSession: true
        });
      });
    }
  });

  async function init() {
    try {
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
        if (state.authMutationInProgress) return;
        if (event === "PASSWORD_RECOVERY") {
          navigate(ROUTES.reset, { replace: true });
          return;
        }
        if (event === "SIGNED_OUT") {
          stopSessionMonitor();
          clearPrivateAuthState();
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
    } catch (error) {
      console.warn("Nao foi possivel iniciar a autenticacao.", error);
      clearPrivateAuthState();
      document.body.classList.remove("auth-pending");
      navigate(preferredSignedOutRoute(), {
        replace: true,
        message: "NÃ£o foi possÃ­vel iniciar o acesso automaticamente. Tente entrar novamente.",
        type: "warning"
      });
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
