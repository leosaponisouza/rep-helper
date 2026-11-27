# Design Spec: Reposicionamento `RepHelper` → `Alpendre` ( Clean Slate / Big Bang: Identidade, Arquitetura e Requisitos Funcionais )

**Data:** 2026-11-27  
**Produto:** **Alpendre** *(evolução completa a partir do RepHelper)*  
**Posicionamento:** Gerenciador de rotina, contas e agenda para quem divide o mesmo teto (casais, famílias, amigos dividindo apartamento e repúblicas)  
**Estratégia Arquitetural:** **Clean Slate ("Big Bang")** — migração integral de identidade, banco de dados (`houses`), API REST (`/api/v1/houses`), pacotes Java/Android (`com.alpendre.*`), rotas Expo (`app/(house)/*`) e documentação.

---

## 1. Intent & Why

O projeto nasceu como **RepHelper**, voltado estritamente a repúblicas estudantis. Como o produto ainda está em fase de desenvolvimento (sem banco de dados em produção e sem base de usuários legada), manter o recorte exclusivo de república limita artificialmente o mercado, enquanto preservar nomes legados (`republic`, `rephelper`, `com.anonymous.rephelperfrontend`) no código criaria dívida semântica permanente.

As barreiras do estado atual são duas:
1. **Marca e modelo de domínio nichados:** o nome *RepHelper*, os identificadores técnicos (`republics`, `/api/v1/republics`, `currentRepublicId`) e os textos de UI afastam casais, famílias e amigos dividindo apartamento.
2. **Regras funcionais engessadas na dinâmica de república:**
   - Cadastro exigindo **7 campos obrigatórios de endereço e CEP**.
   - Módulo financeiro assumindo obrigatoriamente **caixinha coletiva (`current_balance`)** + **aprovação/reembolso por administrador** (`PENDING` → `APPROVED` → `REIMBURSED`).
   - Governança vertical por padrão (`OWNER` isolado), pouco natural para casais e famílias que administram a casa como pares.
   - Eventos exigindo convites e confirmação formal de presença (`RSVP`) até para avisos simples da casa.

### Motivação do Reposicionamento (Big Bang + Caminho 2)
Construir o **Alpendre** já nascendo 100% limpo — do DDL PostgreSQL ao pacote Android e à UI — atendendo qualquer lar compartilhado **sem perder nenhum recurso para repúblicas**, por meio de **presets de criação da casa** (`Casal / Família`, `Amigos / Apê`, `República`) combinados a **regras abertas personalizáveis** (`hasSharedFund`, `requireExpenseApproval`, `allMembersAdmin` e `requireRsvp` por evento).

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Clean Slate (`Zero Legado RepHelper`):** substituir integralmente `RepHelper` / `republic` por **Alpendre** / `house` no schema SQL (`V1__init_schema.sql`), pacotes Java (`com.alpendre.backend`), endpoints REST (`/api/v1/houses`), modelos/rotas TypeScript (`app/(house)/*`, `houseId`, `currentHouseId`), pacote nativo (`com.alpendre.app`), containers Docker e documentação.
- **Presets + Personalização Aberta da Casa:** oferecer presets no cadastro (`COUPLE_FAMILY`, `SHARED_APT`, `REPUBLIC`) que pré-preenchem as regras da casa (`hasSharedFund`, `requireExpenseApproval`, `allMembersAdmin`), permitindo customização livre na criação e em **Configurações da Casa**.
- **Onboarding sem atrito:** tornar endereço e CEP **opcionais** no banco de dados, na API e no formulário de criação da casa.
- **Financeiro Adaptável (`Caixinha` vs. `Acompanhar Gastos`):** suportar tanto o caixa coletivo de república (saldo, entradas, aprovação e reembolso) quanto o modo enxuto de **acompanhar gastos mensais da casa** (sem saldo comum, sem receitas/reembolsos e sem cálculo de dívidas individuais).
- **Agenda com RSVP Opcional (`requireRsvp`):** suportar tanto eventos sociais com lista de presença quanto avisos/compromissos informativos da rotina doméstica.
- **Documentação 100% coerente:** atualizar `README.md`, `SECURITY.md`, `backend/README.md` e toda a pasta `docs/` refletindo a arquitetura limpa do **Alpendre**.

### Non-Goals
- Implementar divisão de dívidas par-a-par estilo *Splitwise* ("quem deve quanto para quem") no modo sem caixinha — o objetivo definido para `hasSharedFund = false` é **acompanhar os gastos da casa** por mês e categoria.
- Criar novos módulos fora do escopo atual nesta entrega (ex.: lista de compras, estoque/dispensa ou chat).
- Otimizar a experiência para moradia individual (1 pessoa sozinha) como caso de uso principal.
- Manter aliases ou shims de retrocompatibilidade para `/api/v1/republics`, `republics` ou `@rephelper:*` (desnecessários por não haver ambiente produtivo ativo).

### Anti-Goals
- Perder qualquer capacidade hoje existente para repúblicas estudantis (o preset `República` entrega exatamente o fluxo completo de caixinha + aprovação + reembolso + hierarquia).
- Sobrecarregar o cadastro da casa com dezenas de parâmetros — manter apenas **3 presets claros + 3 chaves diretas**.
- Executar `expo prebuild --clean` de forma destrutiva ou enfraquecer qualquer regra de segurança validada por `envSecurity.test.ts` (`allowBackup="false"`, ProGuard em release, sem assinatura release com `debug.keystore`, filtro estrito `EXPO_PUBLIC_`) e `designSystemGuardrails.test.ts`.

---

## 3. Constraints

- **Stack Backend:** Java 21, Spring Boot 3.4.3, Spring Security 6, Spring Data JPA (`ddl-auto: validate`), Flyway (`V1__init_schema.sql` reescrita limpa), PostgreSQL 16 (Docker/produção) e H2 (`MODE=PostgreSQL` nos testes).
- **Stack Frontend:** Expo SDK 52 (`~52.0.42`), React Native `0.76.8`, Expo Router `~4.0.19` (`typedRoutes: true`), TypeScript `strict`, Design System *Editorial de Convivência* (`src/design-system/`), zero novas dependências de produção.
- **Edição Nativa Controlada (`frontend/android/`):** atualizar pacote/namespace para `com.alpendre.app`, mover `MainActivity.kt` e `MainApplication.kt` para `com/alpendre/app/`, atualizar `scheme="alpendre"`, `app_name="Alpendre"` e propriedades `ALPENDRE_UPLOAD_*` cirurgicamente, preservando `Theme.AppCompat.DayNight.NoActionBar` e todas as travas de segurança do `AndroidManifest.xml` e `build.gradle`.
- **Critério de Aceite Automatizado:**
  1. `cd backend && mvn test` com `BUILD SUCCESS`.
  2. `cd frontend && npm run typecheck && npm run test:ci` com `0` erros.
  3. Guardrail automatizado garantindo **zero referências residuais** a `rephelper` / `republic` no código-fonte ativo (`backend/src` e `frontend/{app,components,src}`).

---

## 4. Approaches Considered

1. **Abordagem A — Rename Estrutural Completo ("Big Bang" / Clean Slate `Alpendre` + `House`) *(Escolhida)*:**
   - **Descrição:** Como não há banco produtivo nem clientes publicados, unificamos 100% da nomenclatura técnica e de negócio: `V1__init_schema.sql` nasce com `houses` e `house_members`; o backend migra para `com.alpendre.backend` e `/api/v1/houses`; o frontend migra para `com.alpendre.app`, `app/(house)/*`, `houseService.ts` e `house.model.ts`; Docker e documentação refletem apenas **Alpendre**.
   - **Trade-offs:** Toca mais arquivos na implementação inicial, mas elimina para sempre qualquer dívida cognitiva ou migração `V2` paliativa, com segurança garantida pelos compiladores Java 21 e TypeScript `strict`.

2. **Abordagem B — Evolução Semântica Externa mantendo `republics` internamente *(Descartada)*:**
   - **Trade-offs:** Menor diff imediato, porém deixaria tabelas, FKs (`republic_id`), pacotes Java e endpoints REST permanentemente desalinhados do domínio real do produto sem necessidade de retrocompatibilidade.

3. **Abordagem C — Rebrand Cosmético Apenas no Frontend *(Descartada)*:**
   - **Trade-offs:** Quebra a consistência entre moradores em dispositivos diferentes e mantém travas legadas de CEP obrigatório e aprovação forçada no servidor.

---

## 5. Plano de Mudança de Identidade e Mapeamento Estrutural (`RepHelper` → `Alpendre`)

### 5.1 Identidade da Marca
- **Nome:** `Alpendre` (`Alpendre (Dev)` em desenvolvimento).
- **Tagline:** *"Rotina, contas e agenda para quem divide o mesmo teto."*
- **Linguagem Visual:** mantém integralmente os tokens WCAG 2.1 AA do Design System **Editorial de Convivência** (`#F5F2EB` papel quente, `#1C1B18` tinta, `#1F4AA8` azul cobalto no claro; `#151412` / `#7EA4FF` no escuro), regenerando todos os ícones e splash PNG com um **símbolo arquitetural de arco/alpendre integrado ao monograma `A`**.
- **Canais Institucionais:** `contato@alpendre.app` | `www.alpendre.app` | `@alpendre.app`.

### 5.2 Mapa de Renomeação Estrutural (Full-Stack & Infra)

| Camada | Antes (`RepHelper`) | Depois (`Alpendre`) |
|---|---|---|
| **PostgreSQL / Flyway (`V1`)** | `republics`, `republic_members`, `republic_id`, `current_republic_id` | `houses`, `house_members`, `house_id`, `current_house_id` |
| **Maven & Pacote Java** | `com.rephelper:rephelper-backend` / `com.rephelper.backend` | `com.alpendre:alpendre-backend` / `com.alpendre.backend` |
| **Classe Principal & Domínio** | `RepHelperApplication`, pacote `republic` (`Republic*`) | `AlpendreApplication`, pacote `house` (`House`, `HouseAddress`, `HouseMember`, `HouseCommandHandler`, `HouseController`, `HouseSecurityService`, `HouseBalanceLedger`, `HouseFinanceController`) |
| **API REST & Payloads** | `/api/v1/republics/**`, `republicId`, `currentRepublicId`, `republicName`, erros `REPUBLIC_*` | `/api/v1/houses/**`, `houseId`, `currentHouseId`, `houseName`, erros `HOUSE_*` (`NO_ACTIVE_HOUSE`, `NOT_HOUSE_MEMBER`, `HOUSE_NOT_FOUND`, `HOUSE_REQUIRED`) |
| **Expo / Android / iOS** | `slug: "rep-helper-frontend"`, `scheme: "rephelper"`, `com.anonymous.rephelperfrontend`, `REPHELPER_UPLOAD_*` | `slug: "alpendre"`, `scheme: "alpendre"`, `com.alpendre.app` (`.dev` em dev), `ALPENDRE_UPLOAD_*` |
| **Storage Local** | `@rephelper:theme_preference` | `@alpendre:theme_preference` |
| **Rotas & Código Frontend** | `app/(republic)/*`, `settings/republic.tsx`, `republic.model.ts`, `republicService.ts`, `useRepublicMembers.ts` | `app/(house)/*`, `settings/house.tsx`, `house.model.ts`, `houseService.ts`, `useHouseMembers.ts` |
| **Docker & Ambiente** | `rephelper-postgres`, `rephelper-backend`, DB `rephelper`, `/var/lib/rephelper/media` | `alpendre-postgres`, `alpendre-backend`, DB `alpendre`, `/var/lib/alpendre/media`, user `alpendre` |
| **Vocabulário de UI** | `República`, `Membro(s)`, `Proprietário da república`, `Saldo da república` | `Casa`, `Morador(es)`, `Criador da casa`, `Saldo da caixinha` / `Gastos no mês` |

---

## 6. Refatoração dos Requisitos Funcionais do Sistema (`RF01`–`RF06`)

### RF01 — Criação, Entrada e Personalização da Casa
1. **Cadastro enxuto:** exige apenas `name` (2 a 120 caracteres) e a configuração de regras (via preset ou customização manual).
2. **Endereço opcional:** `street`, `number`, `complement`, `neighborhood`, `city`, `state` e `zipCode` são opcionais (`NULL` no banco). Se informados, validam `state` com 2 letras e `zipCode` no padrão `^\d{5}-\d{3}$`. `HouseAddress.toFullAddress()` concatena apenas partes preenchidas e retorna `""` quando vazio.
3. **Presets de Casa e Chaves Personalizáveis:**

   | Preset (`presetType`) | Rótulo na UI | `hasSharedFund` (Usar caixinha) | `requireExpenseApproval` (Exigir aprovação) | `allMembersAdmin` (Todos administram) |
   |---|---|---|---|---|
   | `COUPLE_FAMILY` *(padrão na UI e API)* | **Casal / Família** | `false` | `false` | `true` |
   | `SHARED_APT` | **Amigos / Apê** | `false` | `false` | `false` |
   | `REPUBLIC` | **República** | `true` | `true` | `false` |
   | `CUSTOM` | **Personalizado** | Manual | Manual | Manual |

4. **Resolução determinística de regras:**
   - Se o cliente enviar apenas `presetType` (`COUPLE_FAMILY`, `SHARED_APT` ou `REPUBLIC`), o backend preenche automaticamente os 3 booleans canônicos correspondentes.
   - Se o cliente enviar booleans explícitos que divirjam dos 3 presets canônicos, `presetType` é salvo/exibido como `CUSTOM` (ou como o preset correspondente caso coincida).
   - Se nenhum preset nem boolean for enviado em `POST /api/v1/houses`, assume `COUPLE_FAMILY` (`false`, `false`, `true`).
5. **Reconfiguração contínua:** o nome, endereço e as 3 regras podem ser editados a qualquer momento em **Configurações da Casa** (`PUT /api/v1/houses/{id}`).

### RF02 — Governança e Papéis dos Moradores (`OWNER`, `ADMIN`, `MEMBER`)
1. **Modo Hierárquico (`allMembersAdmin = false` — presets `SHARED_APT` e `REPUBLIC`):** novos moradores entram via código de convite com `isAdmin = false`; apenas `ADMIN` ou `OWNER` aprovam gastos, regeneram código de convite, removem moradores e editam configurações da casa.
2. **Modo Horizontal (`allMembersAdmin = true` — preset `COUPLE_FAMILY`):**
   - Novos moradores que entram via `POST /api/v1/houses/join` já recebem `isAdmin = true`.
   - Ativar `allMembersAdmin = true` em uma casa existente promove todos os moradores `ACTIVE` a `isAdmin = true` imediatamente.
   - `HouseSecurityService.requireAdmin`, `AuthService.resolveIsAdmin` e `MemberView` avaliam `isOwner || isAdmin || house.isAllMembersAdmin()`.
3. **Edição da Casa compartilhada entre Admins:** `PUT /api/v1/houses/{id}` exige `requireAdmin` (permitindo que co-administradores de um casal/família editem nome, endereço e regras da casa).
4. **Proteção do Criador (`OWNER`):** o criador da casa nunca pode ser removido (`CANNOT_REMOVE_OWNER`) nem rebaixado (`CANNOT_DEMOTE_OWNER`).

### RF03 — Módulo Financeiro Adaptável (`Caixinha` vs. `Acompanhar Gastos`)
O motor financeiro opera sob a matriz `2 × 2` (`hasSharedFund × requireExpenseApproval`):

| Configuração da Casa | Status Inicial em `POST /expenses` | Impacto em `houses.current_balance` | Edição (`PUT`) e Exclusão (`DELETE`) | `Incomes`, `AdjustBalance` e `Reimburse` | Fila `PendingActions` |
|---|---|---|---|---|---|
| **`hasSharedFund = true` + `requireExpenseApproval = true`** *(República)* | `PENDING` | Zero na criação; `-amount` em `POST /reimburse` (estorna `+amount` em `reset`/delete de `REIMBURSED`) | Criador/Admin enquanto `PENDING`; exclusão de `REIMBURSED` exige Admin | **Habilitados** | `PENDING` + `APPROVED` |
| **`hasSharedFund = true` + `requireExpenseApproval = false`** *(Caixinha direta)* | `REIMBURSED` *(com `approver = creator`, `approvalDate = now`, `reimbursementDate = now`)* | Debita `-amount` na criação; `PUT` aplica `previous - next`; `DELETE` estorna `+amount` | Criador ou Admin podem editar e excluir livremente | `Incomes` e `AdjustBalance` **habilitados** | Apenas eventuais pendências legadas |
| **`hasSharedFund = false` + `requireExpenseApproval = false`** *(Casal / Família / Apê — Acompanhar Gastos)* | `APPROVED` *(rotulado na UI como **"Registrada"**)* | **Zero** (não altera `current_balance`) | Criador ou Admin podem editar e excluir livremente | **Bloqueados** (`400 SHARED_FUND_DISABLED`) e ocultos na UI | **Vazia** (`0`) |
| **`hasSharedFund = false` + `requireExpenseApproval = true`** *(Aprovação sem caixinha)* | `PENDING` | **Zero** em todas as transições | Editável enquanto `PENDING`; Admin aprova (`APPROVED`) ou rejeita (`REJECTED`) | **Bloqueados** (`400 SHARED_FUND_DISABLED`) e ocultos na UI | Apenas `PENDING` |

- **Enriquecimento do Resumo Financeiro (`FinancialDashboardSummaryView`):** retorna `hasSharedFund` e `requireExpenseApproval` junto aos totais, permitindo que `HomeScreen` e `FinancesDashboardScreen` alternem instantaneamente entre a visão **"Saldo da caixinha"** e **"Gastos no mês"** (`totalExpensesCurrentMonth` + gráficos por categoria e histórico mensal de gastos, sem aba de receitas nem etapa de reembolso na `ExpenseTimeline`).

### RF04 — Tarefas Domésticas Recorrentes
- Preserva integralmente os status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `OVERDUE`, `CANCELLED`), múltiplos moradores responsáveis, filtros paginados (`TaskSpecifications`) e geração automática idempotente da próxima ocorrência (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`) sob `houseId`.

### RF05 — Agenda da Casa com RSVP Opcional (`requireRsvp`)
1. `events.require_rsvp BOOLEAN NOT NULL DEFAULT TRUE`.
2. **`requireRsvp = true`:** cria convite `CONFIRMED` para o autor, permite convidar moradores (`INVITED`, `CONFIRMED`, `DECLINED`) e notifica *"Novo convite de evento"*.
3. **`requireRsvp = false` (compromisso/aviso informativo):**
   - Não gera registros em `event_invitations`; se `invitedUserIds` for informado, apenas envia notificação informativa *"Novo compromisso na agenda da casa"*.
   - `PUT /api/v1/events/{id}/respond` e `POST /api/v1/events/{id}/invite` retornam `400 Bad Request` (`RSVP_NOT_ENABLED`).
   - Na UI, oculta controles/contadores de RSVP e exibe o selo *"Aviso na agenda"*.

### RF06 — Central de Notificações
- Vinculada a `house_id`, com mensagens e tipos alinhados ao vocabulário de **Casa** e **Moradores**.

---

## 7. Plano de Mudança na Documentação (`README.md`, `SECURITY.md` e `docs/`)

| Arquivo | Ação |
|---|---|
| `README.md` | Reescrita para **Alpendre**: posicionamento para qualquer casa compartilhada, diagrama de arquitetura, destaques de presets/financeiro adaptável/RSVP opcional, instruções Docker Compose + Expo e métricas atualizadas de testes. |
| `backend/README.md` & `SECURITY.md` | Atualização para `Alpendre`, `com.alpendre.backend`, `HouseSecurityService` e `/api/v1/houses`. |
| `docs/arquitetura-e-modelagem/introducao.md` & `visao-geral-arquitetura.md` | Visão geral do monorepo **Alpendre**, pacotes `com.alpendre.backend.*` e matriz de regras configuráveis da casa. |
| `docs/arquitetura-e-modelagem/modelo-de-dados.md` & `schema-postgresql-flyway.md` | Novo DER Mermaid e dicionário completo com `houses`, `house_members`, `house_id`, `current_house_id`, endereço opcional, colunas de presets/governança e `events.require_rsvp`, espelhando a nova `V1__init_schema.sql`. |
| `docs/arquitetura-e-modelagem/diagramas-de-estados-e-sequencia.md` | Máquina de estados de `Expense` atualizada para os 4 modos da casa + sequência de onboarding com presets. |
| `docs/arquitetura-e-modelagem/especificacao-api-rest.md` & `setup-ambiente-e-infraestrutura.md` | Catálogo `/api/v1/houses` e demais rotas com `houseId`, códigos `SHARED_FUND_DISABLED` / `RSVP_NOT_ENABLED` e variáveis Docker/env `alpendre`. |
| `docs/designs/rep-helper-backend-monorepo.md` → `docs/designs/alpendre-backend-monorepo.md` | Renomeação e atualização do documento de system design do monorepo para **Alpendre**. |

---

## 8. Decisões Deixadas ao Implementador (Builder Calls)

- Composição visual dos seletores de preset e switches de regras da casa utilizando os primitivos já existentes de `src/design-system/` (`Surface`, `Chip`, `SegmentedTabs`, `ListRow`, `AppText`, `Button`).
- Geometria exata do ícone PNG de arco/monograma `A` do **Alpendre**, respeitando paleta `#F5F2EB` / `#1F4AA8` e dimensões validadas por `brandConfig.test.ts`.
