# Glossário de Domínio (Linguagem Ubíqua)

Este glossário define os termos técnicos e de negócio utilizados de forma padronizada em toda a documentação e no código-fonte do **RepHelper**:

- **República**: Moradia compartilhada por estudantes universitários cadastrada no sistema, funcionando como a unidade isolada de dados (*tenant*).
- **Morador (`ROLE_MORADOR`)**: Usuário autenticado e vinculado a uma república ativa. Participa das obrigações financeiras, tarefas, controle de materiais, agendamentos e votações.
- **Administrador (`ROLE_ADMIN`)**: Morador detentor das permissões de gestão da república (criador da república ou morador que recebeu a transferência do cargo). Gerencia membros, configura mensalidades, administra o Caixa Comunitário, aprova reembolsos e audita tarefas.
- **Código de Convite**: Código alfanumérico único (ou link compartilhável) gerado pelo Administrador para permitir que novos moradores ingressem na república.
- **Caixa Comunitário**: Saldo financeiro coletivo da república, abastecido pelas mensalidades fixas dos moradores e utilizado para custear despesas da casa e reembolsos.
- **Mensalidade Fixa**: Valor mensal recorrente atribuído a cada morador (podendo variar conforme o quarto/vaga ocupado) destinado a compor o Caixa Comunitário (cobrindo aluguel, contas e fundo de reserva).
- **Saída Direta do Caixa**: Despesa paga diretamente pelo Administrador utilizando os recursos do Caixa Comunitário (ex.: pagamento do boleto de aluguel, conta de luz, internet).
- **Solicitação de Reembolso**: Registro feito por um morador quando este adquire um bem ou insumo para a república com recursos próprios (ex.: resistência de chuveiro, produtos de limpeza), anexando comprovante para avaliação do Administrador.
- **Abatimento em Mensalidade**: Modalidade de reembolso na qual o valor aprovado de uma compra feita pelo morador é descontado automaticamente do valor de sua próxima mensalidade fixa.
- **Rateio Extra**: Cobrança extraordinária criada pelo Administrador e dividida entre moradores selecionados para cobrir gastos pontuais que não serão absorvidos pelo Caixa Comunitário.
- **Lista de Compras da Casa**: Relação automática ou manual de materiais e insumos domésticos cujo estoque atingiu o nível mínimo ou está zerado.
- **Rodízio de Tarefas**: Regra de recorrência que alterna automaticamente o morador responsável por uma tarefa periódica a cada novo ciclo (diário, semanal ou quinzenal).
- **Auditoria de Tarefa**: Ação exclusiva do Administrador que permite reabrir uma tarefa marcada indevidamente como concluída, estornando os pontos de gamificação correspondentes.
- **Morador do Mês**: Reconhecimento concedido ao morador que acumular a maior pontuação no Ranking Mensal de tarefas domésticas no fechamento de cada mês calendário.
- **Relatório de Vistoria / Manutenção**: Documento exportável (PDF ou link resumido) contendo a listagem de problemas estruturais do imóvel, fotos, datas de abertura e status de resolução, destinado ao proprietário ou imobiliária.
