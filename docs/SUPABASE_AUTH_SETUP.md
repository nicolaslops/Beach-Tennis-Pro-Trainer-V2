# Supabase Auth e autorização - V120

## Configuração sem e-mail de compra

Em `Authentication > Providers > Email`:

1. mantenha Email habilitado;
2. mantenha cadastro de novos usuários habilitado;
3. desative `Confirm email`;
4. não configure convite de comprador;
5. não configure `APP_INVITE_URL`.

Com `Confirm email` desativado, a pessoa cria e usa sua própria senha no cadastro. Nenhum e-mail é necessário para criar a sessão ou liberar Plus/Pro.

## URLs

```text
Site URL: https://SEU-APP.vercel.app/
Redirect URL opcional para recuperação: https://SEU-APP.vercel.app/redefinir-senha
```

A rota `/primeiro-acesso` permanece apenas para compatibilidade com compradores antigos que já tenham recebido convite em versões anteriores. O fluxo V120 não a utiliza.

## Regra obrigatória de compra

O usuário deve:

1. criar ou entrar na conta;
2. abrir Planos dentro do app;
3. comprar com o mesmo e-mail da conta.

Essa ordem evita depender de confirmação por e-mail para provar a titularidade da compra.

## Senha esquecida

`resetPasswordForEmail()` continua no frontend, mas recuperação de senha é um fluxo separado da compra. Enviar o link de recuperação em produção exige entrega de e-mail. Se você não configurar SMTP, a compra e a liberação do plano continuam funcionando, mas não prometa recuperação por e-mail como recurso garantido.

## Segurança

- O navegador usa somente URL e chave pública.
- Service Role e HOTTOK ficam nas Edge Functions.
- O usuário atualiza somente o próprio nome.
- Plano e acesso são calculados no servidor.
- `claim_current_user_purchases()` só associa compra feita depois da criação da conta.
- `app-content` aplica o plano antes de devolver o banco.
- `register_current_session()` mantém uma sessão ativa por conta.

Documentação oficial:

- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/general-configuration
- https://supabase.com/docs/guides/functions/secrets
