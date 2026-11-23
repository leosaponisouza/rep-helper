# Caso de Uso [UC12]: Visualizar Calendário Unificado da República

- **Requisitos Relacionados**: `[RF022]`
- **Regras de Negócio**: `[RN015]`
- **Atores**: Morador (`ROLE_MORADOR`) / Administrador (`ROLE_ADMIN`)
- **Pré-condições**: O usuário deve estar autenticado e vinculado a uma república ativa.
- **Pós-condições**: O usuário visualiza de forma consolidada todos os compromissos da casa (eventos, reservas de espaços, vencimentos de mensalidade e tarefas domésticas).

---

## 1. Fluxo Principal

1. O usuário acessa o menu **"Calendário"**.
2. O sistema carrega e exibe o calendário da república (permitindo alternar entre as visões **Mensal**, **Semanal** e **Lista/Agenda Diária**).
3. Cada categoria de compromisso é diferenciada por cores e ícones semânticos (`[RI004]`):
   - 🟦 **Eventos da Casa e Reuniões**;
   - 🟪 **Reservas de Espaços/Equipamentos Comuns** (Churrasqueira, Lavanderia, etc.);
   - 🟩 **Tarefas Domésticas agendadas** (com filtro rápido para *"Apenas minhas tarefas"* ou *"Todas da casa"*);
   - 🟨 **Data de Vencimento da Mensalidade Fixa e Rateios Extras**.
4. Ao clicar em qualquer item do calendário, o sistema abre um modal com os detalhes completos (responsável, horário, espaço reservado ou atalho para concluir a tarefa / pagar a mensalidade).
