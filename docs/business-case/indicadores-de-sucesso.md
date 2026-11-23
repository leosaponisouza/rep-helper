# Indicadores de Sucesso do Projeto (KPIs)

O sucesso do **RepHelper** será mensurado tanto pela qualidade da engenharia de software quanto pelo impacto prático na rotina das repúblicas usuárias:

## 1. Indicadores de Produto e Negócio (OKRs)

| Indicador (KPI) | Meta Esperada | Como Será Medido |
| :--- | :--- | :--- |
| **Redução na Inadimplência Interna** | $\ge 80\%$ das mensalidades pagas até a data de vencimento | Proporção de mensalidades confirmadas até a data-limite configurada na república. |
| **Agilidade no Reembolso de Moradores** | Tempo médio de aprovação e reembolso $< 48\text{h}$ | Diferença entre o timestamp de criação do pedido de reembolso e a confirmação pelo Admin. |
| **Taxa de Conclusão de Tarefas no Prazo** | $\ge 85\%$ das tarefas concluídas antes do vencimento | Relação entre tarefas concluídas dentro do prazo e total de tarefas agendadas no mês. |
| **Engajamento Semanal (WAU/MAU)** | $\ge 90\%$ dos moradores ativos semanalmente | Percentual de membros da república que interagem com pelo menos 1 módulo por semana. |
| **Transparência e Redução de Conflitos** | Satisfação dos moradores (CSAT) $\ge 4,5 / 5,0$ | Avaliação periódica de satisfação interna dos moradores com a organização da casa. |

## 2. Indicadores Técnicos de Engenharia

- **Cobertura dos Requisitos Essenciais e Importantes**: $100\%$ dos requisitos funcionais priorizados para o MVP e Releases planejadas entregues e validados.
- **Desempenho de API**: Tempo de resposta médio das rotas REST $< 500\text{ms}$ (e limite máximo $< 2\text{s}$ no percentil 95).
- **Estabilidade**: Taxa de disponibilidade $\ge 99,5\%$ e zero perda de consistência transacional nos lançamentos do Caixa Comunitário.
