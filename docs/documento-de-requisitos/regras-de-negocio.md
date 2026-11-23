# Regras de Negócio

As Regras de Negócio (`[RNxxx]`) definem as políticas invariantes, validações e cálculos que o back-end (**Spring Boot**) e o front-end (**React**) devem impor em todas as operações do **RepHelper**.

---

## 1. Governança da República e Membros

### [RN001] Unicidade de República Ativa por Usuário
Um usuário só pode estar vinculado como membro ativo a **1 (uma) república por vez**. Para criar uma nova república ou ingressar em outra via código de convite, o usuário não pode possuir vínculo ativo com nenhuma república.

### [RN002] Papéis e Sucessão Automática de Administração
Existem apenas dois papéis de acesso dentro de uma república: **Morador (`ROLE_MORADOR`)** e **Administrador (`ROLE_ADMIN`)**.
- O criador da república recebe automaticamente o papel `ROLE_ADMIN`.
- O Administrador atual pode promover outro morador a `ROLE_ADMIN` ou transferir sua administração a qualquer momento.
- **Sucessão Automática**: Caso o único Administrador ativo (`ROLE_ADMIN`) se desligue da república (após quitar eventuais pendências financeiras — `[RN003]`), o sistema **promove automaticamente o morador ativo mais antigo da república** (menor `data_entrada`) para o papel `ROLE_ADMIN`, notificando todos os membros. Caso não reste nenhum morador ativo, a república passa para o status `ARQUIVADA`.

### [RN003] Bloqueio de Desligamento com Pendências Financeiras
Um morador não pode sair da república nem ser removido pelo Administrador caso possua:
1. Mensalidades fixas ou cotas de rateio extra vencidas/em aberto; ou
2. Solicitações de reembolso aprovadas e ainda não liquidadas pelo Caixa.
O Administrador deve primeiro quitar ou cancelar/abater formalmente as pendências para concluir o desligamento (mantendo o histórico contábil preservado para auditoria do Caixa).

---

## 2. Caixa Comunitário, Mensalidades e Reembolsos

### [RN004] Composição do Saldo do Caixa Comunitário e Ajustes Auditáveis
O saldo atual do **Caixa Comunitário** da república é calculado de forma transacional pela fórmula:
$$\text{Saldo do Caixa} = \text{Saldo Inicial} + \sum \text{Mensalidades Pagas} + \sum \text{Ajustes/Entradas Extras} - \sum \text{Saídas Diretas do Caixa} - \sum \text{Reembolsos via Pix} - \sum \text{Ajustes de Débito}$$
- Na criação da república (`[RF004]`), o Administrador pode informar um **Saldo Inicial do Caixa** ($\ge \text{R\$ } 0,00$) para refletir o valor que a casa já possui em caixa antes de adotar o sistema.
- O Administrador pode registrar um **Ajuste Manual de Saldo** (crédito ou débito avulso), sendo **obrigatório** informar uma justificativa detalhada (mínimo de 15 caracteres), que fica gravada de forma imutável no Livro-Caixa (`transacao_caixa`) e visível no extrato para todos os moradores (`[RN018]`).

### [RN005] Fluxo e Modalidades de Reembolso de Compras
Quando um morador adquire um item para a república com recursos próprios, deve registrar a solicitação de reembolso anexando obrigatoriamente o comprovante/nota fiscal e o valor maior que zero (`> R$ 0,00`).
- A solicitação nasce com status `PENDENTE_APROVACAO`.
- Apenas um usuário com `ROLE_ADMIN` pode aprovar ou rejeitar a solicitação.
- Ao aprovar, o Administrador define a modalidade de liquidação:
  1. **`PIX_CAIXA`**: O Administrador realiza a transferência para a chave Pix do morador, confirma o pagamento e o valor é debitado imediatamente do saldo do Caixa Comunitário; ou
  2. **`DESCONTO_MENSALIDADE`**: O valor aprovado não retira dinheiro imediato do Caixa, mas gera um crédito vinculado ao morador que é abatido automaticamente do valor de sua próxima mensalidade fixa (`[RN006]`).

### [RN006] Cálculo do Valor Líquido da Mensalidade Fixa
O valor a pagar da mensalidade mensal de um morador é calculado como:
$$\text{Valor Líquido da Mensalidade} = \max\left(0,\; \text{Valor Base do Morador/Quarto} - \sum \text{Créditos de Reembolso Aprovados para Abatimento}\right)$$
Se o total de créditos de reembolso superar o valor base da mensalidade do mês corrente, o saldo remanescente de crédito do morador é transferido automaticamente para abater a mensalidade do mês subsequente (ou pode ser liquidado via Pix do Caixa pelo Admin).

---

## 3. Estoque de Materiais e Lista de Compras

### [RN007] Alerta de Estoque Baixo e Integração com Reembolso
- Sempre que a quantidade atual de um item do controle de materiais ficar menor ou igual à sua `quantidade_minima` (ou quando qualquer morador acionar o botão *"Acabou / Em Falta"*), o item passa automaticamente para o status `EM_FALTA` e é exibido na **Lista de Compras da República**.
- Ao registrar a entrada/compra de um ou mais itens da Lista de Compras, o morador pode marcar a opção *"Comprei do meu bolso — Solicitar Reembolso"*, o que cria automaticamente um registro em `[RF009]` vinculado aos itens repostos.

---

## 4. Tarefas Domésticas e Gamificação

### [RN008] Rodízio Automático em Tarefas Recorrentes
Para tarefas configuradas como recorrentes com rodízio ativo (`rodizio = true`), o sistema mantém uma fila ordenada de moradores participantes. Assim que a instância atual da tarefa é concluída (ou vence o ciclo), a próxima instância é gerada e atribuída automaticamente ao próximo morador da fila.

### [RN009] Pontuação por Nível de Dificuldade
Toda tarefa doméstica possui um nível de dificuldade associado a uma pontuação fixa para evitar distorções subjetivas:
- **Fácil**: `10 pontos` (ex.: tirar o lixo, regar plantas)
- **Média**: `25 pontos` (ex.: lavar a louça do almoço, limpar áreas externas leves)
- **Difícil**: `50 pontos` (ex.: faxina completa do banheiro, limpeza pesada da cozinha/fogão)

### [RN010] Crédito Imediato e Auditoria com Estorno de Pontos
- Ao marcar uma tarefa como `CONCLUIDA`, os pontos da tarefa são creditados imediatamente ao morador no Ranking Mensal vigente.
- Caso o Administrador verifique que a tarefa não foi realizada adequadamente, pode acionar a **Auditoria de Tarefa**, alterando seu status de volta para `REABERTA_AUDITORIA` e **estornando (subtraindo)** imediatamente os pontos que haviam sido creditados ao morador.

### [RN011] Fechamento Mensal do Ranking e "Morador do Mês"
Às `23:59:59` do último dia de cada mês calendário (via rotina agendada no servidor `@Scheduled`), o sistema:
1. Consolida o placar do mês que se encerra e registra o morador com maior pontuação (critério de desempate: maior número de tarefas difíceis concluídas sem contestação, seguido de menor número de atrasos) como **"Morador do Mês"** no histórico permanente da república;
2. Notifica todos os moradores sobre o vencedor e a recompensa configurada pela casa;
3. Inicia um novo ciclo mensal com a pontuação corrente zerada para todos os moradores.

---

## 5. Imóvel, Espaços Comuns e Votações

### [RN012] Ciclo de Vida dos Problemas no Imóvel
Todo problema registrado no imóvel transita pelos estados `ABERTO` $\rightarrow$ `EM_MANUTENCAO` $\rightarrow$ `RESOLVIDO`. Problemas resolvidos permanecem armazenados no histórico da república para fins de comprovação em vistorias futuras junto à imobiliária/proprietário.

### [RN013] Prevenção de Conflito de Horários em Espaços Comuns
Não é permitido agendar dois eventos ou reservas para o mesmo espaço/equipamento comum quando houver interseção de intervalos de tempo:
$$\text{Conflito se: } (\text{Início}_{\text{novo}} < \text{Fim}_{\text{existente}}) \;\land\; (\text{Fim}_{\text{novo}} > \text{Início}_{\text{existente}})$$
Eventos gerais da casa que não bloqueiam um espaço físico exclusivo podem coexistir no calendário.

### [RN014] Unicidade e Prazo de Voto em Enquetes
- Em cada votação/enquete aberta na república, cada morador ativo tem direito a **1 (um) único voto**.
- O morador pode alterar seu voto enquanto a enquete estiver com status `ABERTA` e dentro do `prazo_encerramento`.
- Após a data/hora de encerramento (ou quando todos os moradores ativos da república já tiverem votado), a enquete passa para `ENCERRADA` e não aceita novos votos nem alterações.

---

## 6. Segurança, Auditoria e Isolamento

### [RN015] Isolamento Multi-Tenant por República
Nenhum usuário (`ROLE_MORADOR` ou `ROLE_ADMIN`) pode visualizar, editar ou excluir registros (gastos, tarefas, materiais, eventos, votações ou problemas) pertencentes a outra república diferente daquela à qual está ativamente vinculado.

### [RN016] Validação de Arquivos de Upload
Arquivos enviados para comprovantes financeiros, fotos de conclusão de tarefas ou fotos de problemas no imóvel devem estar nos formatos `JPG`, `PNG`, `WEBP` ou `PDF` (este último apenas para comprovantes) e respeitar o tamanho máximo de **5 MB por arquivo**.

### [RN017] Políticas de Credenciais e Senha
O e-mail do usuário deve ser único no sistema. A senha deve conter no mínimo **8 caracteres**, incluindo pelo menos uma letra e um número, sendo armazenada exclusivamente sob hash **BCrypt**.

### [RN018] Imutabilidade do Livro-Caixa e Auditoria de Ajustes Manuais
Registros na tabela `transacao_caixa` são imutáveis (não podem ser editados nem excluídos fisicamente). Qualquer correção ou ajuste manual de saldo realizado pelo Administrador exige justificativa obrigatória e gera um lançamento compensatório explícito (`AJUSTE_MANUAL_CREDITO` ou `AJUSTE_MANUAL_DEBITO`) visível a todos os moradores da república.
