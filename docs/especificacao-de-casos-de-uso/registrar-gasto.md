# Caso de Uso [UC05]: Registrar Gastos, Saídas do Caixa, Solicitar Reembolso e Rateios

- **Requisitos Relacionados**: `[RF008]`, `[RF009]`, `[RF011]`
- **Regras de Negócio**: `[RN004]`, `[RN005]`, `[RN007]`, `[RN016]`, `[RN018]`
- **Atores**: Morador (`ROLE_MORADOR`) e Administrador (`ROLE_ADMIN`)
- **Pré-condições**: O usuário deve estar autenticado e vinculado a uma república ativa.
- **Pós-condições**: O lançamento financeiro (Pedido de Reembolso de morador, Saída Direta do Caixa Comunitário, Ajuste Manual Auditado ou Rateio Extra) é registrado e reflete no painel financeiro da república.

---

## 1. Fluxo Principal — Morador Solicita Reembolso de Compra (`RF009`)

*(Cenário: um morador comprou um item para a casa com dinheiro do próprio bolso — ex.: um chuveiro novo ou produtos de limpeza — e solicita ressarcimento ao Caixa da República).*

1. O morador acessa **"Finanças > Solicitar Reembolso"** (ou vem diretamente do fluxo de reposição da Lista de Compras em `[UC08]`).
2. O morador preenche os dados da compra realizada:
   - **Descrição da compra** (ex.: *Compra de resistência e chuveiro novo para o banheiro social*);
   - **Categoria** (*Manutenção/Imóvel*, *Mercado/Alimentos*, *Limpeza/Higiene*, *Utensílios*, *Outros*);
   - **Valor total gasto (`R$`)** e **Data da compra**;
   - **Foto da Nota Fiscal / Comprovante** (`[RN016]`);
   - **Forma preferida de reembolso**: `Receber via Pix do Caixa` ou `Descontar na minha próxima mensalidade` (`[RN005]`).
3. O morador confirma o envio clicando em **"Enviar para Aprovação do Admin"**.
4. O sistema salva a solicitação com status `PENDENTE_APROVACAO` e envia uma notificação ao Administrador da república para avaliação e liquidação (detalhada em `[UC06]`).

---

## 2. Fluxos Alternativos

- **FA1 — Administrador Registra Saída Direta do Caixa Comunitário (`RF008`)**:
  *(Cenário: o Administrador paga uma conta da casa — como aluguel, luz, água ou internet — usando diretamente o saldo do Caixa Comunitário).*
  1. O Administrador acessa **"Finanças > Caixa da Casa > Registrar Saída do Caixa"**.
  2. Informa descrição (ex.: *Conta de Energia CEMIG - Outubro*), categoria (*Contas Fixas / Aluguel*), valor, data de pagamento e anexa o comprovante.
  3. Ao confirmar, o sistema executa uma transação atômica (`[RNF004]`): registra a saída (`SAIDA_DIRETA_CAIXA`) no Livro-Caixa e subtrai o valor do saldo atual do **Caixa Comunitário** (`[RN004]`).
- **FA2 — Administrador Realiza Ajuste Manual Auditado no Caixa (`[RN004]`, `[RN018]`)**:
  *(Cenário: correção de diferença de centavos, entrada de doação/venda de item usado da casa ou ajuste contábil deliberado em reunião).*
  1. O Administrador acessa **"Finanças > Caixa da Casa > Ajuste Manual de Saldo"**.
  2. Seleciona o tipo (`Crédito / Entrada` ou `Débito / Saída`), informa o valor e preenche a **Justificativa Obrigatória** (mínimo de 15 caracteres).
  3. O sistema atualiza o saldo do Caixa Comunitário e grava um registro imutável (`AJUSTE_MANUAL_CREDITO` ou `AJUSTE_MANUAL_DEBITO`) no Livro-Caixa, ficando visível com a justificativa e o nome do Admin no extrato de todos os moradores.
- **FA3 — Administrador Cria um Rateio Extra Esporádico (`RF011`)**:
  *(Cenário: uma despesa extraordinária ou evento que não será pago pelo saldo do Caixa Comunitário e precisa ser dividido entre moradores).*
  1. O Administrador acessa **"Finanças > Novo Rateio Extra"**.
  2. Informa descrição, valor total, data de vencimento e seleciona quais moradores participarão do rateio (com divisão igualitária automática ou pesos personalizados).
  3. O sistema gera as cobranças individuais de cota extra para cada morador selecionado e os notifica.

---

## 3. Fluxos de Exceção

- **FE1 — Valor inválido ou igual/menor que zero**: Se o usuário informar um valor $\le \text{R\$ } 0,00$, o sistema impede o envio e solicita um valor monetário válido.
- **FE2 — Comprovante ausente ou em formato/tamanho inválido (`[RN016]`)**: Se o arquivo anexado exceder `5 MB` ou não for imagem (`JPG`, `PNG`, `WEBP`) ou `PDF`, o sistema exibe alerta explicativo e solicita novo arquivo.
- **FE3 — Ajuste manual sem justificativa (`[RN018]`)**: Se o Administrador tentar salvar um ajuste manual sem justificativa detalhada ($< 15$ caracteres), o sistema bloqueia a operação.
