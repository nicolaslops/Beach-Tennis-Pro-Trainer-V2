# Compradores antigos

A V120 preserva acessos anteriores sem convertê-los silenciosamente em compras novas.

- `legacy_lifetime`: acesso vitalício antigo preservado.
- `legacy_subscription`: ciclo antigo preservado somente até o fim já pago.
- `legacy_review_required`: comprador antigo ainda aguardando classificação humana.
- `one_time`: Plus R$ 30 ou Pro R$ 40 comprado no modelo atual.

Antes de publicar, revise perfis com:

```sql
select id, email, plan, access_type, legacy_plan, legacy_review_required,
       subscription_current_period_end
from public.profiles
where access_type like 'legacy_%' or legacy_review_required = true
order by email;
```

Não remova colunas antigas na primeira implantação. Depois de classificar e observar o sistema em produção, uma limpeza pode ser planejada em migration separada com backup.

O processo completo está em `TUTORIAL_COMPRA_UNICA_PLUS_PRO.md`.
