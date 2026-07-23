# Casos de teste Free, Plus e Pro

| Caso | Resultado esperado |
|---|---|
| Cadastro sem compra | Perfil Free e 25 exercícios |
| Cadastro com `Confirm email` desligado | Sessão criada sem envio de e-mail |
| Landing Plus | Abre o app solicitando o plano Plus |
| Landing Pro | Abre o app solicitando o plano Pro |
| Login após clique da landing | Tela de Planos é aberta |
| Checkout Plus | R$ 30, pagamento único |
| Compra Plus aprovada | `permanent_plan = plus` |
| Conteúdo Plus | 120 exercícios, 3 evoluções, zero planos de aula |
| Checkout Pro | R$ 40, pagamento único |
| Compra Pro aprovada | `permanent_plan = pro` |
| Conteúdo Pro | 120 exercícios, 50 planos, 3 evoluções |
| Mesmo evento reenviado | Sem nova compra ou alteração duplicada |
| Evento pendente após aprovação | Compra continua aprovada |
| Plus seguido de Pro | Perfil Pro |
| Reembolso somente do Pro | Perfil retorna ao Plus |
| Reembolso de todas as compras | Perfil Free, dados preservados |
| Usuário existente compra | Senha atual preservada |
| Compra antes da criação da conta | Não é reivindicada automaticamente |
| E-mail diferente no checkout | Acesso não é ligado automaticamente |
| Botão Verificar compra | Reivindica somente compra elegível e recarrega perfil |
| Usuário Free tenta recurso Plus | Paywall Plus/Pro |
| Usuário Plus tenta recurso Pro | Paywall Pro |

## Automação local

```bash
node tests/freemium.test.mjs
```

## Teste sandbox obrigatório

1. Crie uma conta nova no app.
2. Confirme que o perfil está Free.
3. Abra Planos dentro da conta.
4. Inicie o checkout Plus.
5. Use o mesmo e-mail da conta.
6. Aprove a compra no sandbox.
7. Confira o webhook com HTTP 200.
8. Volte ao app e toque em `Verificar compra`.
9. Confirme Plus e os bloqueios Pro.
10. Repita com Pro.
11. Reenvie o mesmo evento.
12. Confirme que a transação continua única.
13. Simule reembolso Pro.
14. Confirme retorno ao Plus.
15. Simule reembolso Plus.
16. Confirme retorno ao Free sem perda de dados pessoais.

O teste automatizado não substitui sandbox, inspeção de logs e conferência das tabelas.
