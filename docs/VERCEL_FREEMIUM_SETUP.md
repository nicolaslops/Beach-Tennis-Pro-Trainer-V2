# Vercel - app principal V120

O app principal é estático, sem `package.json`, Vite, React ou Next.js.

```text
Framework Preset: Other
Root Directory: raiz do app
Build Command: vazio
Output Directory: vazio
Install Command: vazio
```

Configure `assets/js/env.js` antes de publicar:

```js
window.BTPT_ENV = {
  VITE_SUPABASE_URL: "https://SEU_PROJECT_REF.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "SUA_CHAVE_PUBLICA",
  VITE_HOTMART_PLUS_CHECKOUT_URL: "URL_PLUS_R$30",
  VITE_HOTMART_PRO_CHECKOUT_URL: "URL_PRO_R$40"
};
```

Somente esses quatro valores públicos ficam no app.

Não coloque HOTTOK, Service Role, secret key ou credenciais privadas na Vercel. O `vercel.json` contém os rewrites das rotas SPA.

Para banco, Hotmart, Supabase e testes, siga `TUTORIAL_COMPRA_UNICA_PLUS_PRO.md`.
