# Matriz de Rastreabilidade de Requisitos

Esta matriz assegura que todos os **Requisitos Funcionais (`RF`)** possuem **Regras de Negócio (`RN`)**, **Casos de Uso (`UC`)**, **Endpoints de API** e **Telas do Protótipo** correspondentes, eliminando funcionalidades órfãs ou não especificadas.

| ID RF | Nome do Requisito Funcional | Prioridade | Regras de Negócio (`RN`) | Caso de Uso Associado | Tela / Componente Principal | Endpoint Principal da API |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **RF001** | Cadastrar Usuário | Essencial | `RN001`, `RN017` | [Cadastrar Usuário](../especificacao-de-casos-de-uso/cadastrar-usuario.md) | Tela de Login e Cadastro | `POST /api/v1/auth/register` |
| **RF002** | Autenticar Usuário (Login/Logout) | Essencial | `RN017` | [Cadastrar Usuário](../especificacao-de-casos-de-uso/cadastrar-usuario.md) | Tela de Login e Cadastro | `POST /api/v1/auth/login` |
| **RF003** | Recuperar e Redefinir Senha | Importante | `RN017` | [Cadastrar Usuário](../especificacao-de-casos-de-uso/cadastrar-usuario.md) | Modal Esqueci Minha Senha | `POST /api/v1/auth/forgot-password` |
| **RF004** | Cadastrar República | Essencial | `RN001`, `RN002` | [Cadastrar República](../especificacao-de-casos-de-uso/cadastrar-republica.md) | Onboarding: Criar República | `POST /api/v1/republicas` |
| **RF005** | Ingressar em República via Convite | Essencial | `RN001`, `RN002` | [Cadastrar Usuário na República](../especificacao-de-casos-de-uso/cadastrar-usuario-na-republica.md) | Onboarding: Entrar com Código | `POST /api/v1/republicas/ingressar` |
| **RF006** | Gerenciar Moradores e Administração | Essencial | `RN001`, `RN002`, `RN003` | [Gerenciar Usuários](../especificacao-de-casos-de-uso/gerenciar-usuarios.md) | Gestão de Moradores (Admin) | `PUT /api/v1/republicas/membros/{id}` |
| **RF007** | Gerar e Controlar Mensalidades Fixas | Essencial | `RN004`, `RN006`, `RN016` | [Realizar Pagamento](../especificacao-de-casos-de-uso/realizar-pagamento.md) | Finanças > Mensalidades | `POST /api/v1/financeiro/mensalidades/{id}/pagar` |
| **RF008** | Registrar Saída Direta do Caixa | Essencial | `RN004`, `RN016` | [Registrar Gasto e Movimentar Caixa](../especificacao-de-casos-de-uso/registrar-gasto.md) | Finanças > Caixa da Casa | `POST /api/v1/financeiro/caixa/saidas` |
| **RF009** | Solicitar Reembolso de Compra | Essencial | `RN005`, `RN007`, `RN016` | [Registrar Gasto e Movimentar Caixa](../especificacao-de-casos-de-uso/registrar-gasto.md) | Finanças > Solicitar Reembolso | `POST /api/v1/financeiro/reembolsos` |
| **RF010** | Aprovar e Liquidar Reembolso | Essencial | `RN004`, `RN005`, `RN006` | [Realizar Pagamento](../especificacao-de-casos-de-uso/realizar-pagamento.md) | Finanças > Aprovar Reembolsos | `PUT /api/v1/financeiro/reembolsos/{id}/aprovar` |
| **RF011** | Criar e Liquidar Rateio Extra | Importante | `RN004` | [Registrar Gasto e Movimentar Caixa](../especificacao-de-casos-de-uso/registrar-gasto.md) | Finanças > Rateios Extras | `POST /api/v1/financeiro/rateios` |
| **RF012** | Consultar Extrato e Buscar Compras | Essencial | `RN004`, `RN015` | [Buscar Compras e Lançamentos](../especificacao-de-casos-de-uso/buscar-compras.md) | Finanças > Extrato e Busca | `GET /api/v1/financeiro/lancamentos` |
| **RF013** | Controlar Estoque de Materiais | Essencial | `RN007`, `RN015` | [Controlar Materiais](../especificacao-de-casos-de-uso/controlar-materiais.md) | Estoque & Lista de Compras | `POST /api/v1/materiais/{id}/movimentacoes` |
| **RF014** | Gerenciar Lista de Compras Integrada | Essencial | `RN005`, `RN007` | [Controlar Materiais](../especificacao-de-casos-de-uso/controlar-materiais.md) | Estoque > Aba Lista de Compras | `POST /api/v1/materiais/comprar-lote` |
| **RF015** | Criar e Atribuir Tarefa (c/ Rodízio) | Essencial | `RN008`, `RN009` | [Criar e Gerenciar Tarefa](../especificacao-de-casos-de-uso/criar-tarefa.md) | Tarefas > Nova Tarefa | `POST /api/v1/tarefas` |
| **RF016** | Concluir Tarefa Doméstica | Essencial | `RN009`, `RN010`, `RN016` | [Criar e Gerenciar Tarefa](../especificacao-de-casos-de-uso/criar-tarefa.md) | Tarefas > Minhas Tarefas | `POST /api/v1/tarefas/{id}/concluir` |
| **RF017** | Auditar Tarefa e Estornar Pontos | Essencial | `RN010` | [Criar e Gerenciar Tarefa](../especificacao-de-casos-de-uso/criar-tarefa.md) | Tarefas > Auditoria (Admin) | `POST /api/v1/tarefas/{id}/auditar` |
| **RF018** | Visualizar Ranking Mensal e Histórico | Essencial | `RN009`, `RN011` | [Criar e Gerenciar Tarefa](../especificacao-de-casos-de-uso/criar-tarefa.md) | Tarefas > Ranking Mensal | `GET /api/v1/gamificacao/ranking` |
| **RF019** | Registrar e Atualizar Problema no Imóvel | Essencial | `RN012`, `RN016` | [Registrar Problema no Imóvel](../especificacao-de-casos-de-uso/registrar-problema.md) | Imóvel > Problemas e Manutenção | `POST /api/v1/imovel/problemas` |
| **RF020** | Exportar Relatório para Imobiliária | Importante | `RN012` | [Registrar Problema no Imóvel](../especificacao-de-casos-de-uso/registrar-problema.md) | Imóvel > Exportar Vistoria PDF | `GET /api/v1/imovel/problemas/relatorio` |
| **RF021** | Agendar Evento e Reservar Espaço Comum | Essencial | `RN013` | [Agendar Evento e Espaço](../especificacao-de-casos-de-uso/agendar-evento.md) | Calendário > Novo Agendamento | `POST /api/v1/agenda/eventos` |
| **RF022** | Visualizar Calendário Unificado | Essencial | `RN015` | [Visualizar Calendário](../especificacao-de-casos-de-uso/visualizar-calendario.md) | Calendário da República | `GET /api/v1/agenda/calendario` |
| **RF023** | Criar e Participar de Votações | Essencial | `RN014` | [Participar de Votações](../especificacao-de-casos-de-uso/participar-de-votacoes.md) | Convivência > Votações | `POST /api/v1/votacoes/{id}/votar` |
| **RF024** | Gerar Relatórios e Gráficos Analíticos | Essencial | `RN015` | [Visualizar Relatórios](../especificacao-de-casos-de-uso/visualizar-relatorios.md) | Relatórios e Dashboards | `GET /api/v1/relatorios/resumo` |
| **RF025** | Enviar e Configurar Notificações | Essencial | `RN015` | [Configurar Notificações](../especificacao-de-casos-de-uso/configurar-notificacoes.md) | Configurações > Notificações | `PUT /api/v1/usuarios/me/notificacoes` |
| **RF026** | Personalizar Interface do Aplicativo | Desejável | — | [Personalizar Interface](../especificacao-de-casos-de-uso/personalizar-interface.md) | Configurações > Aparência | `PUT /api/v1/usuarios/me/preferencias` |

