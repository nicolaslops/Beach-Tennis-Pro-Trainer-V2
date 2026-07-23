# Hotmart - compra única Plus e Pro

Crie Plus por R$ 30 e Pro por R$ 40 como produtos ou ofertas de pagamento único. Não use assinatura.

## Fluxo

O comprador deve criar ou entrar na conta do app antes de abrir o checkout. No checkout, deve usar o mesmo e-mail da conta.

O webhook:

1. recebe o evento da Hotmart;
2. valida `X-HOTMART-HOTTOK`;
3. valida produto, oferta, evento, transação e comprador;
4. identifica Plus ou Pro;
5. grava ou atualiza a compra;
6. vincula a compra à conta existente;
7. recalcula o melhor plano aprovado;
8. conclui o evento somente após banco e acesso serem processados.

Ele não envia convite, link, senha ou e-mail.

## Secrets

```text
HOTMART_HOTTOK
HOTMART_PLUS_PRODUCT_ID
HOTMART_PLUS_OFFER_ID
HOTMART_PRO_PRODUCT_ID
HOTMART_PRO_OFFER_ID
APP_ALLOWED_ORIGINS
```

Os Offer IDs são opcionais no código, mas recomendados quando cada plano usa uma oferta específica. Não existe `APP_INVITE_URL`.

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizados no ambiente hospedado das Edge Functions. Nunca os coloque no frontend.

## Endpoint

```text
https://SEU_PROJECT_REF.supabase.co/functions/v1/hotmart-webhook
```

Método: `POST`.

## Eventos

Selecione:

- `PURCHASE_APPROVED`
- `PURCHASE_DELAYED`
- `PURCHASE_CANCELED`
- `PURCHASE_EXPIRED`
- `PURCHASE_REFUNDED`
- `PURCHASE_CHARGEBACK`
- `PURCHASE_PROTEST`

O webhook ignora eventos desconhecidos. Reenvios do mesmo evento ou transação não duplicam compra nem acesso.

## Comportamento por evento

| Evento | Compra | Acesso |
|---|---|---|
| Aprovada | `approved` | Plus ou Pro ativo |
| Atrasada antes da aprovação | `pending` | sem liberação |
| Atrasada depois da aprovação | preserva `approved` | preserva acesso |
| Cancelada/expirada | inativa | recalcula plano |
| Reembolsada | `refunded` | recalcula plano |
| Chargeback/protesto | `chargeback` | recalcula plano |

Se o usuário tiver Plus e depois comprar Pro, o Pro prevalece. Se o Pro for reembolsado e o Plus continuar aprovado, o perfil volta para Plus.

## Deploy

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase secrets set HOTMART_HOTTOK="SEU_HOTTOK"
supabase secrets set HOTMART_PLUS_PRODUCT_ID="ID_PLUS"
supabase secrets set HOTMART_PLUS_OFFER_ID="OFERTA_PLUS"
supabase secrets set HOTMART_PRO_PRODUCT_ID="ID_PRO"
supabase secrets set HOTMART_PRO_OFFER_ID="OFERTA_PRO"
supabase secrets set APP_ALLOWED_ORIGINS="https://SEU-APP.vercel.app"
supabase functions deploy hotmart-webhook --no-verify-jwt
```

Use o tutorial principal para migrations, testes sandbox e diagnóstico.
