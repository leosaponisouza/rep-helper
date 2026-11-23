# Caso de Uso [UC06]: Pagar Mensalidade Fixa e Aprovar/Liquidar Reembolsos

- **Requisitos Relacionados**: `[RF007]`, `[RF010]`, `[RF011]`
- **Regras de Negócio**: `[RN004]`, `[RN005]`, `[RN006]`, `[RN016]`
- **Atores**: Morador (`ROLE_MORADOR`) e Administrador (`ROLE_ADMIN`)
- **Pré-condições**: Existir uma mensalidade fixa do mês (ou cota de rateio extra) em aberto para o morador, ou existir uma solicitação de reembolso com status `PENDENTE_APROVACAO` para o Administrador.
- **Pós-condições**: A mensalidade ou reembolso é liquidado, atualizando de forma atômica o saldo do **Caixa Comunitário** (`[RN004]`) ou o crédito de abatimento na mensalidade do morador (`[RN006]`).

---

## 1. Fluxo Principal — Pagamento e Confirmação da Mensalidade Fixa (`RF007`)

1. O morador acessa **"Finanças > Minha Mensalidade"**, onde visualiza o detalhamento do mês vigente:
   - **Valor Base da Mensalidade** (conforme seu quarto/vaga);
   - **Descontos/Abatimentos de Reembolsos Aprovados** (`- R$ X,XX`, conforme `[RN006]`);
   - **Valor Líquido a Pagar**;
   - Botão **"Copiar Chave Pix do Caixa"** (`[RI007]`).
2. O morador realiza o Pix no aplicativo de seu banco, anexa o comprovante de pagamento no RepHelper e clica em **"Informar Pagamento"**.
3. O status da mensalidade muda para `AGUARDANDO_CONFIRMACAO` e o Administrador é notificado.
4. O Administrador acessa a pendência, confere o comprovante anexado e clica em **"Confirmar Recebimento"**.
5. O sistema muda o status da mensalidade para `PAGA`, soma o valor líquido recebido ao saldo do **Caixa Comunitário** (`[RN004]`), registra a entrada no Livro-Caixa e notifica o morador.

---

## 2. Fluxo Alternativo — Administrador Aprova e Liquida Reembolso de Morador (`RF010`)

1. O Administrador acessa **"Finanças > Reembolsos Pendentes"** e seleciona a solicitação enviada por um morador (ex.: compra de um chuveiro de `R$ 120,00`).
2. O Administrador confere a nota fiscal/comprovante anexado e clica em **"Aprovar Reembolso"**, escolhendo a modalidade de liquidação (`[RN005]`):
   - **Opção A — Reembolsar via Pix a partir do Caixa (`PIX_CAIXA`)**:
     1. O sistema exibe um botão para copiar a Chave Pix pessoal do morador solicitante.
     2. O Administrador realiza a transferência a partir do caixa da casa, anexa o comprovante (opcional) e confirma.
     3. O sistema debita `R$ 120,00` do saldo do **Caixa Comunitário**, registra a saída no Livro-Caixa e marca o reembolso como `LIQUIDADO_PIX`.
   - **Opção B — Abater na Próxima Mensalidade (`DESCONTO_MENSALIDADE`)**:
     1. O Administrador seleciona **"Descontar na Mensalidade do Morador"**.
     2. O sistema marca o reembolso como `LIQUIDADO_ABATIMENTO` e aplica imediatamente o desconto de `R$ 120,00` na mensalidade em aberto (ou do mês seguinte) daquele morador (`[RN006]`), sem retirar dinheiro líquido imediato do Caixa.

---

## 3. Fluxos de Exceção

- **FE1 — Comprovante de Mensalidade Inválido / Divergente**: No passo 4 do Fluxo Principal, se o comprovante enviado pelo morador estiver ilegível ou com valor incorreto, o Administrador clica em **"Recusar Comprovante"**, informa o motivo e a mensalidade retorna ao status `PENDENTE` notificando o morador.
- **FE2 — Rejeição de Pedido de Reembolso**: Se a compra lançada pelo morador não for autorizada pela casa, o Administrador clica em **"Rejeitar Solicitação"**, informa a justificativa obrigatória e o pedido passa para `REJEITADO` sem impacto no Caixa.
