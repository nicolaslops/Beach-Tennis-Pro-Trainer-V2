# Auditoria histórica da autenticação Supabase - V2

> Este relatório descreve a arquitetura anterior à V118. Para implantação atual, use `FREEMIUM_IMPLEMENTATION.md` e `SUPABASE_AUTH_SETUP.md`.

## 1. Framework e estrutura identificados

Este pacote auditado nao e Next.js. Nao existe `package.json`, `next.config`, `app/`, `src/app`, `pages/`, `middleware.ts` ou `proxy.ts`.

A estrutura real e um PWA estatico em HTML, CSS e JavaScript puro:

- `index.html`
- `assets/js/auth.js`
- `assets/js/app.js`
- `assets/js/pwa.js`
- `assets/js/env.js`
- `assets/css/style.css`
- `assets/css/visual-v61.css`
- `sw.js`
- `vercel.json`

Por esse motivo, nao foram criados arquivos Next incompatíveis nem instaladas dependencias npm.

## 2. Arquivos criados

- `docs/SUPABASE_VERIFICATION_QUERIES.sql`
- `docs/AUTH_AUDIT_REPORT.md`

## 3. Arquivos alterados

- `assets/js/auth.js`
- `assets/css/visual-v61.css`
- `index.html`
- `sw.js`

## 4. Rotas publicas

- `/acesso`
- `/login`
- `/esqueci-senha`
- `/redefinir-senha`

## 5. Rotas protegidas

Como o app e SPA estatica, qualquer rota fora da lista publica fica bloqueada pela camada `auth.js` ate existir sessao validada e compra ativa.

Inclui:

- `/`
- `/dashboard`
- `/primeiro-acesso`
- `/exercicios`
- `/planos`
- `/evolucao`
- `/favoritos`
- `/montar-treino`
- `/perfil`
- `/configuracoes`

Arquivos estaticos, manifest, service worker, CSS, JS e imagens continuam acessiveis.

## 6. Configuracao do cliente Supabase

O cliente do navegador fica centralizado em `assets/js/auth.js`, dentro de `getSupabaseClient()`.

Ele usa `window.supabase.createClient` carregado por CDN:

```html
https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
```

As variaveis publicas sao lidas de `assets/js/env.js`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## 7. Configuracao do servidor Supabase

Nao se aplica nesta estrutura estatica. Nao existe runtime server-side Next.js neste pacote, portanto `createServerClient`, cookies de servidor, `middleware.ts` e `proxy.ts` nao seriam executados.

## 8. Configuracao do proxy ou middleware

Nao se aplica nesta estrutura estatica.

O `vercel.json` esta configurado para redirecionar rotas SPA para `index.html`, preservando assets estaticos:

```json
"/((?!assets/|manifest.json|sw.js).*)"
```

## 9. Fluxo de login

O login usa:

```js
supabase.auth.signInWithPassword({
  email: email.trim().toLowerCase(),
  password
})
```

Implementado:

- validacao de e-mail;
- normalizacao do e-mail;
- autocomplete;
- loading;
- prevencao de envio repetido;
- botao mostrar/ocultar senha;
- mensagem amigavel para credenciais invalidas;
- sem cadastro publico;
- sem login social;
- sem login anonimo.

## 10. Fluxo de primeiro acesso

Quando `must_change_password = true`, o usuario e enviado para `/primeiro-acesso`.

Enquanto isso for verdadeiro:

- o dashboard permanece bloqueado;
- rotas internas redirecionam para `/primeiro-acesso`;
- o app nao simula liberacao.

A tela valida:

- minimo de 8 caracteres;
- confirmacao igual;
- loading;
- prevencao de cliques repetidos;
- mostrar/ocultar senha;
- senha nao e salva em storage.

## 11. Chamada da RPC complete_first_access

O fluxo executa primeiro:

```js
supabase.auth.updateUser({ password })
```

Somente depois chama:

```js
supabase.rpc("complete_first_access")
```

O app so libera quando:

- erro da senha e nulo;
- erro da RPC e nulo;
- retorno da RPC e `true`.

Se a senha for alterada e a RPC falhar, o app:

- nao libera dashboard;
- mostra mensagem amigavel;
- permite tentar concluir novamente sem exigir nova troca de senha;
- nao faz update direto em `hotmart_purchases`.

## 12. Fluxo de recuperacao

`/esqueci-senha` usa:

```js
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/redefinir-senha`
})
```

A mensagem e neutra:

```text
Caso exista uma conta vinculada a este e-mail, voce recebera as instrucoes para redefinir sua senha.
```

## 13. Fluxo de redefinicao

`/redefinir-senha` usa:

```js
supabase.auth.updateUser({ password })
```

Implementado:

- minimo de 8 caracteres;
- confirmacao igual;
- mensagem para link invalido;
- loading;
- logout apos redefinir senha para evitar sessao presa.

## 14. Fluxo de logout

O logout usa:

```js
supabase.auth.signOut()
```

Depois limpa estado privado em memoria e redireciona para `/login` ou `/acesso`.

## 15. Resultado do lint

Nao executado. O projeto nao possui `package.json` nem script `npm run lint`.

Resultado real:

```text
SKIPPED: package.json nao existe neste projeto estatico.
```

## 16. Resultado do typecheck

Nao executado. O projeto nao possui TypeScript nem script `npm run typecheck`.

Resultado real:

```text
SKIPPED: package.json nao existe neste projeto estatico.
```

## 17. Resultado dos testes

Nao existe script `npm run test`.

Foram executados testes estaticos de rota local:

```text
/acesso: status=200; authScript=true; locked=true
/login: status=200; authScript=true; locked=true
/esqueci-senha: status=200; authScript=true; locked=true
/redefinir-senha: status=200; authScript=true; locked=true
/primeiro-acesso: status=200; authScript=true; locked=true
/dashboard: status=200; authScript=true; locked=true
/exercicios: status=200; authScript=true; locked=true
```

## 18. Resultado do build

Nao executado. O projeto e estatico e nao possui `package.json` nem script `npm run build`.

Resultado real:

```text
SKIPPED: package.json nao existe neste projeto estatico.
```

## 19. Confirmacao de que .env.local esta ignorado

`.gitignore` contem:

```text
.env.local
.env.*.local
```

Neste pacote GitHub leve, `.env.local` nao foi incluido.

## 20. Confirmacao de que nenhum segredo foi exposto

Busca realizada por:

- `sb_secret`
- `service_role`
- `HOTMART_HOTTOK`
- `SUPABASE_SERVICE_ROLE_KEY`
- `database password`
- `refresh_token`
- `access_token`

Resultado: nao ha segredo no codigo. As unicas ocorrencias de nomes proibidos estao na documentacao como aviso do que nao usar.

## 21. URL publica da V2

Nao identificada no ambiente local. Nenhum deploy Vercel foi executado.

## 22. Site URL para Supabase

Quando a V2 estiver publicada, configurar no Supabase:

```text
Site URL:
https://URL-DA-V2
```

## 23. Redirect URL para Supabase

Quando a V2 estiver publicada, configurar no Supabase:

```text
Redirect URL:
https://URL-DA-V2/redefinir-senha
```

## 24. Testes manuais ainda necessarios

Precisam de usuario real no Supabase:

1. Criar usuario em `Authentication -> Users -> Add user`.
2. Criar compra teste em `public.hotmart_purchases` com:
   - `user_id`
   - `email`
   - `buyer_name`
   - `transaction_id`
   - `product_id`
   - `purchase_status = approved`
   - `must_change_password = true`
   - `access_active = true`
3. Testar login com senha incorreta.
4. Testar login correto sem compra ativa.
5. Testar compra inativa.
6. Testar status diferente de `approved`.
7. Testar primeiro acesso.
8. Testar RPC retornando erro.
9. Testar RPC retornando `false`.
10. Testar recuperacao e redefinicao de senha.
11. Testar logout.
12. Testar sessao encerrada em outra aba.
13. Testar PWA em Android/iOS.

## 25. Pendencias reais

- Confirmar em producao a URL publica da V2.
- Cadastrar as variaveis publicas na Vercel:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Configurar `Site URL` e `Redirect URL` no Supabase.
- Executar `docs/SUPABASE_VERIFICATION_QUERIES.sql` no Supabase.
- Confirmar que `complete_first_access()` retorna booleano `true` no sucesso.
- Nao fazer deploy por cima da versao atual usada pelos clientes.
