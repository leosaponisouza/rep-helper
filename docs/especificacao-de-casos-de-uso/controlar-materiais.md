# Caso de Uso [UC08]: Controlar Materiais e Lista de Compras Integrada

- **Requisitos Relacionados**: `[RF013]`, `[RF014]`
- **Regras de Negócio**: `[RN005]`, `[RN007]`, `[RN015]`
- **Atores**: Morador (`ROLE_MORADOR`) / Administrador (`ROLE_ADMIN`)
- **Pré-condições**: O usuário deve estar autenticado e vinculado a uma república ativa.
- **Pós-condições**: O estoque de materiais da casa e a Lista de Compras são atualizados e, opcionalmente, uma solicitação de reembolso é gerada automaticamente no módulo Financeiro.

---

## 1. Fluxo Principal — Cadastrar e Consumir Material (Gerando Alerta de Lista de Compras)

1. O usuário acessa a tela **"Estoque & Compras"**, dividida em duas abas: **"Estoque da Casa"** e **"Lista de Compras"**.
2. Na aba **"Estoque da Casa"**, o usuário visualiza os itens compartilhados (ex.: *Arroz 5kg*, *Detergente*, *Papel Higiênico*, *Sabão em Pó*) com sua quantidade atual e quantidade mínima configurada.
3. Quando um produto acaba ou é consumido no dia a dia, o morador reduz a quantidade (ou clica no botão rápido **"Acabou / Em Falta"** ao lado do item).
4. Assim que a quantidade atual fica menor ou igual à quantidade mínima (`[RN007]`), o sistema altera o status do item para `EM_FALTA`, inclui o item automaticamente na aba **"Lista de Compras"** e notifica a república.

---

## 2. Fluxo Alternativo — Reposição da Lista de Compras Integrada ao Pedido de Reembolso (`RF014`)

*(Cenário: um morador vai ao supermercado, compra os itens que estavam na Lista de Compras com seu próprio dinheiro e registra a entrada no aplicativo).*

1. O morador acessa a aba **"Lista de Compras"**, seleciona os itens que acabou de comprar no mercado e clica em **"Registrar Compra / Reposição"**.
2. O morador informa as quantidades adquiridas de cada item.
3. No mesmo modal, o morador marca a opção **"Comprei com meu dinheiro — Solicitar Reembolso ao Caixa"** (`[RN007]`), preenchendo:
   - **Valor total pago na nota (`R$`)**;
   - **Foto da nota fiscal / cupom**;
   - **Preferência de reembolso**: `Receber via Pix do Caixa` ou `Abater na próxima mensalidade` (`[RN005]`).
4. Ao confirmar, o sistema executa de forma integrada:
   - Atualiza o estoque dos itens comprados (retirando-os da Lista de Compras); e
   - Cria automaticamente a **Solicitação de Reembolso (`[RF009]`)** para aprovação do Administrador.
