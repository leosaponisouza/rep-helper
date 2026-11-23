# Previsão das Principais Entregas (Roadmap Executivo)

O desenvolvimento do **RepHelper** está organizado de maneira incremental e modular, garantindo entregas funcionais contínuas ao longo de **3 Releases principais** (detalhadas no [Cronograma e Entregas do Plano Metodológico](../plano-metodologico/cronograma-e-entregas.md)):

| Release | Foco Estratégico | Principais Módulos Entregues |
| :--- | :--- | :--- |
| **Release 1 (MVP Core)** | Fundação, Governança da República e Núcleo Financeiro | Autenticação JWT, Criação de República, Entrada por Convite, Gestão de Membros, Configuração de Mensalidades Fixas, Caixa Comunitário e Fluxo de Compras/Reembolsos. |
| **Release 2 (Operação e Imóvel)** | Rotina Doméstica, Gamificação, Estoque e Imóvel | Tarefas Domésticas (únicas e recorrentes com rodízio), Pontuação e Ranking Mensal, Controle de Materiais/Lista de Compras integrado ao Reembolso e Registro de Problemas no Imóvel com exportação de relatório. |
| **Release 3 (Convivência e Inteligência)** | Democracia Interna, Eventos, Relatórios e PWA | Reserva de Espaços Comuns e Eventos (com trava de conflito), Sistema de Votações/Enquetes, Relatórios Gráficos, Notificações Push/E-mail e Personalização de Interface. |

A arquitetura desacoplada (**React PWA + API REST Spring Boot + PostgreSQL**) permite que cada módulo seja evoluído e entregue sem interromper o funcionamento dos módulos anteriores.
