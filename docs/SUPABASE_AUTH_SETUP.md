# Configuração de autenticação Supabase

## Estrutura real do projeto

Este app não é Next.js. Não existe `package.json`, `app/`, `src/app`, `pages/` ou configuração de Next.

A implementação atual é um PWA estático em HTML, CSS e JavaScript puro. Por isso:

- não foi instalado `@supabase/ssr`;
- não foi criado `middleware.ts` ou `proxy.ts`;
- não foi criada estrutura de App Router;
- o cliente Supabase usado no navegador vem de `@supabase/supabase-js` via CDN;
- a proteção de rotas acontece no front-end, antes de exibir o app privado.

## Arquivos de configuração

O arquivo usado pelo app estático é:

```text
assets/js/env.js
```

Ele contém somente valores públicos:

```js
window.BTPT_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "...",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "...",
  VITE_SUPABASE_URL: "...",
  VITE_SUPABASE_PUBLISHABLE_KEY: "..."
};
```

Também existe `.env.local` com os nomes fornecidos pelo Supabase. Esse arquivo está no `.gitignore`.

O `.env.example` fica apenas com placeholders:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Nunca coloque no front-end:

- `sb_secret`;
- `service_role`;
- senha do banco;
- HOTTOK da Hotmart;
- API key de e-mail;
- qualquer chave administrativa.

## Rotas públicas

- `/acesso`
- `/login`
- `/esqueci-senha`
- `/redefinir-senha`

## Rotas privadas

- `/`
- `/dashboard`
- `/primeiro-acesso`
- qualquer rota que não esteja na lista pública acima

O `vercel.json` redireciona as rotas para `index.html`.

## Fluxo de login

O login usa:

```js
supabase.auth.signInWithPassword({
  email: email.trim().toLowerCase(),
  password
});
```

Depois do login, o app consulta `public.hotmart_purchases` filtrando pelo usuário autenticado.

O app só libera o conteúdo quando:

```text
access_active = true
purchase_status = approved
must_change_password = false
```

Se `must_change_password = true`, o usuário vai para `/primeiro-acesso`.

Se não existir compra ativa, o app encerra a sessão e mostra uma mensagem amigável.

## Recuperação de senha

A tela `/esqueci-senha` usa:

```js
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/redefinir-senha`
});
```

A mensagem não confirma se o e-mail existe.

## Redefinição de senha

A tela `/redefinir-senha` usa:

```js
supabase.auth.updateUser({
  password: novaSenha
});
```

Validações aplicadas:

- mínimo de 8 caracteres;
- confirmação de senha;
- prevenção de envio repetido;
- mensagem para link inválido ou expirado.

## Primeiro acesso

A tela `/primeiro-acesso` exige sessão autenticada.

Depois de alterar a senha temporária, o app chama:

```js
supabase.rpc("complete_first_access");
```

Essa função deve alterar somente `must_change_password`.

O front-end não altera diretamente:

- `access_active`;
- `purchase_status`;
- `transaction_id`;
- `product_id`;
- `user_id`.

Se a função segura `complete_first_access` não existir no Supabase, o app não simula sucesso e mantém o acesso bloqueado.

## Tabelas

O front-end consulta somente:

```text
public.hotmart_purchases
```

O app não consulta:

```text
private.hotmart_webhook_events
```

Essa tabela privada deve ficar para o webhook da Hotmart.

## Migração modelo

Existe uma migração segura em:

```text
supabase/migrations/20260711_hotmart_purchases_auth_support.sql
```

Antes de aplicar em produção, compare com a estrutura real já existente no Supabase para evitar duplicar colunas ou políticas.
