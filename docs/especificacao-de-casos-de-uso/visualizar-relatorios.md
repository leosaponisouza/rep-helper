# Caso de Uso [UC14]: Visualizar Relatórios e Gráficos Analíticos

- **Requisitos Relacionados**: `[RF024]`
- **Regras de Negócio**: `[RN004]`, `[RN015]`
- **Atores**: Morador (`ROLE_MORADOR`) / Administrador (`ROLE_ADMIN`)
- **Pré-condições**: O usuário deve estar autenticado e vinculado a uma república ativa.
- **Pós-condições**: O sistema apresenta dashboards e relatórios gráficos sobre as finanças do Caixa Comunitário, tarefas domésticas e manutenção da república.

---

## 1. Fluxo Principal

1. O usuário acessa o menu **"Relatórios"**.
2. O usuário seleciona o tipo de relatório analítico e o **período de análise** (ex.: *Mês Atual*, *Últimos 3 Meses*, *Últimos 6 Meses* ou intervalo personalizado):
   - **Relatório Financeiro do Caixa Comunitário**:
     - Gráfico de barras comparando **Entradas (Mensalidades Fixas)** vs. **Saídas Diretas do Caixa** vs. **Reembolsos a Moradores** mês a mês;
     - Gráfico de rosca (*donut chart*) com a distribuição de gastos por categoria (*Aluguel/Contas*, *Mercado*, *Limpeza*, *Manutenção*);
     - Quadro de adimplência de mensalidades do período.
   - **Relatório de Tarefas e Gamificação**:
     - Taxa de conclusão de tarefas no prazo vs. atrasadas/auditadas;
     - Evolução de pontos por morador e histórico de **"Morador do Mês"**.
   - **Relatório de Ocorrências e Eventos**:
     - Resumo de problemas no imóvel (*Abertos*, *Em Manutenção*, *Resolvidos*) e utilização de espaços comuns.
3. O sistema processa os indicadores e renderiza os gráficos interativos na tela, permitindo exportar o resumo em PDF (`[RI008]`).

---

## 2. Fluxos de Exceção

- **FE1 — Período inválido**: Caso a data de início selecionada seja posterior à data de término, o sistema exibe alerta de validação e solicita o ajuste do intervalo.
