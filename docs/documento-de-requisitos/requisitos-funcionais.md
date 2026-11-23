# Requisitos Funcionais

Os requisitos funcionais do **RepHelper** estão organizados por módulo de domínio e identificados pelo código `[RFxxx]`.

---

## 3.1 Módulo de Autenticação, República e Membros

### [RF001] Cadastrar Usuário
Permite que um novo usuário crie sua conta na plataforma informando nome completo, e-mail, telefone/WhatsApp, chave Pix pessoal (para futuros reembolsos) e senha.
- **Ator**: Novo Usuário
- **Regras Associadas**: `[RN001]`, `[RN017]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF002] Autenticar Usuário (Login e Logout)
Permite que o usuário cadastrado acesse o sistema utilizando e-mail e senha, recebendo um token de autenticação JWT e sendo redirecionado para o Dashboard de sua república (ou para a tela de criar/ingressar em uma república, caso ainda não pertença a nenhuma).
- **Ator**: Morador / Administrador
- **Regras Associadas**: `[RN017]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF003] Recuperar e Redefinir Senha
Permite que o usuário solicite a recuperação de senha por meio do envio de um link temporário com token de redefinição para o seu e-mail cadastrado.
- **Ator**: Usuário
- **Prioridade**: ◻ Essencial 🗹 Importante ◻ Desejável

### [RF004] Cadastrar República
Permite que um usuário autenticado que ainda não pertença a uma república ativa crie uma nova república informando nome da república, endereço, dia padrão de vencimento da mensalidade, chave Pix do Caixa Comunitário e recompensa padrão do "Morador do Mês". O criador recebe automaticamente o papel de Administrador (`ROLE_ADMIN`).
- **Ator**: Usuário (torna-se `ROLE_ADMIN`)
- **Regras Associadas**: `[RN001]`, `[RN002]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF005] Ingressar em República via Código de Convite
Permite que um usuário sem república ativa insira um código ou acesse um link de convite válido gerado pelo Administrador para vincular-se à república como `ROLE_MORADOR`.
- **Ator**: Usuário (torna-se `ROLE_MORADOR`)
- **Regras Associadas**: `[RN001]`, `[RN002]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF006] Gerenciar Moradores e Administração da República
Permite ao Administrador visualizar os membros da república, gerar/revogar o código de convite, definir o valor da mensalidade fixa individual de cada morador/quarto, transferir o papel de Administrador (`ROLE_ADMIN`) para outro morador e remover moradores (respeitando a trava de pendências financeiras).
- **Ator**: Administrador (`ROLE_ADMIN`)
- **Regras Associadas**: `[RN001]`, `[RN002]`, `[RN003]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

---

## 3.2 Módulo Financeiro (Caixa Comunitário, Mensalidades, Reembolsos e Rateios)

### [RF007] Gerar e Controlar Mensalidades Fixas
Permite configurar o valor da mensalidade fixa de cada morador (podendo variar por quarto/vaga) e gera mensalmente as cobranças de mensalidade. O morador pode visualizar a chave Pix da casa, anexar o comprovante de pagamento e marcar sua mensalidade como enviada; o Administrador confirma o recebimento, creditando automaticamente o valor no saldo do **Caixa Comunitário**.
- **Ator**: Morador e Administrador
- **Regras Associadas**: `[RN004]`, `[RN006]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF008] Registrar Saída Direta do Caixa Comunitário
Permite ao Administrador registrar o pagamento de despesas fixas ou estruturais da casa (ex.: aluguel, energia elétrica, água, internet, manutenção) pagas diretamente com recursos do Caixa Comunitário, informando descrição, categoria, data, valor e comprovante, debitando o saldo do Caixa.
- **Ator**: Administrador (`ROLE_ADMIN`)
- **Regras Associadas**: `[RN004]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF009] Solicitar Reembolso de Compra Realizada pelo Morador
Permite que qualquer morador registre uma compra ou despesa paga do próprio bolso em benefício da república (ex.: resistência de chuveiro, produtos de limpeza, alimentos da casa), informando descrição, categoria, valor, data, foto da nota/comprovante e a forma preferida de ressarcimento (Pix ou abatimento na próxima mensalidade).
- **Ator**: Morador (`ROLE_MORADOR`)
- **Regras Associadas**: `[RN005]`, `[RN007]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF010] Aprovar e Liquidar Reembolso de Morador
Permite ao Administrador avaliar as solicitações de reembolso pendentes, podendo aprová-las ou rejeitá-las (com justificativa). Na aprovação, o Administrador liquida o reembolso por uma de duas modalidades:
1. **Reembolso via Pix do Caixa**: O Admin transfere o valor ao morador, anexa o comprovante e o sistema debita o saldo do Caixa Comunitário; ou
2. **Abatimento na Mensalidade**: O sistema aplica automaticamente um desconto de igual valor na próxima mensalidade em aberto daquele morador.
- **Ator**: Administrador (`ROLE_ADMIN`)
- **Regras Associadas**: `[RN005]`, `[RN006]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF011] Criar e Liquidar Rateio Extra Esporádico
Permite ao Administrador criar uma cobrança extraordinária (Rateio Extra) para despesas pontuais não cobertas pelo Caixa Comunitário, selecionando os moradores participantes, definindo a divisão (igualitária ou personalizada) e acompanhando o pagamento individual de cada cota.
- **Ator**: Administrador (criação/confirmação) e Morador (pagamento)
- **Regras Associadas**: `[RN004]`
- **Prioridade**: ◻ Essencial 🗹 Importante ◻ Desejável

### [RF012] Consultar Extrato do Caixa e Buscar Compras/Lançamentos
Permite a todos os moradores visualizar o saldo atual do Caixa Comunitário, o histórico completo de entradas e saídas, e buscar compras/lançamentos por período, categoria, tipo de transação ou morador responsável.
- **Ator**: Morador / Administrador
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

---

## 3.3 Módulo de Controle de Materiais e Lista de Compras

### [RF013] Controlar Estoque de Materiais da República
Permite cadastrar os itens de uso comum da república (alimentos básicos, produtos de limpeza, higiene e utensílios), registrar entradas e saídas (consumo) e definir a quantidade mínima de segurança de cada item.
- **Ator**: Morador / Administrador
- **Regras Associadas**: `[RN007]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF014] Gerenciar Lista de Compras Integrada ao Reembolso
Lista automaticamente os itens cujo estoque atingiu a quantidade mínima ou que foram marcados como "Em Falta" pelos moradores. Quando um morador compra os itens da lista e registra a entrada no estoque, o sistema oferece a opção de gerar imediatamente a **Solicitação de Reembolso (`[RF009]`)** já preenchida com os itens adquiridos.
- **Ator**: Morador / Administrador
- **Regras Associadas**: `[RN005]`, `[RN007]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

---

## 3.4 Módulo de Tarefas Domésticas e Gamificação

### [RF015] Criar e Atribuir Tarefa Doméstica (Única ou Recorrente com Rodízio)
Permite criar tarefas domésticas informando título, descrição, categoria, nível de dificuldade (Fácil, Média, Difícil — que define os pontos), prazo de execução, morador(es) responsável(is) e regra de recorrência (única, diária, semanal, quinzenal ou mensal), com suporte a **rodízio automático** da fila de moradores a cada ciclo.
- **Ator**: Morador / Administrador
- **Regras Associadas**: `[RN008]`, `[RN009]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF016] Concluir Tarefa Doméstica
Permite ao morador responsável marcar uma tarefa como concluída (com opção de anexar foto de comprovação), creditando imediatamente os pontos correspondentes no seu saldo do Ranking Mensal vigente.
- **Ator**: Morador (`ROLE_MORADOR`)
- **Regras Associadas**: `[RN009]`, `[RN010]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF017] Auditar Tarefa e Estornar Pontos
Permite ao Administrador auditar tarefas concluídas e, caso constate que a atividade não foi devidamente executada, reabrir a tarefa (retornando-a para status *Pendente*) e estornar automaticamente os pontos creditados ao morador, registrando o motivo da contestação.
- **Ator**: Administrador (`ROLE_ADMIN`)
- **Regras Associadas**: `[RN010]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF018] Visualizar Ranking Mensal e Histórico de "Morador do Mês"
Exibe o placar gamificado de pontuação dos moradores no mês corrente, a recompensa configurada pela república e a galeria histórica dos vencedores do título **"Morador do Mês"** nos meses anteriores.
- **Ator**: Morador / Administrador
- **Regras Associadas**: `[RN009]`, `[RN011]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

---

## 3.5 Módulo de Manutenção e Problemas no Imóvel

### [RF019] Registrar e Atualizar Problema no Imóvel
Permite que qualquer morador registre problemas estruturais ou técnicos no imóvel (ex.: infiltrações, vazamentos, defeitos elétricos), informando título, cômodo/local, descrição detalhada, nível de urgência (Baixa, Média, Alta, Crítica), fotos comprobatórias e evolução do status (*Aberto*, *Em Manutenção*, *Resolvido*).
- **Ator**: Morador / Administrador
- **Regras Associadas**: `[RN012]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF020] Exportar Relatório de Problemas para Imobiliária/Proprietário
Permite gerar e exportar um relatório estruturado (em formato PDF ou texto/link formatado com fotos, datas de registro e status) de um problema específico ou de todos os problemas abertos da casa, facilitando o envio externo à imobiliária ou ao proprietário do imóvel.
- **Ator**: Morador / Administrador
- **Regras Associadas**: `[RN012]`
- **Prioridade**: ◻ Essencial 🗹 Importante ◻ Desejável

---

## 3.6 Módulo de Convivência (Eventos, Espaços Comuns e Votações)

### [RF021] Agendar Evento e Reservar Espaço Comum
Permite cadastrar os espaços/equipamentos compartilhados da república (ex.: churrasqueira, sala de TV, máquina de lavar) e agendar eventos ou reservas informando título, espaço, data/hora de início e término e participantes, validando automaticamente a ausência de conflitos de horário no mesmo espaço.
- **Ator**: Morador / Administrador
- **Regras Associadas**: `[RN013]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF022] Visualizar Calendário Unificado da República
Exibe em formato de calendário (mensal, semanal e agenda diária) todos os eventos agendados, reservas de espaços comuns, vencimentos de mensalidades e prazos de tarefas domésticas da república.
- **Ator**: Morador / Administrador
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF023] Criar e Participar de Votações (Enquetes)
Permite que qualquer morador crie uma pauta de votação/enquete sobre decisões da casa (definindo título, descrição, opções de resposta e data/hora limite de encerramento) e permite que cada morador da república registre um único voto até o encerramento, apurando automaticamente o resultado.
- **Ator**: Morador / Administrador
- **Regras Associadas**: `[RN014]`
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

---

## 3.7 Módulo de Relatórios, Notificações e Personalização

### [RF024] Gerar Relatórios e Gráficos Analíticos
Permite visualizar relatórios e gráficos consolidados por período sobre: (a) fluxo de caixa comunitário (entradas de mensalidades vs. saídas diretas vs. reembolsos), (b) despesas por categoria, (c) taxa de cumprimento de tarefas domésticas por morador e (d) histórico de eventos e problemas do imóvel.
- **Ator**: Morador / Administrador
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF025] Enviar e Configurar Notificações
Envia notificações automáticas (In-App, Web Push e E-mail) sobre vencimento de mensalidades, novos pedidos/aprovações de reembolso, tarefas atribuídas ou auditadas, itens em falta no estoque, novos eventos e votações abertas, permitindo ao usuário configurar quais categorias e canais deseja receber, bem como ao Admin enviar comunicados gerais para a casa.
- **Ator**: Sistema, Morador e Administrador
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

### [RF026] Personalizar Interface do Aplicativo
Permite ao usuário alternar entre o tema visual Claro (*Light Mode*) e Escuro (*Dark Mode*), além de configurar preferências de exibição do seu painel inicial (Dashboard).
- **Ator**: Morador / Administrador
- **Prioridade**: ◻ Essencial ◻ Importante 🗹 Desejável
