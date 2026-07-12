# Sessao unica por conta

## O que foi adicionado

O app agora usa tres RPCs publicas, executadas como usuario autenticado:

- `public.register_current_session()`
- `public.is_current_session()`
- `public.end_current_session()`

Essas funcoes usam somente `auth.uid()` e `auth.jwt()->>'session_id'`.
O front-end nao envia `user_id` nem `session_id`.

## Migration

Arquivo:

```text
supabase/migrations/20260712_single_active_session.sql
```

Como aplicar:

1. Abra o painel do Supabase.
2. Va em SQL Editor.
3. Cole o conteudo da migration.
4. Execute em producao somente depois de revisar.
5. Confirme que as funcoes aparecem como RPCs disponiveis para `authenticated`.

## Fluxo esperado

1. Login no dispositivo A registra a sessao A.
2. Login no dispositivo B registra a sessao B para o mesmo usuario.
3. A sessao A passa a retornar `false` em `is_current_session()`.
4. O dispositivo A faz logout local e mostra:

```text
Sua conta foi acessada em outro dispositivo. Entre novamente para continuar.
```

## Frequencia de verificacao

O front-end verifica a sessao:

- ao iniciar o app;
- antes de liberar rota privada;
- ao recuperar foco da janela;
- quando a aba volta para `visible`;
- a cada 15 segundos.

## Logout

Logout normal:

1. chama `public.end_current_session()`;
2. faz `signOut({ scope: "local" })`;
3. limpa o estado privado;
4. volta para `/login`.

Sair de todos os dispositivos:

1. pede confirmacao;
2. chama `public.end_current_session()`;
3. faz `signOut({ scope: "global" })`;
4. limpa o estado privado;
5. volta para `/login`.

## Testes manuais recomendados

1. Entrar no PC.
2. Entrar com a mesma conta no celular.
3. Confirmar que o celular continua funcionando.
4. Confirmar que o PC sai em ate 15 segundos ou ao recuperar foco.
5. Repetir na ordem inversa.
6. Testar duas abas no mesmo navegador.
7. Atualizar uma rota privada diretamente.
8. Testar logout normal.
9. Testar "Sair de todos".
10. Testar primeiro acesso.
11. Testar redefinicao de senha.
