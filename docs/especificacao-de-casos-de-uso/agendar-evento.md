# Caso de Uso [UC11]: Agendar Evento e Reservar Espaço Comum

- **Requisitos Relacionados**: `[RF021]`
- **Regras de Negócio**: `[RN013]`, `[RN015]`
- **Atores**: Morador (`ROLE_MORADOR`) / Administrador (`ROLE_ADMIN`)
- **Pré-condições**: O usuário deve estar autenticado e vinculado a uma república ativa.
- **Pós-condições**: O evento ou reserva de espaço comum é agendado sem conflitos de horário e exibido no Calendário Unificado da república, notificando os participantes.

---

## 1. Fluxo Principal

1. O morador acessa **"Calendário > Novo Agendamento"**.
2. O morador seleciona o tipo de registro: **"Reserva de Espaço/Equipamento Comum"** (ex.: *Churrasqueira*, *Sala de TV*, *Máquina de Lavar*) ou **"Evento da República"** (ex.: *Reunião Geral da Casa*, *Jantar de Confraternização*).
3. O morador preenche os campos obrigatórios:
   - **Título e Descrição**;
   - **Espaço Comum utilizado** (selecionado da lista de espaços da república);
   - **Data, Hora de Início e Hora de Término**;
   - **Moradores participantes** (ou marca *"Todos os moradores da casa"*).
4. O morador clica em **"Confirmar Agendamento"**.
5. O sistema verifica no banco de dados se já existe alguma reserva ativa para o mesmo **Espaço Comum** com interseção no intervalo de horário informado (`[RN013]`).
6. Não havendo conflito, o sistema grava o agendamento, inclui o compromisso no Calendário Unificado (`[UC12]`) e envia notificação aos participantes.

---

## 2. Fluxos Alternativos e de Exceção

- **FE1 — Conflito de horário no mesmo Espaço Comum (`[RN013]`)**: No passo 5, caso o espaço selecionado já esteja reservado em horário sobreposto, o sistema bloqueia o agendamento e exibe a mensagem detalhada: *"Conflito de horário: o espaço [Nome do Espaço] já está reservado por [Nome do Morador] das [HH:mm] às [HH:mm] nesta data"*.
- **FE2 — Horário de término anterior ou igual ao início**: Caso a hora de término seja menor ou igual à hora de início, o formulário exibe alerta de validação e impede o envio.
