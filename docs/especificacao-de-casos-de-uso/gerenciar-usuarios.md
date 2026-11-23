# Caso de Uso [UC04]: Gerenciar Moradores e Administração da República

- **Requisitos Relacionados**: `[RF006]`
- **Regras de Negócio**: `[RN001]`, `[RN002]`, `[RN003]`
- **Atores**: Administrador da República (`ROLE_ADMIN`) e Morador (`ROLE_MORADOR`, no caso de auto-desligamento)
- **Pré-condições**: O usuário deve estar autenticado e vinculado à república ativa.
- **Pós-condições**: As configurações de membros, valores de mensalidade individual, código de convite ou titularidade da administração são atualizadas no sistema.

---

## 1. Fluxo Principal — Configurar Mensalidade e Dados do Morador

1. O Administrador acessa o menu **"República > Gerenciar Moradores"**.
2. O sistema lista todos os moradores ativos da república, exibindo o papel (`Admin` ou `Morador`), o quarto/vaga ocupado, a data de entrada, o valor de sua **Mensalidade Fixa Base** e sua situação financeira atual (*Em dia*, *Mensalidade Pendente* ou *Reembolso a Receber*).
3. O Administrador seleciona um morador para editar sua **Mensalidade Fixa Base** (ex.: ajustando o valor conforme quarto individual vs. quarto compartilhado) ou identificação do quarto.
4. O Administrador salva as alterações e o sistema atualiza o valor base para os próximos ciclos mensais de cobrança (`[RN006]`).

---

## 2. Fluxos Alternativos e de Exceção

- **FA1 — Gerar ou Renovar Código de Convite**:
  1. Na tela de Gerenciar Moradores, o Administrador clica em **"Regenerar Código de Convite"**.
  2. O sistema invalida o código anterior, gera um novo código único e disponibiliza o botão de compartilhamento rápido (WhatsApp / Copiar Link).
- **FA2 — Transferir Administração ou Promover Co-Administrador (`[RN002]`)**:
  1. O Administrador seleciona um morador ativo e aciona a opção **"Tornar Administrador"** (ou **"Transferir Administração"**).
  2. O sistema solicita confirmação de segurança e atualiza o papel do morador selecionado para `ROLE_ADMIN`.
- **FA3 — Desligar / Remover Morador da República (`[RN003]`)**:
  1. O Administrador seleciona a opção **"Remover da República"** para um morador que está se mudando (ou o próprio morador solicita **"Sair da República"**).
  2. O sistema verifica automaticamente se o morador possui mensalidades em aberto, cotas de rateio pendentes ou reembolsos aprovados ainda não pagos (`[RN003]`).
  3. Não havendo pendências financeiras, o sistema encerra o vínculo ativo do morador (`ativo = false`), retira-o dos futuros rodízios de tarefas e preserva seu histórico passado de transações e rankings.
- **FA4 — Saída do Único Administrador com Sucessão Automática (`[RN002]`)**:
  1. Caso o morador que está saindo da república seja o único `ROLE_ADMIN` ativo (e não possua pendências financeiras), o sistema identifica automaticamente o **morador ativo mais antigo da república** (`MIN(data_entrada)`).
  2. O sistema promove automaticamente esse morador mais antigo para `ROLE_ADMIN` e notifica toda a república sobre o novo Administrador. Se não restar nenhum morador ativo na casa, a república é marcada como `ARQUIVADA`.
- **FE1 — Tentativa de Remover/Sair com Pendências Financeiras (`[RN003]`)**:
  1. Se o sistema detectar que o morador possui mensalidade não paga ou reembolso aprovado pendente de liquidação, o sistema **bloqueia** o desligamento (`HTTP 422`) e exibe o alerta detalhado com os valores pendentes, orientando a liquidação antes de concluir a saída.
