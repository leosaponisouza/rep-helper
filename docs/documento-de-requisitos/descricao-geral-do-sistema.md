# Descrição Geral do Sistema

O **RepHelper** é um sistema web responsivo (**PWA**) que automatiza e centraliza a gestão financeira, operacional e de convivência de repúblicas estudantis.

## 1. Funcionamento Geral por Domínio

1. **Governança da República**: Um morador cria a república no aplicativo e torna-se automaticamente seu **Administrador (`ROLE_ADMIN`)**. Os demais moradores ingressam por meio de um **código/link de convite** gerado pelo Administrador. Cada usuário pode pertencer a apenas **1 república ativa por vez**.
2. **Modelo Financeiro (Caixa Comunitário + Mensalidades + Reembolsos)**:
   - A república mantém um **Caixa Comunitário** (saldo/poupança da casa).
   - O Administrador configura o valor da **mensalidade fixa** de cada morador/quarto. Mensalmente, os moradores pagam sua mensalidade (anexando comprovante Pix) e, após confirmação do Admin, o valor é somado ao Caixa Comunitário.
   - O Administrador registra as **saídas diretas do caixa** para pagar as contas estruturais da casa (aluguel, energia, água, internet, gás).
   - Quando um morador compra algo para a casa do próprio bolso (ex.: um chuveiro, itens de limpeza ou mercado), ele lança a compra com comprovante e solicita **reembolso**. O Admin aprova a compra e escolhe como reembolsar: **(a) transferência via Pix saindo do Caixa Comunitário**, ou **(b) desconto/abatimento automático na próxima mensalidade** daquele morador.
   - Para despesas extraordinárias que o Caixa não comporte (ex.: festa ou reparo emergencial), o Admin pode criar um **Rateio Extra** entre os moradores selecionados.
3. **Estoque e Lista de Compras Integrada**: Os moradores controlam os materiais da casa (alimentos compartilhados, limpeza, higiene). Quando um item fica em falta, entra na **Lista de Compras**. Ao registrar a compra/entrada de itens da lista, o morador pode gerar no mesmo fluxo o pedido de reembolso ao Caixa.
4. **Tarefas e Gamificação**: As tarefas domésticas podem ser únicas ou recorrentes (com rodízio automático entre moradores) e possuem pontos segundo a dificuldade. A conclusão credita os pontos na hora, mas o Admin pode auditar/reabrir a tarefa e estornar os pontos se necessário. Todo mês o ranking é apurado, consagrando o **"Morador do Mês"** antes de resetar para o ciclo seguinte.
5. **Problemas no Imóvel**: Os moradores registram problemas estruturais/técnicos com fotos, urgência e status (*Aberto*, *Em Manutenção*, *Resolvido*), podendo exportar um relatório em PDF/link para enviar à imobiliária ou proprietário.
6. **Eventos, Espaços Comuns e Votações**: Qualquer morador pode reservar espaços comuns ou agendar eventos (com bloqueio automático de conflitos de horário no mesmo espaço) e abrir votações/enquetes com prazo de encerramento.

## 2. Escopo Negativo

O projeto **não** contempla:
- Processamento bancário direto (não é um banco nem gateway de pagamento; utiliza chaves Pix e comprovantes auditáveis).
- Login ou painel exclusivo para proprietários/imobiliárias (que recebem apenas os relatórios exportados pelos moradores).
- Busca de imóveis para locação ou anúncio de vagas para novos moradores externos.
- Suporte a múltiplas repúblicas simultâneas para uma mesma conta de usuário ativa.
