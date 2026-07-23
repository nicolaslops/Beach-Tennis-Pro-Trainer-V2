# Implementação Free, Plus e Pro - V120

## Matriz de acesso

| Recurso | Free | Plus - R$ 30 único | Pro - R$ 40 único |
|---|---:|---:|---:|
| 25 exercícios selecionados | Sim | Sim | Sim |
| Todos os 120 exercícios | Não | Sim | Sim |
| Montador e treinos salvos | Sim | Sim | Sim |
| Evolução 4, 8 e 12 semanas | Não | Sim | Sim |
| 50 planos de aula | Não | Não | Sim |
| Exportação completa em PDF | Não | Não | Sim |

Plus e Pro são compras únicas com acesso permanente. A fonte oficial é `public.profiles`, e o conteúdo premium é entregue por `app-content` após validação da sessão.

## Componentes

- `assets/js/config/plans.js`: preço e matriz pública.
- `assets/js/services/subscription-service.js`: nome interno mantido por compatibilidade; lê acesso permanente.
- `assets/js/services/access-control.js`: autorização de telas.
- `assets/js/services/content-service.js`: solicita conteúdo protegido.
- `supabase/functions/hotmart-webhook/index.ts`: processa compra única.
- `supabase/functions/app-content/index.ts`: aplica Free, Plus ou Pro no servidor.
- `supabase/migrations/20260722_one_time_access_model.sql`: modelo permanente.

O guia operacional completo está em `TUTORIAL_COMPRA_UNICA_PLUS_PRO.md`.
