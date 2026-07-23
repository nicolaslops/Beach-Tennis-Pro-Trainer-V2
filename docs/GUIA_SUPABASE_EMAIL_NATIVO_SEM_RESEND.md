# Compra sem e-mail, SMTP ou Resend

## Resposta direta

SMTP não é necessário para liberar Plus ou Pro.

O acesso é concedido por dados:

```text
Hotmart aprova
  -> webhook valida
  -> hotmart_purchases recebe a compra
  -> profiles recebe plan = plus ou pro
  -> app-content entrega o conteúdo permitido
  -> interface remove os bloqueios correspondentes
```

Não existe:

- convite após a compra;
- senha temporária;
- senha enviada por e-mail;
- `inviteUserByEmail()`;
- `APP_INVITE_URL`;
- Resend;
- `RESEND_API_KEY`;
- `EMAIL_FROM`.

## Por que havia SMTP antes

Versões anteriores criavam um usuário por convite quando a compra chegava antes da conta. Convites são mensagens de Auth e precisam ser entregues por e-mail. A V120 removeu esse desenho.

## Como evitar e-mail no cadastro

No projeto hospedado do Supabase, `Confirm email` costuma vir ativo. Desative essa opção no provedor Email. Assim, `signUp()` devolve uma sessão e o usuário entra usando a senha que acabou de criar.

Consequência: o endereço não é verificado pelo Supabase. Por isso, a compra deve ocorrer depois da criação da conta e pelo checkout aberto dentro dela.

## O que ainda pode usar e-mail

A função “Esqueci minha senha” chama `resetPasswordForEmail()`. Isso não faz parte da compra. Você pode:

1. manter a tela e configurar SMTP no futuro;
2. manter a tela sabendo que a entrega padrão não é adequada para usuários externos;
3. retirar esse recurso em uma versão futura e tratar recuperação pelo suporte.

Nenhuma dessas opções altera a liberação Plus/Pro.

## Custo

O código não exige Resend nem provedor SMTP para venda e liberação. Custos ou limites de Hotmart, Supabase e Vercel dependem dos planos dessas plataformas. “Sem SMTP” não significa que todos os serviços externos terão uso ilimitado gratuito.
