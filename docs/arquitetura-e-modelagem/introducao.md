# Introdução e Requisitos Funcionais — Alpendre

Esta seção documenta os requisitos funcionais e a arquitetura técnica do monorepo **Alpendre** (*"Rotina, contas e agenda para quem divide o mesmo teto"*), consolidando o aplicativo móvel/web (**Expo React Native**, pacote `com.alpendre.app`), o back-end próprio (**Java 21 + Spring Boot 3.4 + PostgreSQL 16**, pacote `com.alpendre.backend`) e a infraestrutura autocontida em **VPS via Docker Compose** (zero dependências de Firebase ou Supabase).

---

## 1. Posicionamento de Produto

O **Alpendre** atende qualquer configuração de moradia compartilhada — **casais, famílias, amigos dividindo apartamento e repúblicas estudantis** — por meio de regras de convivência configuráveis por casa, eliminando tanto a burocracia excessiva em lares pequenos quanto a falta de governança em moradias coletivas maiores.

---

## 2. Requisitos Funcionais do Sistema (`RF01` a `RF07`)

### `RF01` — Autenticação Interna e Perfil do Morador
- **RF01.1:** Permitir cadastro e autenticação por e-mail/senha (`BCrypt`) ou conta Google OAuth (`idToken` / `accessToken` verificados localmente contra JWKS do Google).
- **RF01.2:** Emitir JWT de acesso de curta duração pareado a `refreshToken` opaco rotativo persistido por hash `SHA-256`, revogando sessões em logout, troca ou redefinição de senha.
- **RF01.3:** Disponibilizar recuperação de senha em duas etapas por código numérico de 6 dígitos (expiração em 15 min, limite de 5 tentativas e envio pós-commit).
- **RF01.4:** Permitir edição de nome, apelido, telefone, foto de perfil e exclusão/limpeza segura de avatar substituído.

### `RF02` — Criação de Casa, Presets, Endereço Opcional e Governança (`House`)
- **RF02.1:** Permitir criar uma casa informando apenas o **nome da casa**; todos os campos de endereço postal (`street`, `number`, `complement`, `neighborhood`, `city`, `state`, `zipCode`) são **opcionais**.
- **RF02.2:** Oferecer presets de configuração inicial que pré-preenchem três interruptores independentes (editáveis na criação e a qualquer momento em *Configurações > Minha Casa*):
  - `COUPLE_FAMILY` (**Casal / Família** — padrão): `hasSharedFund = false`, `requireExpenseApproval = false`, `allMembersAdmin = true`.
  - `SHARED_APT` (**Amigos / Apê**): `hasSharedFund = false`, `requireExpenseApproval = false`, `allMembersAdmin = false`.
  - `REPUBLIC` (**República**): `hasSharedFund = true`, `requireExpenseApproval = true`, `allMembersAdmin = false`.
  - `CUSTOM` (**Personalizado**): atribuído automaticamente sempre que a combinação das regras divergir dos três presets padrão.
- **RF02.3:** Permitir entrada de moradores por código de convite alfanumérico de 6 caracteres (`POST /api/v1/houses/join`) e regeneração de código aleatório ou personalizado por administradores.
- **RF02.4:** Quando `allMembersAdmin = true`, promover automaticamente todos os moradores ativos (e novos ingressantes) a administradores; permitir que qualquer `ADMIN` ou `OWNER` ativo edite dados e regras da casa (`PUT /api/v1/houses/{id}`), mantendo o `OWNER` protegido contra remoção ou rebaixamento.

### `RF03` — Motor Financeiro Adaptável (`2 × 2`: `hasSharedFund × requireExpenseApproval`)
- **RF03.1 — Modo Acompanhar Gastos (`hasSharedFund = false`):** Focado em visibilidade dos gastos da casa no mês por categoria e histórico mensal, **sem** mutação de saldo coletivo. Endpoints exclusivos de caixinha (`/api/v1/incomes`, `/adjust-balance` e `/reimburse`) são ocultados na UI e bloqueados na API com `400 SHARED_FUND_DISABLED`:
  - Com `requireExpenseApproval = false`: despesas nascem diretamente como `APPROVED` (exibidas na UI como **"Registrada"**) e podem ser editadas ou excluídas pelo criador ou admin.
  - Com `requireExpenseApproval = true`: despesas nascem `PENDING` e passam para `APPROVED` mediante aprovação de administrador (ou `REJECTED` com justificativa).
- **RF03.2 — Modo Caixinha (`hasSharedFund = true`):** Habilita saldo coletivo (`currentBalance`), registro de entradas (`Income`), ajuste manual auditado (`BalanceAdjustment`) e trava pessimista (`PESSIMISTIC_WRITE` no `HouseBalanceLedger`):
  - Com `requireExpenseApproval = false`: despesas nascem diretamente como `REIMBURSED`, debitando `-amount` imediatamente e recalculando o delta em edições ou exclusões.
  - Com `requireExpenseApproval = true`: fluxo completo `PENDING` → `APPROVED` → `REIMBURSED` (`-amount` no reembolso e estorno `+amount` em `/reset` ou `DELETE`).

### `RF04` — Gestão de Tarefas Domésticas e Recorrência
- **RF04.1:** Permitir criar, editar, filtrar com paginação, cancelar, concluir e excluir tarefas da casa com categorias, prazos e múltiplos moradores responsáveis (`assigned_users` reconciliados atomicamente).
- **RF04.2:** Em tarefas recorrentes (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`), gerar de forma atômica e idempotente (`PESSIMISTIC_WRITE`) a próxima ocorrência `PENDING` ao concluir a instância atual, respeitando `recurrenceInterval` e `recurrenceEndDate`.

### `RF05` — Agenda da Casa com Confirmação de Presença Opcional (`requireRsvp`)
- **RF05.1:** Permitir agendar compromissos da casa preservando fuso horário (`OffsetDateTime`) e sincronizá-los opcionalmente com o calendário nativo do aparelho.
- **RF05.2:** Suportar o interruptor `requireRsvp` (`true` por padrão):
  - Quando `requireRsvp = true`: habilita convites de moradores e respostas `INVITED`, `CONFIRMED` e `DECLINED`.
  - Quando `requireRsvp = false`: registra um **"Aviso na agenda"** puramente informativo (`invitations = []`), ocultando controles de presença na UI e bloqueando `/invite` e `/respond` com `400 RSVP_NOT_ENABLED`.

### `RF06` — Central de Notificações Internas
- **RF06.1:** Emitir notificações in-app automáticas em atribuições de tarefas, aprovações/rejeições/reembolsos de despesas e convites de eventos, com listagem geral/não lidas, contador em tempo real, leitura individual/em lote e limpeza por antiguidade.

### `RF07` — Armazenamento Local Seguro de Mídia
- **RF07.1:** Receber uploads autenticados de avatares e comprovantes (`avatars`, `receipts` até `5 MB`), validar assinatura binária por magic bytes (`JPEG`, `PNG`, `WebP`, `GIF`), servir com cabeçalho `nosniff` + cache imutável e remover arquivos órfãos ao substituir ou excluir registros.

---

## 3. Sumário da Documentação Técnica

1. **[Visão Geral da Arquitetura](visao-geral-arquitetura.md)**: Estrutura do monorepo (`frontend/`, `backend/`, `docs/`), arquitetura modular em `com.alpendre.backend`, autenticação JWT rotativa e armazenamento local de mídia.
2. **[Modelo de Dados e Diagrama Entidade-Relacionamento (DER)](modelo-de-dados.md)**: Diagrama ER em Mermaid (`erDiagram`) e dicionário das **13 tabelas** do banco **PostgreSQL 16** (`houses`, `house_members`, `tasks`, `expenses`, `events`, etc.).
3. **[Script SQL DDL Completo (`V1__init_schema.sql`)](schema-postgresql-flyway.md)**: Migração limpa gerenciada pelo **Flyway** (`backend/src/main/resources/db/migration/V1__init_schema.sql`), compatível com **PostgreSQL 16+** e **H2 (modo PostgreSQL)**.
4. **[Diagramas de Máquina de Estados e Sequência](diagramas-de-estados-e-sequencia.md)**: Máquinas de estado da matriz financeira `2 × 2` e de Tarefas, além de diagramas de sequência de refresh token, recorrência, caixinha, RSVP opcional e upload de mídia.
5. **[Especificação da API REST](especificacao-api-rest.md)**: Catálogo completo de endpoints `/api/v1/*` (`/api/v1/houses`, `/api/v1/expenses`, `/api/v1/events`, etc.), contratos JSON, códigos de erro (`SHARED_FUND_DISABLED`, `RSVP_NOT_ENABLED`) e regras RBAC.
6. **[Guia de Setup de Ambiente e Infraestrutura](setup-ambiente-e-infraestrutura.md)**: Orquestração `docker-compose.yml` (`alpendre-postgres` + `alpendre-backend`), variáveis `.env.example`, assinatura Android (`ALPENDRE_UPLOAD_*`) e execução das suítes de teste.
