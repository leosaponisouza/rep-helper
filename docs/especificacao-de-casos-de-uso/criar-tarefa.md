# Caso de Uso [UC09]: Criar, Concluir e Auditar Tarefas Domésticas (Gamificação e Ranking)

- **Requisitos Relacionados**: `[RF015]`, `[RF016]`, `[RF017]`, `[RF018]`
- **Regras de Negócio**: `[RN008]`, `[RN009]`, `[RN010]`, `[RN011]`
- **Atores**: Morador (`ROLE_MORADOR`) e Administrador (`ROLE_ADMIN`)
- **Pré-condições**: O usuário deve estar autenticado e vinculado a uma república ativa.
- **Pós-condições**: A tarefa é criada, atribuída (com ou sem rodízio), concluída com crédito de pontos no Ranking Mensal ou auditada com estorno de pontos pelo Administrador.

---

## 1. Fluxo Principal — Criar e Concluir Tarefa Doméstica (`RF015`, `RF016`)

1. O usuário acessa **"Tarefas & Ranking"** e clica em **"Nova Tarefa"**.
2. O usuário preenche os dados da tarefa:
   - **Título e Descrição** (ex.: *Faxina completa do banheiro principal*);
   - **Nível de Dificuldade e Pontuação (`[RN009]`)**:
     - `Fácil` (10 pts), `Média` (25 pts) ou `Difícil` (50 pts);
   - **Data/Hora de Vencimento**;
   - **Tipo de Recorrência**: *Única* ou *Recorrente* (Diária, Semanal, Quinzenal, Mensal);
   - **Atribuição / Rodízio (`[RN008]`)**: Seleciona um morador específico ou ativa o **"Rodízio Automático"**, definindo a fila de moradores participantes.
3. O sistema salva a tarefa e notifica o morador responsável pelo ciclo atual.
4. Após realizar a atividade doméstica, o morador responsável acessa a tarefa, anexa opcionalmente uma foto da tarefa pronta e clica em **"Marcar como Concluída"**.
5. O sistema altera o status da tarefa para `CONCLUIDA`, credita imediatamente os pontos correspondentes no saldo do morador no **Ranking Mensal vigente (`[RN010]`)** e, caso seja uma tarefa recorrente com rodízio, agenda automaticamente o próximo ciclo para o próximo morador da fila (`[RN008]`).

---

## 2. Fluxos Alternativos

- **FA1 — Administrador Audita Tarefa e Estorna Pontos (`RF017` / `[RN010]`)**:
  *(Cenário: um morador marcou a tarefa como concluída para ganhar pontos, mas não limpou o cômodo adequadamente).*
  1. O Administrador acessa o histórico de tarefas concluídas, seleciona a tarefa em questão e clica em **"Contestar / Reabrir Tarefa (Auditoria)"**.
  2. O Administrador informa o motivo da contestação (ex.: *"O lixo do banheiro não foi retirado e o box não foi lavado"*).
  3. O sistema retorna o status da tarefa para `REABERTA_AUDITORIA`, **estorna (subtrai)** imediatamente os pontos que haviam sido creditados ao morador no Ranking Mensal e envia uma notificação de alerta ao responsável.
- **FA2 — Consultar Ranking Mensal e Fechamento do "Morador do Mês" (`RF018` / `[RN011]`)**:
  1. Qualquer morador acessa a aba **"Ranking Mensal"** para visualizar a classificação atual dos moradores da república, a recompensa do mês e o histórico de vencedores dos meses anteriores.
  2. No último dia de cada mês às `23:59:59`, o sistema encerra automaticamente o ciclo mensal, registra o líder como **"Morador do Mês"** no histórico permanente da casa e reinicia as pontuações do novo mês em zero (`[RN011]`).

---

## 3. Fluxos de Exceção

- **FE1 — Data de vencimento no passado**: Na criação da tarefa (passo 2), se o usuário informar uma data/hora anterior ao momento atual, o sistema exibe mensagem de erro e solicita uma data futura válida.
