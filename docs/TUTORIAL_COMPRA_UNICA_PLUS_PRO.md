# Tutorial completo: Free, Plus e Pro sem e-mail de compra

Este guia implanta o Beach Tennis Pro Trainer V120 com:

- Free: gratuito;
- Plus: R$ 30, pagamento único;
- Pro: R$ 40, pagamento único;
- Hotmart como checkout;
- Supabase como Auth, banco e backend;
- Vercel para app e landing;
- nenhum convite após a compra;
- nenhuma senha temporária;
- nenhum Resend;
- nenhum SMTP necessário para liberar o plano.

Nenhum comando deste documento foi executado no seu Supabase automaticamente.

## 1. Entenda o fluxo final

```text
LANDING
  -> usuário escolhe Plus ou Pro
  -> landing abre o app

APP
  -> usuário cria conta ou entra
  -> app abre a tela de Planos
  -> usuário abre o checkout

HOTMART
  -> comprador usa o mesmo e-mail da conta
  -> pagamento é aprovado
  -> Hotmart envia PURCHASE_APPROVED

EDGE FUNCTION
  -> valida HOTTOK
  -> valida produto, oferta, transação e evento
  -> encontra a conta já existente
  -> grava hotmart_purchases
  -> chama recompute_one_time_access

SUPABASE
  -> profiles.plan = plus ou pro
  -> profiles.permanent_plan = plus ou pro
  -> profiles.access_type = one_time

APP
  -> Verificar compra ou novo carregamento
  -> perfil atualizado
  -> app-content devolve somente o conteúdo autorizado
  -> bloqueios Plus/Pro são atualizados
```

## 2. Por que não há SMTP

SMTP serve para enviar mensagens. Este fluxo não envia mensagem ao comprador depois da compra.

O plano é liberado por atualização no banco. O webhook não chama:

```text
inviteUserByEmail
resetPasswordForEmail
signInWithOtp
Resend
```

Também não usa:

```text
APP_INVITE_URL
RESEND_API_KEY
EMAIL_FROM
senha temporária
```

O comprador cria a própria senha no cadastro antes de pagar.

## 3. Limite importante do modelo sem e-mail

Ao desativar `Confirm email`, o Supabase não comprova que a pessoa controla aquele endereço. Por isso, a ordem da operação é obrigatória:

```text
conta primeiro -> compra depois
```

O código V120 reforça essa regra:

- a landing leva o usuário ao app;
- o checkout pago fica dentro da conta autenticada;
- a migration só reivindica compra cuja data seja posterior à criação do perfil;
- compra já vinculada a outra conta nunca é transferida pelo navegador;
- o e-mail da Hotmart deve ser igual ao e-mail da conta.

Não divulgue o checkout pago como link solto se quiser manter esse desenho sem confirmação por e-mail.

## 4. Matriz de acesso

| Recurso | Free | Plus | Pro |
|---|---:|---:|---:|
| 25 exercícios selecionados | sim | sim | sim |
| 120 exercícios | não | sim | sim |
| Favoritos | sim | sim | sim |
| Montador e treinos salvos | conforme configuração Free atual | sim | sim |
| Evolução 4, 8 e 12 semanas | não | sim | sim |
| 50 Planos de Aula | não | não | sim |
| Exportação completa em PDF | não | não | sim |

O frontend mostra os paywalls, mas a proteção real está em `app-content`.

## 5. Faça backup antes de migrar

No painel do Supabase, confirme o projeto correto.

Se usa Supabase CLI e possui acesso ao banco:

```bash
supabase db dump --linked --schema public --schema private -f btpt_pre_v120.sql
```

Ou utilize o mecanismo de backup disponível no seu plano.

Não continue se você não consegue identificar qual projeto é produção.

## 6. Confira os arquivos

Migrations principais:

```text
supabase/migrations/20260721_freemium_subscription_model.sql
supabase/migrations/20260721_legacy_lifetime_review_template.sql
supabase/migrations/20260722_one_time_access_model.sql
supabase/migrations/20260723_no_email_purchase_link.sql
```

Funções:

```text
supabase/functions/app-content/index.ts
supabase/functions/hotmart-webhook/index.ts
```

Configuração:

```text
supabase/config.toml
```

O arquivo `config.toml` deve conter:

```toml
[functions.hotmart-webhook]
verify_jwt = false

[functions.app-content]
verify_jwt = false
```

`hotmart-webhook` valida o HOTTOK. `app-content` valida a sessão dentro da própria função.

## 7. Ligue o projeto na CLI

Instale a Supabase CLI pelo método oficial da sua plataforma.

Depois:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
```

Confirme o projeto:

```bash
supabase projects list
```

## 8. Aplique as migrations

Opção recomendada:

```bash
supabase db push
```

Revise a lista mostrada pela CLI antes de confirmar.

Se aplicar pelo SQL Editor, execute os arquivos em ordem cronológica. Não execute a migration V120 antes das migrations que criam `profiles`, `hotmart_purchases` e `recompute_one_time_access`.

### O que a migration V120 cria

`20260723_no_email_purchase_link.sql`:

1. muda o padrão de `must_change_password` para `false`;
2. limpa a exigência de senha em compras novas ainda não vinculadas;
3. cria `claim_current_user_purchases()`;
4. limita a RPC a usuários autenticados;
5. impede transferência de compra de outro usuário;
6. exige que o perfil exista antes da compra;
7. recalcula o plano apenas quando existe compra aprovada e ativa.

## 9. Verifique o banco

No SQL Editor:

```sql
select
  routine_schema,
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'ensure_current_profile',
    'claim_current_user_purchases',
    'recompute_one_time_access',
    'claim_subscription_event',
    'mark_subscription_event'
  )
order by routine_name;
```

Confira as colunas:

```sql
select
  column_name,
  data_type,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'hotmart_purchases')
order by table_name, ordinal_position;
```

Confira grants:

```sql
select
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'claim_current_user_purchases',
    'recompute_one_time_access'
  )
order by routine_name, grantee;
```

Resultado esperado:

- `authenticated` pode executar `claim_current_user_purchases`;
- apenas `service_role` pode executar `recompute_one_time_access`;
- `anon` não pode executar nenhuma das duas.

## 10. Configure o Supabase Auth

Abra:

```text
Supabase Dashboard
-> Authentication
-> Providers
-> Email
```

Configure:

```text
Email provider: ON
Allow new users to sign up: ON
Confirm email: OFF
```

Salve.

### Teste o cadastro

1. Abra o app em janela anônima.
2. Crie uma conta com nome, e-mail e senha.
3. O app deve entrar sem pedir link.
4. Em `Authentication > Users`, confirme o usuário.
5. Em `Table Editor > profiles`, confirme o perfil Free.

Se a tela disser para confirmar e-mail, `Confirm email` ainda está ativo.

## 11. Configure URLs do Auth

Abra:

```text
Authentication
-> URL Configuration
```

Use:

```text
Site URL:
https://SEU-APP.vercel.app/
```

Se mantiver recuperação de senha:

```text
Redirect URL:
https://SEU-APP.vercel.app/redefinir-senha
```

Não é necessário cadastrar `/primeiro-acesso` para compras V120. Essa rota só existe para compatibilidade legada.

## 12. Entenda a recuperação de senha

O botão “Esqueci minha senha” chama `resetPasswordForEmail()`. Esse recurso envia e-mail e é independente da compra.

Sem SMTP:

- cadastro funciona se `Confirm email` estiver desligado;
- login funciona;
- compra funciona;
- Plus/Pro são liberados;
- recuperação por e-mail pode não ser entregue a clientes externos.

Você pode configurar SMTP futuramente sem alterar o webhook. Não configure SMTP apenas por causa da compra.

## 13. Crie os produtos na Hotmart

Crie dois acessos:

### Plus

```text
Nome: Beach Tennis Pro Trainer Plus
Preço: R$ 30
Cobrança: pagamento único
Recorrência: nenhuma
```

### Pro

```text
Nome: Beach Tennis Pro Trainer Pro
Preço: R$ 40
Cobrança: pagamento único
Recorrência: nenhuma
```

Anote para cada um:

```text
Product ID
Offer ID
URL oficial do checkout
```

Abra os dois checkouts em janela anônima e confira preço, produto e ausência de recorrência.

## 14. Configure os secrets

Secrets usados pela função:

```text
HOTMART_HOTTOK
HOTMART_PLUS_PRODUCT_ID
HOTMART_PLUS_OFFER_ID
HOTMART_PRO_PRODUCT_ID
HOTMART_PRO_OFFER_ID
APP_ALLOWED_ORIGINS
```

Pela CLI:

```bash
supabase secrets set HOTMART_HOTTOK="SEU_HOTTOK"
supabase secrets set HOTMART_PLUS_PRODUCT_ID="ID_PLUS"
supabase secrets set HOTMART_PLUS_OFFER_ID="OFERTA_PLUS"
supabase secrets set HOTMART_PRO_PRODUCT_ID="ID_PRO"
supabase secrets set HOTMART_PRO_OFFER_ID="OFERTA_PRO"
supabase secrets set APP_ALLOWED_ORIGINS="https://SEU-APP.vercel.app"
```

Liste os nomes:

```bash
supabase secrets list
```

Não existe:

```text
APP_INVITE_URL
RESEND_API_KEY
EMAIL_FROM
```

Não grave valores de secrets em Git.

## 15. Publique as Edge Functions

```bash
supabase functions deploy hotmart-webhook --no-verify-jwt
supabase functions deploy app-content --no-verify-jwt
```

Endpoint do webhook:

```text
https://SEU_PROJECT_REF.supabase.co/functions/v1/hotmart-webhook
```

## 16. Configure o webhook na Hotmart

Na Hotmart:

```text
Ferramentas
-> Webhook
-> Cadastrar Webhook
```

Preencha:

```text
Nome: BTPT produção
URL: https://SEU_PROJECT_REF.supabase.co/functions/v1/hotmart-webhook
Versão: 2.0.0
```

Selecione:

```text
PURCHASE_APPROVED
PURCHASE_DELAYED
PURCHASE_CANCELED
PURCHASE_EXPIRED
PURCHASE_REFUNDED
PURCHASE_CHARGEBACK
PURCHASE_PROTEST
```

Confirme que o HOTTOK da Hotmart é idêntico ao secret `HOTMART_HOTTOK`.

## 17. Configure o app principal

Edite:

```text
assets/js/env.js
```

Use:

```js
window.BTPT_ENV = {
  VITE_SUPABASE_URL: "https://SEU_PROJECT_REF.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "SUA_CHAVE_PUBLICA",
  VITE_HOTMART_PLUS_CHECKOUT_URL: "https://pay.hotmart.com/SEU_PLUS",
  VITE_HOTMART_PRO_CHECKOUT_URL: "https://pay.hotmart.com/SEU_PRO"
};
```

Esses valores são públicos:

- URL do projeto;
- publishable key;
- links de checkout.

Nunca coloque no arquivo:

```text
service_role
secret key
HOTTOK
senha
token de usuário
```

## 18. Publique o app na Vercel

Configuração:

```text
Framework Preset: Other
Root Directory: raiz do app
Build Command: vazio
Output Directory: vazio
Install Command: vazio
```

O app é HTML/CSS/JavaScript puro. Não selecione Vite, React ou Next.js.

Após publicar, teste:

```text
/acesso
/login
/criar-conta
/redefinir-senha
/
```

## 19. Configure a landing

Na landing, configure:

```text
VITE_APP_URL=https://SEU-APP.vercel.app/
```

Não configure checkouts na landing V120.

Os botões:

```text
Free -> app
Plus -> app?plan=plus
Pro -> app?plan=pro
```

Depois do cadastro ou login, o app abre Planos. O checkout real é acionado dentro da conta.

## 20. Publique a landing

Configuração Vercel:

```text
Framework Preset: Vite
Root Directory: raiz da landing
Build Command: npm run build
Output Directory: dist
```

Variável:

```text
VITE_APP_URL
```

## 21. Teste o fluxo Free

1. Use um e-mail nunca cadastrado.
2. Crie a conta.
3. Confirme entrada imediata.
4. Confirme plano Free.
5. Confirme 25 exercícios.
6. Tente abrir um exercício Plus.
7. Confirme o paywall.
8. Tente abrir Planos de Aula.
9. Confirme bloqueio Pro.

SQL:

```sql
select
  id,
  email,
  plan,
  access_type,
  permanent_plan,
  access_active
from public.profiles
where lower(email) = lower('CLIENTE@EXEMPLO.COM');
```

## 22. Teste Plus

1. Entre na conta Free.
2. Abra Planos.
3. Clique em comprar Plus.
4. Confirme R$ 30 e pagamento único.
5. Use exatamente o e-mail da conta.
6. Conclua a compra sandbox.
7. Confirme HTTP 200 no webhook.
8. Volte ao app.
9. Clique em `Verificar compra`.
10. Confirme Plus.
11. Confirme banco completo e Evolução.
12. Confirme Planos de Aula ainda bloqueados.

SQL:

```sql
select
  transaction_id,
  email,
  user_id,
  plan,
  access_model,
  purchase_status,
  access_active,
  must_change_password,
  purchase_date,
  updated_at
from public.hotmart_purchases
where lower(email) = lower('CLIENTE@EXEMPLO.COM')
order by updated_at desc;
```

Esperado:

```text
plan = plus
access_model = one_time
purchase_status = approved
access_active = true
must_change_password = false
user_id preenchido
```

## 23. Teste Pro

Repita dentro da mesma conta:

1. compre Pro;
2. use o mesmo e-mail;
3. aprove;
4. verifique a compra;
5. confirme `plan = pro`;
6. confirme 50 Planos de Aula;
7. confirme exportações Pro.

O algoritmo escolhe Pro acima de Plus quando ambos estão aprovados.

## 24. Teste idempotência

Reenvie o mesmo evento Hotmart.

Confira:

```sql
select transaction_id, count(*)
from public.hotmart_purchases
group by transaction_id
having count(*) > 1;
```

Resultado esperado: zero linhas.

Confira eventos:

```sql
select
  event_key,
  event_type,
  transaction_id,
  processing_status,
  processed_at,
  error_message
from public.subscription_events
order by created_at desc
limit 30;
```

O evento repetido deve retornar sucesso de duplicidade e não repetir a operação.

## 25. Teste reembolso e chargeback

### Reembolso apenas do Pro

Se Plus também estiver aprovado:

```text
perfil volta para Plus
```

### Reembolso de todas as compras

```text
perfil volta para Free
favoritos permanecem
treinos permanecem
progresso permanece
```

### Chargeback

A compra afetada fica inativa e o plano é recalculado com as compras restantes.

## 26. Diagnóstico

### Compra aprovada, perfil continua Free

Verifique:

1. o usuário criou a conta antes da compra;
2. o e-mail da Hotmart é igual ao da conta;
3. Product ID;
4. Offer ID;
5. HOTTOK;
6. status do evento;
7. `user_id` em `hotmart_purchases`;
8. logs da Edge Function;
9. migration `20260723_no_email_purchase_link.sql`;
10. botão `Verificar compra`.

### `pending_account_link = true`

O webhook não encontrou conta elegível. As causas mais comuns são:

- compra feita antes da conta;
- e-mail diferente;
- perfil não criado;
- compra por link solto fora do fluxo.

Não transfira compra automaticamente para outro e-mail. Confirme a transação no suporte antes de qualquer ajuste administrativo.

### Cadastro pede confirmação de e-mail

Desative `Confirm email` em:

```text
Authentication -> Providers -> Email
```

### Checkout errado

Revise:

```text
assets/js/env.js
VITE_HOTMART_PLUS_CHECKOUT_URL
VITE_HOTMART_PRO_CHECKOUT_URL
```

### Conteúdo Pro aparece no Free

1. confirme a versão publicada de `app-content`;
2. confirme `APP_ALLOWED_ORIGINS`;
3. limpe o cache do Service Worker;
4. confira o perfil;
5. confira se o conteúdo completo não foi colocado no frontend.

### Evento falha

Não registre payload completo ou secrets no log. Use o `error_message` limitado da caixa de eventos e os logs da função.

## 27. Consultas de auditoria

Perfis:

```sql
select
  email,
  plan,
  access_type,
  permanent_plan,
  purchase_product_id,
  purchase_offer_id,
  purchase_transaction_id,
  purchased_at,
  access_active,
  updated_at
from public.profiles
order by updated_at desc;
```

Compras:

```sql
select
  email,
  transaction_id,
  product_id,
  offer_id,
  plan,
  purchase_status,
  access_active,
  user_id,
  updated_at
from public.hotmart_purchases
order by updated_at desc;
```

Compras aprovadas sem conta:

```sql
select
  email,
  transaction_id,
  plan,
  purchase_date,
  updated_at
from public.hotmart_purchases
where access_model = 'one_time'
  and purchase_status = 'approved'
  and access_active = true
  and user_id is null
order by updated_at desc;
```

Esses registros exigem análise de suporte. Não são liberados automaticamente para conta criada depois da compra.

## 28. Execução automatizada local

Na raiz do app:

```bash
node tests/freemium.test.mjs
```

O teste valida:

- preços únicos;
- matriz Free/Plus/Pro;
- ausência de Resend;
- ausência de convite;
- ausência de `APP_INVITE_URL`;
- eventos Hotmart;
- idempotência estrutural;
- RPC de vínculo;
- proteção de `recompute_one_time_access`;
- versão de conteúdo;
- manifest e Vercel.

## 29. Ordem final recomendada

1. Fazer backup.
2. Configurar produtos Hotmart.
3. Aplicar migrations.
4. Desativar `Confirm email`.
5. Configurar secrets.
6. Publicar Edge Functions.
7. Configurar webhook Hotmart.
8. Configurar `assets/js/env.js`.
9. Publicar app.
10. Configurar `VITE_APP_URL` da landing.
11. Publicar landing.
12. Testar Free.
13. Testar Plus.
14. Testar Pro.
15. Testar duplicidade.
16. Testar reembolso.
17. Revisar logs e consultas.

## 30. Resumo operacional

- Não pague serviço de e-mail apenas para liberar Plus ou Pro.
- O plano é um direito registrado no banco.
- A conta deve existir antes do checkout.
- O e-mail do checkout deve ser o mesmo da conta.
- Free permanece bloqueado nas áreas Plus/Pro.
- Plus permanece bloqueado nas áreas exclusivas Pro.
- Pro recebe o conteúdo completo.
- Reembolso recalcula o acesso sem apagar dados do usuário.
- Recuperação de senha por e-mail é opcional e separada da compra.
