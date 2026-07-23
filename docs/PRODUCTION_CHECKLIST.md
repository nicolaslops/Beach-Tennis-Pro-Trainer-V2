# Checklist de produção V120

## Banco

- [ ] Backup confirmado.
- [ ] Migrations aplicadas na ordem dos nomes.
- [ ] `20260722_one_time_access_model.sql` aplicada.
- [ ] `20260723_no_email_purchase_link.sql` aplicada.
- [ ] `claim_current_user_purchases()` executável somente por `authenticated`.
- [ ] `recompute_one_time_access()` executável somente por `service_role`.
- [ ] Usuário autenticado só atualiza `profiles.name`.
- [ ] RLS ativa em perfis, compras e dados do usuário.
- [ ] Conteúdo Pro não está no JavaScript público da Vercel.

## Auth

- [ ] Provedor Email habilitado.
- [ ] Cadastro de usuários habilitado.
- [ ] `Confirm email` desativado para o fluxo sem SMTP.
- [ ] Cadastro retorna sessão sem exigir link.
- [ ] Login com e-mail e senha funciona.
- [ ] Sessão única funciona.
- [ ] Fluxo de compra não usa convite.
- [ ] Nenhuma secret de Auth está no navegador.

## Hotmart

- [ ] Plus é pagamento único de R$ 30.
- [ ] Pro é pagamento único de R$ 40.
- [ ] Não existe recorrência.
- [ ] Product IDs conferidos.
- [ ] Offer IDs conferidos.
- [ ] Checkout Plus mostra R$ 30.
- [ ] Checkout Pro mostra R$ 40.
- [ ] HOTTOK igual nos dois lados.
- [ ] Eventos de compra, reembolso e chargeback selecionados.
- [ ] Cliente entra no app antes de abrir o checkout.
- [ ] Checkout usa o mesmo e-mail da conta.

## Edge Functions

- [ ] `hotmart-webhook` publicado com `verify_jwt = false`.
- [ ] `app-content` publicado.
- [ ] `APP_ALLOWED_ORIGINS` contém o domínio real do app.
- [ ] Não existe `APP_INVITE_URL`.
- [ ] Não existe Resend.
- [ ] Logs não exibem HOTTOK, token, senha ou payload completo.

## Vercel

- [ ] App publicado como Framework `Other`.
- [ ] Landing publicada como Vite.
- [ ] Landing aponta para a URL real do app.
- [ ] App contém as duas URLs reais de checkout.
- [ ] Nenhuma configuração de Next.js.
- [ ] Nenhum secret privado no frontend.

## Planos

- [ ] Free recebe exatamente 25 exercícios.
- [ ] Conteúdo Plus libera 120 exercícios e 3 evoluções.
- [ ] Plus mantém Planos de Aula e recursos Pro bloqueados.
- [ ] Pro libera 120 exercícios, 50 planos e 3 evoluções.
- [ ] Tags “Plus” e “Pro” aparecem nas áreas bloqueadas corretas.
- [ ] `Verificar compra` recarrega o plano.

## Eventos

- [ ] Compra Plus atualiza perfil para Plus.
- [ ] Compra Pro atualiza perfil para Pro.
- [ ] Evento duplicado não duplica compra.
- [ ] Evento pendente posterior não rebaixa compra aprovada.
- [ ] Upgrade Plus para Pro funciona.
- [ ] Reembolso Pro retorna ao Plus se Plus continuar válido.
- [ ] Reembolso de todas as compras retorna ao Free.
- [ ] Reembolso não apaga favoritos, treinos ou progresso.
- [ ] Chargeback revoga a compra correspondente.

## Visual e dispositivos

- [ ] Mobile 360 px.
- [ ] Mobile 390 px.
- [ ] Mobile 414 px.
- [ ] Mobile 430 px.
- [ ] Tablet.
- [ ] Desktop.
- [ ] Modo claro.
- [ ] Modo escuro.
- [ ] PWA instalado.
- [ ] Uso normal pela web.
