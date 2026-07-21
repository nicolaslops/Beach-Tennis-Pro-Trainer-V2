# Hotmart -> Supabase com convite oficial

Este projeto usa um PWA estatico em HTML, CSS e JavaScript puro. O webhook da Hotmart roda somente como Supabase Edge Function e usa `service_role` apenas no servidor.

## Fluxo

1. Cliente compra na Hotmart usando o proprio e-mail.
2. Hotmart envia `PURCHASE_APPROVED` para `hotmart-webhook`.
3. A Edge Function valida:
   - metodo `POST`;
   - header `X-HOTMART-HOTTOK`;
   - `HOTMART_PRODUCT_ID`;
   - evento;
   - transacao;
   - comprador;
   - e-mail.
4. A funcao registra o evento em `private.hotmart_webhook_events` como `processing`.
5. Se o usuario ainda nao existir, a funcao chama:

```ts
supabase.auth.admin.inviteUserByEmail(email, {
  redirectTo: APP_INVITE_URL,
  data: {
    name: buyerName,
    source: "hotmart",
    transaction_id: transactionId
  }
});
```

6. A compra e criada/atualizada em `public.hotmart_purchases`.
7. O evento so vira `processed` depois que convite e banco terminarem corretamente.

## URL exata para APP_INVITE_URL

Use a rota de primeiro acesso do app publicado:

```text
https://SEU-DOMINIO.com/primeiro-acesso
```

Exemplo na Vercel:

```text
https://seu-projeto.vercel.app/primeiro-acesso
```

Tambem adicione essa URL nos redirects permitidos do Supabase Auth.

## Secrets necessarios

Configure na Supabase Edge Function:

```bash
supabase secrets set HOTMART_HOTTOK="valor-do-hottok"
supabase secrets set HOTMART_PRODUCT_ID="id-do-produto"
supabase secrets set APP_INVITE_URL="https://SEU-DOMINIO.com/primeiro-acesso"
```

O runtime do Supabase fornece `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` para a Edge Function. Nunca coloque `service_role`, HOTTOK ou secrets no frontend.

## Arquivos

```text
supabase/functions/hotmart-webhook/index.ts
supabase/config.toml
supabase/migrations/20260713_hotmart_invite_flow.sql
assets/js/auth.js
```

## Migration SQL

Aplicar manualmente no Supabase SQL Editor:

```text
supabase/migrations/20260713_hotmart_invite_flow.sql
```

Ela adiciona:

- `buyer_name`;
- `transaction_id`;
- `product_id`;
- `purchase_date`;
- indice unico para `transaction_id`;
- tabela privada `private.hotmart_webhook_events`;
- RPCs auxiliares `security definer` liberadas somente para `service_role`;
- `public.complete_first_access()` retornando `boolean`.

O schema `private` nao precisa ser exposto no Supabase API. A Edge Function usa RPCs publicas protegidas por grant apenas para `service_role`.

Nao executei essa migration automaticamente.

## Deploy da Edge Function

Depois de revisar secrets e migration:

```bash
supabase functions deploy hotmart-webhook
```

O `supabase/config.toml` contem:

```toml
[functions.hotmart-webhook]
verify_jwt = false
```

## URL do webhook para Hotmart

Use a URL da Edge Function:

```text
https://SEU-PROJECT-REF.supabase.co/functions/v1/hotmart-webhook
```

Configure o HOTTOK na Hotmart e envie o header `X-HOTMART-HOTTOK`.

## Comportamento por evento

`PURCHASE_APPROVED`:

- cria convite oficial se o usuario ainda nao existir;
- nao gera senha aleatoria;
- nao envia senha por e-mail;
- nao usa Resend;
- atualiza `hotmart_purchases`;
- define `access_active = true`;
- define `must_change_password = true` para usuario convidado;
- preserva senha de usuario ja existente e nao envia novo convite automaticamente.

Reembolso, cancelamento e chargeback:

- `access_active = false`;
- atualiza `purchase_status`;
- tenta remover a sessao ativa em `private.active_user_sessions`, se a tabela existir;
- nao apaga usuario nem historico.

## Frontend

Quando o cliente abre o convite em:

```text
/primeiro-acesso
```

O app mostra `Crie sua senha`, valida senha forte e executa:

```js
await supabase.auth.updateUser({ password: novaSenha });
await supabase.rpc("complete_first_access");
await supabase.rpc("register_current_session");
```

Depois disso o app valida `hotmart_purchases` e libera o conteudo.

Se o link estiver expirado ou ja tiver sido usado, aparece:

```text
Este link expirou ou já foi utilizado. Solicite um novo acesso.
```

## Testes manuais recomendados

1. Enviar `PURCHASE_APPROVED` com produto correto e e-mail novo.
2. Confirmar usuario criado por convite no Supabase Auth.
3. Confirmar `hotmart_purchases.access_active = true`.
4. Confirmar `must_change_password = true`.
5. Abrir o link do convite e criar senha forte.
6. Confirmar `complete_first_access()` alterando `must_change_password = false`.
7. Confirmar entrada normal no app.
8. Reenviar o mesmo evento e confirmar que nao cria usuario/convite duplicado.
9. Enviar novo evento da mesma transacao e confirmar que nao duplica compra.
10. Enviar reembolso/cancelamento/chargeback e confirmar `access_active = false`.

## Pendencias reais

- Aplicar manualmente a migration no Supabase.
- Configurar os secrets da Edge Function.
- Conferir `APP_INVITE_URL` nos redirects permitidos do Supabase Auth.
- Fazer deploy manual da Edge Function.
- Configurar a URL da function na Hotmart.
