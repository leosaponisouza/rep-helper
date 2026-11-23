# Propósito e Escopo

## 1. Propósito

O **RepHelper** tem como propósito eliminar o atrito operacional, financeiro e interpessoal em repúblicas estudantis, oferecendo uma plataforma web responsiva (PWA) que centraliza a gestão do caixa comunitário, o reembolso de compras, o controle de estoque, a divisão gamificada de tarefas domésticas, a manutenção do imóvel e a tomada de decisões coletivas.

## 2. Escopo Positivo (Módulos do Sistema)

O escopo do projeto compreende sete módulos integrados:

1. **Autenticação, República e Membros**:
   - Cadastro e autenticação de usuários (JWT), recuperação de senha, criação de república (tornando o criador `ROLE_ADMIN`), ingresso de moradores via código/link de convite (limite de 1 república ativa por usuário), transferência de administração e desligamento com validação de pendências financeiras.
2. **Gestão Financeira (Caixa Comunitário, Mensalidades, Reembolsos e Rateios)**:
   - Configuração de mensalidades fixas por morador/quarto; confirmação de pagamento de mensalidades que abastecem o Caixa da República; registro de saídas diretas do caixa pelo Admin (aluguel, luz, água, internet); solicitação e aprovação de reembolso de compras feitas por moradores (via Pix do caixa ou desconto na próxima mensalidade); e criação de rateios extras esporádicos.
3. **Controle de Materiais e Lista de Compras Integrada**:
   - Inventário de insumos da casa (alimentos, limpeza, higiene), alerta de itens em falta compondo a Lista de Compras da República e registro de reposição com opção de gerar automaticamente o pedido de reembolso financeiro.
4. **Tarefas Domésticas e Gamificação**:
   - Criação e atribuição de tarefas únicas ou recorrentes (com rodízio automático entre moradores), pontuação baseada na dificuldade, conclusão com comprovação opcional por foto, auditoria/estorno pelo Admin e Ranking Mensal ("Morador do Mês") com histórico de conquistas e recompensa configurável.
5. **Manutenção e Problemas no Imóvel**:
   - Registro interno de avarias ou problemas estruturais com fotos, nível de urgência e acompanhamento de status (*Aberto*, *Em Manutenção*, *Resolvido*), além de exportação de resumo/relatório (PDF/link/texto) para envio à imobiliária ou proprietário.
6. **Convivência (Eventos, Espaços Comuns e Votações)**:
   - Calendário unificado da república, agendamento de eventos e reserva de áreas/equipamentos comuns com bloqueio de conflito de horário, além de sistema de enquetes/votações com prazo de encerramento.
7. **Relatórios, Notificações e Personalização**:
   - Dashboards e relatórios analíticos (balanço do caixa, despesas por categoria, desempenho em tarefas, histórico de eventos), notificações In-App/Web Push/E-mail configuráveis e personalização de tema da interface (claro/escuro).

## 3. Escopo Negativo (Fora do Escopo)

Para garantir foco e viabilidade técnica, **não** fazem parte do escopo do sistema:
- **Intermediação bancária direta (Gateway de Pagamento / Conta Digital)**: O RepHelper não processa transações financeiras reais junto ao Banco Central; os pagamentos utilizam chaves Pix informadas e anexação de comprovantes com confirmação pelo Administrador.
- **Conta de usuário para Proprietários/Imobiliárias**: Proprietários e imobiliárias não possuem login no sistema; a comunicação com eles ocorre via exportação e compartilhamento dos relatórios de problemas do imóvel.
- **Marketplace de vagas ou busca de imóveis para alugar**: O foco do sistema é a gestão interna de repúblicas já estabelecidas.
