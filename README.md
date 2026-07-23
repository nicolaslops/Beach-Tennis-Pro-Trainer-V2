# Beach Tennis Pro Trainer V120

PWA em HTML, CSS e JavaScript puro com autorização por plano no Supabase e compra única pela Hotmart.

## Planos

- Free: 25 exercícios selecionados, favoritos e recursos básicos.
- Plus: R$ 30 em pagamento único; banco completo, montador e Evolução.
- Pro: R$ 40 em pagamento único; tudo do Plus, 50 Planos de Aula e exportações em PDF.

Plus e Pro são permanentes. Não existe mensalidade nem renovação automática.

## Como o acesso funciona

1. A pessoa cria uma conta Free no app.
2. Dentro da conta, escolhe Plus ou Pro e abre o checkout da Hotmart.
3. A Hotmart envia `PURCHASE_APPROVED` ao webhook.
4. O webhook valida HOTTOK, produto, oferta, evento e transação.
5. A compra é gravada em `public.hotmart_purchases`.
6. `public.recompute_one_time_access()` atualiza `public.profiles`.
7. O app recarrega o perfil e libera somente os recursos do plano.

O webhook não envia e-mail, não cria senha e não convida usuários. SMTP, Resend e `APP_INVITE_URL` não participam da liberação da compra.

## Estrutura

```text
index.html                          app estático
assets/js/auth.js                   cadastro, login e sessão única
assets/js/app.js                    experiência principal
assets/js/config/                   planos e IDs gratuitos
assets/js/services/                 acesso, conteúdo e sincronização
supabase/functions/app-content/     conteúdo protegido por plano
supabase/functions/hotmart-webhook/ compra única e eventos Hotmart
supabase/migrations/                banco, RPCs e políticas
docs/                               implantação, auditoria e testes
```

O app não possui `package.json`, Vite, React ou Next.js. Na Vercel use Framework Preset `Other`, sem Build Command e sem Output Directory.

## Comece aqui

Leia [docs/TUTORIAL_COMPRA_UNICA_PLUS_PRO.md](docs/TUTORIAL_COMPRA_UNICA_PLUS_PRO.md). Ele contém a implantação completa do banco, Auth, Hotmart, Edge Functions, Vercel e testes.

## Teste local

```bash
node tests/freemium.test.mjs
node local-server.mjs
```

Abra `http://127.0.0.1:4182/`.

## Segurança

- O navegador recebe somente a URL e a chave pública do Supabase.
- HOTTOK e Service Role ficam apenas no Supabase.
- O plano oficial vem de `public.profiles`.
- A função `app-content` devolve apenas o conteúdo autorizado.
- O checkout deve ser iniciado por uma conta já autenticada.
- Compras não são liberadas por `localStorage`.

Nenhuma migration, secret ou publicação remota foi executada automaticamente nesta entrega.
