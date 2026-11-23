# Plano de Testes e Critérios de Aceitação (BDD)

Este documento especifica a estratégia de testes automatizados (unitários, integração e ponta a ponta) e os **Critérios de Aceitação no formato BDD (*Behavior-Driven Development* — Dado / Quando / Então)** para validar todas as **Regras de Negócio (`RN001` a `RN018`)** do **RepHelper**.

---

## 1. Estratégia e Pirâmide de Testes

| Nível de Teste | Ferramentas Utilizadas | Escopo de Validação |
| :--- | :--- | :--- |
| **1. Testes Unitários de Domínio (Base)** | **JUnit 5 + Mockito + AssertJ** (Java / Spring Boot) | Validação isolada de todas as 18 Regras de Negócio (`RN001`–`RN018`), cálculos de abatimento de mensalidade, saldo do caixa, rodízio de tarefas e pontuação. |
| **2. Testes de Integração de API e Banco** | **Spring Boot Test (`@SpringBootTest`, `MockMvc`) + Testcontainers (PostgreSQL)** | Testa transações `@Transactional`, constraints SQL (`uk_usuario_uma_republica_ativa`), segurança RBAC (`ROLE_ADMIN` vs. `ROLE_MORADOR`) e isolamento por `republica_id`. |
| **3. Testes de Interface e Fluxo E2E** | **Vitest + React Testing Library / Playwright** | Validação dos fluxos principais no front-end React PWA (responsividade mobile, formulários e estados de erro). |

---

## 2. Catálogo de Cenários de Aceitação (BDD — Gherkin)

### Cenário 01: Impedir vínculo simultâneo em duas repúblicas (`[RN001]`)
- **Dado** que o usuário `"Lucas"` já é morador ativo da `"República Alpha"`
- **Quando** `"Lucas"` tenta criar uma nova república ou ingressar na `"República Beta"` via código de convite
- **Então** a API deve retornar `HTTP 422 Unprocessable Entity` (ou `409 Conflict`) com a mensagem `"Você já pertence a uma república ativa"` e manter apenas o vínculo original.

---

### Cenário 02: Sucessão automática de Administrador para o morador mais antigo (`[RN002]`)
- **Dado** que `"Gabriel"` é o único `ROLE_ADMIN` ativo da `"República Vila"` e não possui pendências financeiras
- **E** que a república possui os moradores ativos `"Mateus"` (entrou em `10/01/2026`) e `"Rafael"` (entrou em `15/03/2026`)
- **Quando** `"Gabriel"` confirma sua saída da república
- **Então** o vínculo de `"Gabriel"` passa para `ativo = false`
- **E** `"Mateus"` (morador ativo mais antigo) é promovido automaticamente para `ROLE_ADMIN` e notificado.

---

### Cenário 03: Bloqueio de saída de morador com pendência financeira (`[RN003]`)
- **Dado** que o morador `"Pedro"` possui a mensalidade do mês corrente com status `PENDENTE` (ou um reembolso aprovado ainda não pago)
- **Quando** o Administrador tenta remover `"Pedro"` da república
- **Então** o sistema bloqueia o desligamento (`HTTP 422`) e informa exatamente quais mensalidades ou reembolsos precisam ser liquidados antes da saída.

---

### Cenário 04: Reembolso de compra aprovado com Abatimento na Mensalidade (`[RN005]`, `[RN006]`)
- **Dado** que a mensalidade fixa base do morador `"Thiago"` é `R$ 700,00`
- **E** que `"Thiago"` comprou um chuveiro para a casa por `R$ 150,00` do próprio bolso e solicitou reembolso na modalidade `DESCONTO_MENSALIDADE`
- **Quando** o Administrador aprova a solicitação de reembolso de `"Thiago"` nessa modalidade
- **Então** o saldo líquido do Caixa Comunitário permanece inalterado no momento da aprovação
- **E** a mensalidade em aberto de `"Thiago"` passa a exibir `Valor Base: R$ 700,00`, `Desconto de Reembolso: -R$ 150,00` e `Valor Líquido a Pagar: R$ 550,00`.

---

### Cenário 05: Reembolso de compra aprovado via Pix saindo do Caixa (`[RN004]`, `[RN005]`)
- **Dado** que o saldo atual do Caixa Comunitário é `R$ 2.000,00`
- **Quando** o Administrador aprova e liquida um reembolso de `R$ 120,00` na modalidade `PIX_CAIXA`
- **Então** o saldo do Caixa Comunitário passa atomicamente para `R$ 1.880,00`
- **E** um registro imutável do tipo `SAIDA_REEMBOLSO_PIX` é gravado no Livro-Caixa (`transacao_caixa`).

---

### Cenário 06: Ajuste Manual de Saldo do Caixa com Auditoria Obrigatória (`[RN004]`, `[RN018]`)
- **Dado** que o Administrador precisa ajustar o saldo do Caixa Comunitário em `+ R$ 50,00`
- **Quando** o Administrador envia o ajuste com justificativa vazia ou menor que 15 caracteres
- **Então** o sistema rejeita a operação (`HTTP 400 Bad Request`)
- **Mas quando** informa a justificativa `"Diferença de troco da manutenção elétrica conferida em reunião"`
- **Então** o sistema atualiza o saldo e grava a transação `AJUSTE_MANUAL_CREDITO` visível para todos os moradores no extrato.

---

### Cenário 07: Compra de itens da Lista de Compras gerando Reembolso Integrado (`[RN007]`)
- **Dado** que os itens `"Detergente"` e `"Sabão em Pó"` estão marcados como `em_falta = true` na Lista de Compras
- **Quando** o morador registra a compra do lote informando `R$ 42,90`, foto do cupom fiscal e marca `solicitarReembolso = true`
- **Então** os itens têm seu estoque somado, saem da Lista de Compras (`em_falta = false`) e uma `solicitacao_reembolso` de `R$ 42,90` com status `PENDENTE_APROVACAO` é criada na mesma transação.

---

### Cenário 08: Conclusão de Tarefa Gamificada, Auditoria pelo Admin e Estorno (`[RN008]`, `[RN009]`, `[RN010]`)
- **Dado** que o morador `"André"` possui `100 pontos` no Ranking Mensal e conclui uma tarefa de dificuldade `DIFICIL` (`50 pontos`)
- **Quando** `"André"` marca a tarefa como `CONCLUIDA`
- **Então** sua pontuação sobe imediatamente para `150 pontos` (e a próxima instância da tarefa no rodízio é criada para o próximo morador da fila)
- **Mas quando** o Administrador audita a tarefa concluída e aciona a contestação informando que a limpeza não foi feita
- **Então** a execução da tarefa volta para `REABERTA_AUDITORIA` e os `50 pontos` são **estornados imediatamente**, retornando o saldo de `"André"` para `100 pontos`.

---

### Cenário 09: Bloqueio de Conflito de Horário em Espaço Comum (`[RN013]`)
- **Dado** que a `"Churrasqueira"` já possui reserva confirmada no dia `15/11` das `18:00` às `22:00`
- **Quando** outro morador tenta reservar a `"Churrasqueira"` no dia `15/11` das `20:00` às `23:30`
- **Então** o sistema rejeita o agendamento (`HTTP 409 Conflict`) informando o conflito de horário.

---

### Cenário 10: Unicidade e Prazo de Voto em Enquetes (`[RN014]`)
- **Dado** que existe uma votação `ABERTA` na república com prazo até amanhã às `20:00`
- **Quando** um morador vota na `"Opção A"` e depois decide mudar seu voto para a `"Opção B"` antes do encerramento
- **Então** o sistema substitui o voto anterior na tabela `voto_morador`, mantendo exatamente 1 voto computado para aquele morador.

