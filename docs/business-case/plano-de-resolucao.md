# Plano de Resolução

Para solucionar os problemas identificados na gestão de moradias compartilhadas, o **RepHelper** implementa uma plataforma web responsiva (PWA) estruturada em fluxos operacionais claros e interconectados:

## Pilares da Solução

1. **Governança e Caixa Comunitário Centralizado**:
   - Um morador cria a república no sistema (assumindo o papel de `ROLE_ADMIN`) e convida os demais moradores por código/link.
   - O Administrador define a mensalidade fixa de cada morador/quarto. Os pagamentos mensais confirmados abastecem o **Caixa Comunitário**, de onde saem os pagamentos das contas fixas da casa (aluguel, energia, água, internet) e os reembolsos.
2. **Fluxo Ágil de Compras e Reembolsos**:
   - Quando um morador compra algo para a casa com recursos próprios (ex.: um chuveiro novo ou itens da lista de compras), registra a despesa com comprovante.
   - O Administrador aprova a compra e realiza o reembolso diretamente pelo saldo do Caixa Comunitário (via Pix) ou aplica o abatimento automático na próxima mensalidade daquele morador. Caso haja uma despesa extraordinária, é possível lançar um **Rateio Extra**.
3. **Controle de Materiais Integrado**:
   - Os moradores controlam a entrada e saída de mantimentos e produtos de limpeza. Itens em falta alimentam a **Lista de Compras da Casa**, e a reposição de um item permite gerar imediatamente a solicitação de reembolso.
4. **Rotina Doméstica Gamificada**:
   - Tarefas únicas ou recorrentes (com rodízio automático) atribuem pontos conforme a dificuldade. Ao concluir tarefas, o morador sobe no **Ranking Mensal**, com auditoria do Admin para evitar marcações indevidas.
5. **Preservação do Imóvel e Convivência Democrática**:
   - Registro fotográfico de problemas estruturais no imóvel com exportação de relatório para a imobiliária, calendário de eventos e reservas de espaços comuns sem conflito de horário, além de votações internas com prazo definido.
