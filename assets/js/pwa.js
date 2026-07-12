(() => {
  const iosModal = document.getElementById("iosInstallModal");
  const iosClose = document.getElementById("iosInstallClose");
  const iosOk = document.getElementById("iosInstallOk");

  let installPromptEvent = null;
  let iosCloseResolver = null;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(userAgent);
  const isChromeLike = /chrome|crios|edg|samsungbrowser/.test(userAgent);
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  function emitStateChange() {
    window.dispatchEvent(new CustomEvent("btpt:pwa-state", {
      detail: {
        canInstall: Boolean(installPromptEvent),
        isAndroid,
        isChromeLike,
        isIOS,
        isStandalone: isStandalone()
      }
    }));
  }

  function openIOSModal() {
    if (!iosModal) return Promise.resolve({ status: "instructions-unavailable" });
    iosModal.hidden = false;
    return new Promise((resolve) => {
      iosCloseResolver = resolve;
    });
  }

  function closeIOSModal() {
    if (iosModal) iosModal.hidden = true;
    if (iosCloseResolver) {
      iosCloseResolver({ status: "instructions-shown" });
      iosCloseResolver = null;
    }
  }

  async function requestInstall() {
    if (isStandalone()) return { status: "already-installed" };

    if (isIOS) {
      return openIOSModal();
    }

    if (!installPromptEvent) {
      return { status: "not-available" };
    }

    installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    installPromptEvent = null;
    emitStateChange();
    return choice || { outcome: "unknown" };
  }

  window.BTPT_PWA = {
    get canInstall() {
      return Boolean(installPromptEvent);
    },
    get isAndroid() {
      return isAndroid;
    },
    get isChromeLike() {
      return isChromeLike;
    },
    get isIOS() {
      return isIOS;
    },
    get isStandalone() {
      return isStandalone();
    },
    requestInstall
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPromptEvent = event;
    emitStateChange();
  });

  iosClose?.addEventListener("click", closeIOSModal);
  iosOk?.addEventListener("click", closeIOSModal);
  iosModal?.addEventListener("click", (event) => {
    if (event.target === iosModal) closeIOSModal();
  });

  window.addEventListener("appinstalled", () => {
    installPromptEvent = null;
    emitStateChange();
  });

  if ("serviceWorker" in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").then((registration) => {
        registration.update();
      }).catch((error) => {
        console.warn("Service worker nao registrado.", error);
      });
    });
  }

  emitStateChange();
})();
