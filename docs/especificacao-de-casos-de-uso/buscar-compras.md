# Caso de Uso [UC07]: Consultar Extrato do Caixa e Buscar Compras Realizadas

- **Requisitos Relacionados**: `[RF012]`
- **Regras de Negócio**: `[RN004]`, `[RN015]`
- **Atores**: Morador (`ROLE_MORADOR`) / Administrador (`ROLE_ADMIN`)
- **Pré-condições**: O usuário deve estar autenticado e vinculado a uma república ativa.
- **Pós-condições**: O sistema exibe o saldo consolidado do Caixa Comunitário e a lista filtrada de lançamentos, compras e comprovantes.

---

## 1. Fluxo Principal

1. O usuário acessa a tela **"Finanças > Extrato do Caixa e Compras"**.
2. O sistema exibe no topo o resumo financeiro atual da república:
   - **Saldo Atual do Caixa Comunitário**;
   - **Total de Entradas no Mês** (mensalidades pagas);
   - **Total de Saídas no Mês** (contas fixas da casa + reembolsos pagos a moradores).
3. O usuário aplica filtros de busca conforme sua necessidade:
   - **Período** (mês/ano ou intervalo de datas inicial e final);
   - **Tipo de Lançamento** (*Todos*, *Entradas de Mensalidade*, *Saídas Diretas do Caixa*, *Compras/Reembolsos de Moradores*, *Rateios Extras*);
   - **Categoria** (*Aluguel/Contas*, *Mercado/Alimentos*, *Limpeza*, *Manutenção*, etc.);
   - **Morador Responsável** ou termo textual na descrição.
4. O sistema consulta os registros da república (`[RN015]`) e exibe a listagem cronológica detalhada, permitindo clicar em qualquer lançamento para visualizar os detalhes e abrir a foto da nota fiscal/comprovante anexado.

---

## 2. Fluxos Alternativos

- **FA1 — Nenhum lançamento encontrado para os filtros**: Caso não existam transações que correspondam aos critérios selecionados, o sistema exibe um estado vazio informativo (*"Nenhum lançamento encontrado para o período e filtros selecionados"*) com botão para limpar os filtros.
