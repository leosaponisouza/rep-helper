# Alpendre — Reposicionamento Clean Slate ("Big Bang") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Executar o reposicionamento completo **Clean Slate ("Big Bang")** de `RepHelper` para **Alpendre**, migrando schema PostgreSQL (`houses`), backend Spring Boot (`com.alpendre.backend`, `/api/v1/houses`), app Expo/Android/iOS (`com.alpendre.app`, `app/(house)/*`), infraestrutura Docker, presets e regras personalizáveis da casa, financeiro adaptável (`Caixinha` vs. `Acompanhar Gastos`), agenda com RSVP opcional e toda a documentação.

**Architecture:** Reescrita limpa da migração inicial `V1__init_schema.sql` e renomeação estrutural ponta a ponta de `republic` → `house` e `rephelper` → `alpendre`, aproveitando que não há banco ou clientes legados em produção. Sobre o domínio limpo `House`, implementamos os presets (`COUPLE_FAMILY`, `SHARED_APT`, `REPUBLIC`, `CUSTOM`), governança horizontal opcional (`allMembersAdmin`), matriz `2 × 2` de despesas (`hasSharedFund × requireExpenseApproval`) e `events.requireRsvp`.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Security 6, Spring Data JPA, Flyway, PostgreSQL 16 / H2, Docker Compose, React Native 0.76.8, Expo SDK 52 (`~52.0.42`), Expo Router `~4.0.19` (`typedRoutes: true`), TypeScript `~5.3.3` (`strict: true`), Zod, Jest (`jest-expo`).

**Spec:** `docs/specs/specs/2026-11-27-alpendre-repositioning-design.md`

## Global Constraints

- Zero código legado `rephelper` / `republic` no código-fonte ativo de `backend/src` e `frontend/{app,components,src}` ao término do plano (exceto o literal de domínio `'REPUBLIC'` / `'República'` usado exclusivamente para representar o preset de república estudantil).
- Compatibilidade obrigatória da nova `V1__init_schema.sql` com **PostgreSQL 16** e **H2 (`MODE=PostgreSQL`)** com `spring.jpa.hibernate.ddl-auto=validate`.
- Compatibilidade obrigatória em **Android, iOS e Expo Web (`react-native-web`)**, sem instalar novas dependências de produção, sem `Alert.alert`, sem hex fora de `palette.ts` e **sem** rodar `expo prebuild --clean` (edições nativas cirúrgicas preservando `allowBackup="false"`, ProGuard, signing config com `ALPENDRE_UPLOAD_*` e tema `DayNight`).
- Em `POST /api/v1/houses`, se nem `presetType` nem booleans forem enviados, o default é `COUPLE_FAMILY` (`hasSharedFund = false`, `requireExpenseApproval = false`, `allMembersAdmin = true`); se apenas `presetType` for enviado, aplica seus booleans canônicos (`REPUBLIC` -> `true, true, false`; `SHARED_APT` -> `false, false, false`).
- Verificações obrigatórias com exit code `0`: `cd backend && mvn test` e `cd frontend && npm run typecheck && npm run test:ci`.

## Review Focus

1. Criar uma casa sem campos de endereço (`street`, `number`, `neighborhood`, `city`, `state`, `zipCode` nulos/em branco) deve persistir `NULL` sem erro SQL e `HouseAddress.toFullAddress()` deve retornar `""` em vez de concatenar `"null"` -> fixado na Task 2 (`HouseRbacIntegrationTest`).
2. Habilitar `allMembersAdmin = true` via `PUT /api/v1/houses/{id}` em uma casa existente deve promover imediatamente moradores `ACTIVE` regulares a administradores (`GET /users/me` -> `isAdmin: true`), mantendo o `OWNER` protegido contra exclusão (`CANNOT_REMOVE_OWNER`) e rebaixamento (`CANNOT_DEMOTE_OWNER`) -> fixado na Task 2 (`HouseRbacIntegrationTest`).
3. Em casas com `hasSharedFund = false`, chamadas diretas a `POST /api/v1/incomes`, `POST /api/v1/finances/{houseId}/adjust-balance` e `POST /api/v1/expenses/{id}/reimburse` devem falhar com `400 SHARED_FUND_DISABLED` sem alterar `current_balance`; já em `(hasSharedFund = true, requireExpenseApproval = false)`, criar/editar/excluir despesa deve aplicar exatamente `-amount` / `previous - next` / `+amount` em `HouseBalanceLedger` -> fixado na Task 3 (`FinanceLedgerIntegrationTest`).
4. Mover o pacote Android nativo de `com.anonymous.rephelperfrontend` para `com.alpendre.app` deve manter `namespace`, `applicationId`, caminho de `MainActivity.kt`/`MainApplication.kt`, `AndroidManifest.xml` (`scheme="alpendre"`) e `ALPENDRE_UPLOAD_STORE_FILE` 100% sincronizados com `app.json`, `app.config.js` e `envSecurity.test.ts` -> fixado na Task 4 (`envSecurity.test.ts` & `brandConfig.test.ts`).
5. No frontend com `hasSharedFund = false`, `ExpenseTimeline` não pode renderizar passo `"Reembolsada"`, e `FinancesDashboardScreen` / `HomeScreen` devem ocultar saldo de caixinha, aba de receitas e fila de reembolsos pendentes -> fixado na Task 6 (`screenDecomposition.test.ts`).

---

## File Structure Map

- **Infraestrutura & Raiz:**
  - Modify: `docker-compose.yml`, `.env.example`, `backend/Dockerfile`, `README.md`, `SECURITY.md`, `backend/README.md`
  - Rename & Modify: `docs/designs/rep-helper-backend-monorepo.md` → `docs/designs/alpendre-backend-monorepo.md`
  - Modify (`docs/arquitetura-e-modelagem/`): `{introducao,visao-geral-arquitetura,modelo-de-dados,schema-postgresql-flyway,diagramas-de-estados-e-sequencia,especificacao-api-rest,setup-ambiente-e-infraestrutura}.md`
- **Backend (`backend/`):**
  - Modify: `pom.xml`, `src/main/resources/application.yml`, `src/test/resources/application-test.yml`, `src/main/resources/db/migration/V1__init_schema.sql`
  - Move & Refactor: `src/main/java/com/rephelper/backend/**` → `src/main/java/com/alpendre/backend/**` (renomeando `RepHelperApplication` → `AlpendreApplication`, pacote `republic` → `house`, `Republic*` → `House*`, `RepublicBalanceLedger` → `HouseBalanceLedger`, `RepublicFinanceController` → `HouseFinanceController`)
  - Move & Refactor (Testes): `src/test/java/com/rephelper/backend/**` → `src/test/java/com/alpendre/backend/**` (`AlpendreBackendIntegrationTest`, `HouseRbacIntegrationTest`, etc.)
- **Frontend (`frontend/`):**
  - Modify (Config & Nativo): `package.json`, `app.json`, `app.config.js`, `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/values/strings.xml`, `assets/images/{icon,adaptive-icon,splash-icon,favicon}.png`, `android/app/src/main/res/drawable-{mdpi,hdpi,xhdpi,xxhdpi}/splashscreen_logo.png`, `src/design-system/theme/ThemeContext.tsx`
  - Move (Kotlin Android): `android/app/src/main/java/com/anonymous/rephelperfrontend/{MainActivity,MainApplication}.kt` → `android/app/src/main/java/com/alpendre/app/{MainActivity,MainApplication}.kt`
  - Move & Refactor (Domínio Casa):
    - `app/(republic)/{_layout,choice,new,join}.tsx` → `app/(house)/{_layout,choice,new,join}.tsx`
    - `app/(panel)/settings/republic.tsx` → `app/(panel)/settings/house.tsx`
    - `src/models/republic.model.ts` → `src/models/house.model.ts`
    - `src/services/republicService.ts` → `src/services/houseService.ts`
    - `src/hooks/useRepublicMembers.ts` → `src/hooks/useHouseMembers.ts`
    - `src/hooks/__tests__/useRepublicMembers.test.ts` → `src/hooks/__tests__/useHouseMembers.test.ts`
  - Create: `src/utils/housePresets.ts`, `src/utils/__tests__/housePresets.test.ts`, `src/design-system/__tests__/cleanSlateGuardrails.test.ts`
  - Modify: demais telas/componentes/hooks/serviços/testes em `app/`, `components/` e `src/` para `houseId` / `currentHouseId`, financeiro adaptável, `requireRsvp` e identidade **Alpendre**.

---

### Task 1: Infraestrutura Docker, Maven, `V1__init_schema.sql` Limpa e Migração Estrutural `com.alpendre.backend` + `/api/v1/houses`

**Files:**
- Modify: `docker-compose.yml`, `.env.example`, `backend/Dockerfile`, `backend/pom.xml`
- Modify: `backend/src/main/resources/application.yml`, `backend/src/test/resources/application-test.yml`
- Modify: `backend/src/main/resources/db/migration/V1__init_schema.sql`
- Move & Modify: `backend/src/main/java/com/rephelper/backend/**` → `backend/src/main/java/com/alpendre/backend/**`
- Move & Modify: `backend/src/test/java/com/rephelper/backend/**` → `backend/src/test/java/com/alpendre/backend/**`

**Interfaces:**
- Consumes: estrutura original do módulo `backend/`.
- Produces:
  - Maven coordinates `com.alpendre:alpendre-backend:1.0.0`, pacote base `com.alpendre.backend`, `AlpendreApplication`.
  - Schema `V1__init_schema.sql` com tabelas `houses` (endereço anulável + `preset_type`, `has_shared_fund`, `require_expense_approval`, `all_members_admin`), `house_members` (`house_id`), `users.current_house_id`, FKs `house_id` em `tasks`, `expenses`, `incomes`, `balance_adjustments`, `events` (+ `require_rsvp BOOLEAN NOT NULL DEFAULT TRUE`) e `notifications`.
  - Endpoints `/api/v1/houses/**`, `/api/v1/finances/{houseId}/adjust-balance`, `/api/v1/financial-dashboard/**/{houseId}`, query/body `houseId` e `UserDTO.currentHouseId`.

- [ ] **Step 1: Atualizar `docker-compose.yml`, `.env.example`, `backend/Dockerfile`, `backend/pom.xml`, `application.yml` e `application-test.yml`**

Substituir `rephelper` por `alpendre` (containers `alpendre-postgres` e `alpendre-backend`, DB/user `alpendre`, volume `/var/lib/alpendre/media`, usuário Linux `alpendre` no `Dockerfile`, `groupId = com.alpendre`, `artifactId = alpendre-backend`, `H2 url = jdbc:h2:mem:alpendre_test;...`, `from-address = no-reply@alpendre.app`).

- [ ] **Step 2: Reescrever `V1__init_schema.sql` limpa para o domínio `houses`**

Substituir `republics` → `houses`, `republic_members` → `house_members`, `republic_id` → `house_id`, `current_republic_id` → `current_house_id`; remover `NOT NULL` de `street, number, neighborhood, city, state, zip_code`; incluir em `houses`:
- `preset_type VARCHAR(30) NOT NULL DEFAULT 'COUPLE_FAMILY' CHECK (preset_type IN ('COUPLE_FAMILY', 'SHARED_APT', 'REPUBLIC', 'CUSTOM'))`
- `has_shared_fund BOOLEAN NOT NULL DEFAULT FALSE`
- `require_expense_approval BOOLEAN NOT NULL DEFAULT FALSE`
- `all_members_admin BOOLEAN NOT NULL DEFAULT TRUE`
e em `events`: `require_rsvp BOOLEAN NOT NULL DEFAULT TRUE`.

- [ ] **Step 3: Mover pacotes Java/Test para `com.alpendre.backend` e renomear `Republic*` → `House*` mantendo os testes existentes com preset explícito `"REPUBLIC"`**

Mover a árvore `src/main/java` e `src/test/java` para `com/alpendre/backend` (removendo diretórios antigos `com/rephelper`), renomeando pacote `republic` → `house`, classes `Republic*` → `House*`, rotas `/api/v1/houses`, parâmetros `houseId`, `User.currentHouseId`, códigos `HOUSE_NOT_FOUND` / `NO_ACTIVE_HOUSE` / `NOT_HOUSE_MEMBER` / `HOUSE_REQUIRED` e `OpenApiConfig` (`Alpendre API`). Em `AbstractIntegrationTest`, atualizar `createHouse(ownerPrefix, houseName)` enviando `"presetType": "REPUBLIC"` por padrão nas fixtures herdadas das suítes existentes + sobrecarga `createHouse(ownerPrefix, houseName, presetType)`.

- [ ] **Step 4: Rodar `mvn test` para validar compilação, `ddl-auto: validate` e todas as suítes**

Run: `cd backend && mvn clean test`  
Expected: `BUILD SUCCESS` com todos os 27 testes de integração passando sobre `com.alpendre.backend` e `houses`.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example backend
git commit -m "refactor(backend): clean-slate rename to Alpendre and House domain across SQL, Java, and Docker"
```

---

### Task 2: Presets de Casa, Governança `allMembersAdmin` e Endereço Opcional no Backend

**Files:**
- Modify: `backend/src/main/java/com/alpendre/backend/house/HouseAddress.java`
- Modify: `backend/src/main/java/com/alpendre/backend/house/HousePayloads.java`
- Modify: `backend/src/main/java/com/alpendre/backend/house/HouseCommandHandler.java`
- Modify: `backend/src/main/java/com/alpendre/backend/house/HouseSecurityService.java`
- Modify: `backend/src/main/java/com/alpendre/backend/house/MembershipUseCase.java`
- Modify: `backend/src/main/java/com/alpendre/backend/auth/AuthService.java`
- Test: `backend/src/test/java/com/alpendre/backend/house/HouseRbacIntegrationTest.java`

**Interfaces:**
- Consumes: entidades `House` e `HouseMember` da Task 1.
- Produces:
  - `HousePayloads.HouseView`: inclui `String presetType`, `boolean hasSharedFund`, `boolean requireExpenseApproval`, `boolean allMembersAdmin`.
  - `HousePayloads.CreateInput` & `UpdateInput`: campos de endereço opcionais + `String presetType`, `Boolean hasSharedFund`, `Boolean requireExpenseApproval`, `Boolean allMembersAdmin`.
  - Resolução automática de presets (`COUPLE_FAMILY`, `SHARED_APT`, `REPUBLIC`, `CUSTOM`) e promoção automática em `allMembersAdmin = true`.

- [ ] **Step 1: Escrever os testes de integração que falham em `HouseRbacIntegrationTest.java`**

Adicionar testes validando:
1. `POST /api/v1/houses` enviando apenas `{ "name": "Apê 42" }` cria casa com `presetType = "COUPLE_FAMILY"`, `hasSharedFund = false`, `requireExpenseApproval = false`, `allMembersAdmin = true`, `address.fullAddress = ""`; segundo morador que entra via `/api/v1/houses/join` recebe `isAdmin = true` em `/api/v1/users/me`, consegue atualizar `PUT /api/v1/houses/{id}`, mas recebe `400` ao tentar remover ou rebaixar o `OWNER`.
2. `PUT /api/v1/houses/{id}` em uma casa criada como `REPUBLIC` alterando `hasSharedFund = true, requireExpenseApproval = false, allMembersAdmin = true` classifica `presetType = "CUSTOM"` e promove imediatamente o morador `ACTIVE` já existente a `isAdmin = true`.

- [ ] **Step 2: Rodar `HouseRbacIntegrationTest` para confirmar falha**

Run: `cd backend && mvn -Dtest=HouseRbacIntegrationTest test`  
Expected: FAIL (`@NotBlank` no endereço ausente e regras de `allMembersAdmin` ainda não ativas).

- [ ] **Step 3: Implementar endereço opcional seguro, resolução de presets e `allMembersAdmin`**

- `HouseAddress`: campos opcionais, strings em branco normalizadas para `null`, e `toFullAddress()` retornando `""` quando todos os campos forem nulos/vazios (ou formatando apenas os campos presentes sem `"null"`).
- `HousePayloads`: remover `@NotBlank` do endereço em `CreateInput`; validar `state` apenas se preenchido (`Pattern` `^$|^[A-Za-z]{2}$`); adicionar `presetType`, `hasSharedFund`, `requireExpenseApproval`, `allMembersAdmin` em `CreateInput`, `UpdateInput` e `HouseView`.
- `HouseCommandHandler`: resolver combinação canônica de preset/regras na criação e no update; usar `security.requireAdmin` em `updateHouse`; promover membros ativos quando `allMembersAdmin` passar para `true`; atribuir `link.setAdmin(house.isAllMembersAdmin())` em `joinByInvite`.
- `HouseSecurityService.requireAdmin`, `AuthService.resolveIsAdmin` e `MemberView.of`: avaliar `membership.isOwner() || membership.isAdmin() || membership.getHouse().isAllMembersAdmin()`.

- [ ] **Step 4: Rodar `mvn test` para verificar aprovação**

Run: `cd backend && mvn test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/alpendre/backend/house backend/src/main/java/com/alpendre/backend/auth/AuthService.java backend/src/test/java/com/alpendre/backend/house/HouseRbacIntegrationTest.java
git commit -m "feat(house): implement presets, optional address, and shared admin governance"
```

---

### Task 3: Motor Financeiro Adaptável (`2 × 2`) e Agenda com RSVP Opcional (`requireRsvp`) no Backend

**Files:**
- Modify: `backend/src/main/java/com/alpendre/backend/finance/FinanceDTOs.java`
- Modify: `backend/src/main/java/com/alpendre/backend/finance/FinanceService.java`
- Modify: `backend/src/main/java/com/alpendre/backend/event/Event.java`
- Modify: `backend/src/main/java/com/alpendre/backend/event/EventDTOs.java`
- Modify: `backend/src/main/java/com/alpendre/backend/event/EventService.java`
- Test: `backend/src/test/java/com/alpendre/backend/finance/FinanceLedgerIntegrationTest.java`
- Test: `backend/src/test/java/com/alpendre/backend/event/EventAndNotificationIntegrationTest.java`

**Interfaces:**
- Consumes: `House.isHasSharedFund()`, `House.isRequireExpenseApproval()` da Task 2.
- Produces:
  - `FinancialDashboardSummaryView`: inclui `boolean hasSharedFund`, `boolean requireExpenseApproval`.
  - `EventView`: inclui `@JsonProperty("requireRsvp") boolean requireRsvp`; `CreateEventInput` e `UpdateEventInput` incluem `Boolean requireRsvp`.
  - Erros de negócio: `SHARED_FUND_DISABLED` (`400`) e `RSVP_NOT_ENABLED` (`400`).

- [ ] **Step 1: Escrever os testes de integração que falham em `FinanceLedgerIntegrationTest` e `EventAndNotificationIntegrationTest`**

1. Em `FinanceLedgerIntegrationTest`:
   - Casa `COUPLE_FAMILY` (`false, false`): `POST /expenses` nasce `APPROVED`, entra em `totalExpensesCurrentMonth`, `pendingExpensesCount == 0`, permite `PUT` e `DELETE` pelo criador/admin sem tocar `currentBalance`, e bloqueia `POST /incomes`, `POST /finances/{houseId}/adjust-balance` e `POST /expenses/{id}/reimburse` com `400` (`code = "SHARED_FUND_DISABLED"`).
   - Casa `(hasSharedFund = false, requireExpenseApproval = true)`: `POST /expenses` nasce `PENDING`; `POST /approve` muda para `APPROVED` e zera `pendingExpensesCount` sem tocar `currentBalance`; `POST /reimburse` retorna `400 SHARED_FUND_DISABLED`.
   - Casa `(hasSharedFund = true, requireExpenseApproval = false)`: receita de `500.00` + despesa de `120.00` nasce `REIMBURSED` com `currentBalance == 380.0`; `PUT` para `150.00` ajusta `currentBalance == 350.0`; `DELETE` estorna `currentBalance == 500.0`.
2. Em `EventAndNotificationIntegrationTest`:
   - Evento criado com `"requireRsvp": false` retorna `requireRsvp == false`, `invitations` vazia (`0`), aparece em `/api/v1/events/upcoming` e rejeita `PUT /api/v1/events/{id}/respond` e `POST /api/v1/events/{id}/invite` com `400` (`code = "RSVP_NOT_ENABLED"`).

- [ ] **Step 2: Rodar os dois testes para confirmar falha**

Run: `cd backend && mvn -Dtest=FinanceLedgerIntegrationTest,EventAndNotificationIntegrationTest test`  
Expected: FAIL.

- [ ] **Step 3: Implementar matriz financeira `2 × 2` em `FinanceService` e `requireRsvp` em `EventService`**

Implementar exatamente as transições e guardrails `SHARED_FUND_DISABLED` / `RSVP_NOT_ENABLED` definidos em `RF03` e `RF05` da Spec, expondo `hasSharedFund`/`requireExpenseApproval` em `FinancialDashboardSummaryView` e `requireRsvp` em `EventView`.

- [ ] **Step 4: Rodar toda a suíte backend**

Run: `cd backend && mvn test`  
Expected: `BUILD SUCCESS` com todas as suítes verdes.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/alpendre/backend/finance backend/src/main/java/com/alpendre/backend/event backend/src/test/java/com/alpendre/backend/finance backend/src/test/java/com/alpendre/backend/event
git commit -m "feat(backend): add adaptive 2x2 finance engine and optional event RSVP"
```

---

### Task 4: Rebrand Nativo Android/iOS/Expo (`com.alpendre.app`), Assets PNG `Alpendre` e `ThemeContext`

**Files:**
- Modify: `frontend/package.json`, `frontend/app.json`, `frontend/app.config.js`
- Modify: `frontend/android/app/build.gradle`, `frontend/android/app/src/main/AndroidManifest.xml`, `frontend/android/app/src/main/res/values/strings.xml`
- Move & Modify: `frontend/android/app/src/main/java/com/anonymous/rephelperfrontend/{MainActivity,MainApplication}.kt` → `frontend/android/app/src/main/java/com/alpendre/app/{MainActivity,MainApplication}.kt`
- Modify: `frontend/assets/images/{icon,adaptive-icon,splash-icon,favicon}.png`, `frontend/android/app/src/main/res/drawable-{mdpi,hdpi,xhdpi,xxhdpi}/splashscreen_logo.png`
- Modify: `frontend/src/design-system/theme/ThemeContext.tsx`
- Test: `frontend/src/design-system/__tests__/brandConfig.test.ts`, `frontend/src/utils/__tests__/envSecurity.test.ts`, `frontend/src/design-system/__tests__/ThemeContext.test.tsx`

**Interfaces:**
- Consumes: tokens de cor em `frontend/src/design-system/tokens/palette.ts`.
- Produces:
  - Identidade `Alpendre`, `slug: "alpendre"`, `scheme: "alpendre"`, pacote/bundle `com.alpendre.app` (`.dev` em dev), `ALPENDRE_UPLOAD_*`, `THEME_STORAGE_KEY = '@alpendre:theme_preference'`.

- [ ] **Step 1: Atualizar os testes em `brandConfig.test.ts`, `envSecurity.test.ts` e `ThemeContext.test.tsx`**

Exigir `name === 'Alpendre'`, `slug === 'alpendre'`, `scheme === 'alpendre'`, `package === 'com.alpendre.app'`, `android:scheme="alpendre"`, `ALPENDRE_UPLOAD_STORE_FILE` em `build.gradle`, `MainActivity.kt` sob `com/alpendre/app/` e `THEME_STORAGE_KEY === '@alpendre:theme_preference'`.

- [ ] **Step 2: Rodar Jest nesses 3 testes para confirmar falha**

Run: `cd frontend && npx jest src/design-system/__tests__/brandConfig.test.ts src/utils/__tests__/envSecurity.test.ts src/design-system/__tests__/ThemeContext.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Atualizar configs Expo/Android, mover Kotlin para `com.alpendre.app`, atualizar `ThemeContext` e regenerar os 8 PNGs com o símbolo `Alpendre`**

- Atualizar `package.json` (`alpendre-frontend`), `app.json`, `app.config.js`, `AndroidManifest.xml`, `strings.xml`, `build.gradle` (`namespace 'com.alpendre.app'`, `applicationId 'com.alpendre.app'`, `ALPENDRE_UPLOAD_*`), mover `MainActivity.kt` e `MainApplication.kt` para `com/alpendre/app` (`package com.alpendre.app`, removendo `com/anonymous`), e atualizar `THEME_STORAGE_KEY` em `ThemeContext.tsx`.
- Regenerar os 8 PNGs via script Node puro temporário (`zlib` + `fs`, removido após execução) desenhando o arco de alpendre + monograma `A` em `#1F4AA8` sobre `#F5F2EB` (`icon.png` `1024×1024`, `favicon.png` `48×48`) e sobre fundo transparente (`adaptive-icon.png` `1024×1024`, `splash-icon.png` `512×512`, `splashscreen_logo.png` `288/432/576/864`).

- [ ] **Step 4: Rodar `brandConfig.test.ts`, `envSecurity.test.ts` e `ThemeContext.test.tsx`**

Run: `cd frontend && npx jest src/design-system/__tests__/brandConfig.test.ts src/utils/__tests__/envSecurity.test.ts src/design-system/__tests__/ThemeContext.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/app.json frontend/app.config.js frontend/android frontend/assets/images frontend/src/design-system/theme/ThemeContext.tsx frontend/src/design-system/__tests__/brandConfig.test.ts frontend/src/design-system/__tests__/ThemeContext.test.tsx frontend/src/utils/__tests__/envSecurity.test.ts
git commit -m "feat(brand): migrate native package, scheme, theme storage, and brand PNGs to Alpendre"
```

---

### Task 5: Migração Estrutural `House` no Frontend (`app/(house)/*`, Modelos, Serviços, Hooks) + Presets e Endereço Opcional

**Files:**
- Create: `frontend/src/utils/housePresets.ts`, `frontend/src/utils/__tests__/housePresets.test.ts`
- Move & Refactor:
  - `frontend/src/models/republic.model.ts` → `frontend/src/models/house.model.ts`
  - `frontend/src/services/republicService.ts` → `frontend/src/services/houseService.ts`
  - `frontend/src/hooks/useRepublicMembers.ts` → `frontend/src/hooks/useHouseMembers.ts`
  - `frontend/src/hooks/__tests__/useRepublicMembers.test.ts` → `frontend/src/hooks/__tests__/useHouseMembers.test.ts`
  - `frontend/app/(republic)/{_layout,choice,new,join}.tsx` → `frontend/app/(house)/{_layout,choice,new,join}.tsx`
  - `frontend/app/(panel)/settings/republic.tsx` → `frontend/app/(panel)/settings/house.tsx`
- Modify: `frontend/src/models/{user,finances,task,taskFilter}.model.ts`, `frontend/src/services/{authService,financesService,taskService,notificationApiService}.ts`, `frontend/src/services/events/{eventsTypes,eventsService}.ts`, `frontend/src/hooks/{useHome,useFinances,useTasks,useEvents,useNotifications}.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/utils/authProtection.tsx`, `frontend/app/index.tsx`, `frontend/app/(panel)/settings/{index,members,_layout}.tsx`, e referências de `republicId` / `currentRepublicId` nas telas e testes existentes.

**Interfaces:**
- Consumes: API `/api/v1/houses` e `houseId` / `currentHouseId` das Tasks 1–3.
- Produces:
  - `src/utils/housePresets.ts`: `HousePresetType`, `HouseRulesConfig`, `HOUSE_PRESETS`, `applyHousePreset`, `resolvePresetFromRules`.
  - `src/models/house.model.ts`: `House`, `HouseAddress`, `HouseMember`, `CreateHouseRequest`, `UpdateHouseRequest`, `JoinHouseRequest`, `JoinHouseResponse`.
  - `User.currentHouseId` em `user.model.ts` e redirecionamento para `/(house)/choice` em `authProtection.tsx` / `app/index.tsx`.

- [ ] **Step 1: Escrever os testes unitários em `housePresets.test.ts` e migrar `useHouseMembers.test.ts`**

Validar `applyHousePreset` (`COUPLE_FAMILY`, `SHARED_APT`, `REPUBLIC`), `resolvePresetFromRules` (detectando `'CUSTOM'` quando as 3 chaves diferem dos presets) e o hook `useHouseMembers` consumindo `/api/v1/houses/{id}/members`.

- [ ] **Step 2: Rodar Jest nesses dois arquivos para confirmar falha**

Run: `cd frontend && npx jest src/utils/__tests__/housePresets.test.ts src/hooks/__tests__/useHouseMembers.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Executar a migração estrutural `republic` → `house` em modelos, serviços, hooks e rotas, e implementar Presets + Endereço Opcional em `app/(house)/new.tsx` e `app/(panel)/settings/house.tsx`**

- Remover os arquivos/pastas antigos (`republic.model.ts`, `republicService.ts`, `useRepublicMembers.ts`, `app/(republic)`, `settings/republic.tsx`) após criar as versões `house`.
- Atualizar `currentRepublicId` → `currentHouseId` e `republicId` → `houseId` em todos os modelos, serviços (`/api/v1/houses`, `?houseId=`), hooks e testes unitários existentes (`AuthContext.test.tsx`, `authProtection.test.ts`, `financesService.test.ts`, `taskService.test.ts`).
- Em `app/(house)/new.tsx`: seletor de presets (`Casal / Família` selecionado por padrão, `Amigos / Apê`, `República`), 3 controles personalizáveis (`Usar caixinha da casa`, `Exigir aprovação nas despesas`, `Todos os moradores administram`) e seção recolhível *"Endereço da casa (opcional)"*.
- Em `app/(panel)/settings/house.tsx`: edição de nome, presets/regras e endereço opcional liberada para qualquer `isAdmin || isOwner`.

- [ ] **Step 4: Rodar `typecheck` para validar 100% das rotas tipadas (`typedRoutes`) e contratos TS**

Run: `cd frontend && npm run typecheck && npx jest src/utils/__tests__/housePresets.test.ts src/hooks/__tests__/useHouseMembers.test.ts`  
Expected: PASS com `0` erros de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "refactor(frontend): migrate republic domain and routes to house with presets and optional address"
```

---

### Task 6: Fluxo Financeiro Adaptável (`Acompanhar Gastos` vs. `Caixinha`) no Frontend

**Files:**
- Modify: `frontend/src/models/finances.model.ts`
- Modify: `frontend/src/hooks/useFinances.ts`
- Modify: `frontend/app/(panel)/home.tsx`
- Modify: `frontend/app/(panel)/quick-actions.tsx`
- Modify: `frontend/app/(panel)/finances/**`
- Modify: `frontend/components/finances/**`
- Test: `frontend/src/utils/__tests__/screenDecomposition.test.ts`

**Interfaces:**
- Consumes: `FinancialDashboardSummary.hasSharedFund` e `FinancialDashboardSummary.requireExpenseApproval` da Task 3.
- Produces:
  - `buildExpenseTimelineSteps(expense: Expense, options?: { hasSharedFund?: boolean; requireExpenseApproval?: boolean }): ExpenseTimelineStep[]`.

- [ ] **Step 1: Atualizar `screenDecomposition.test.ts` com os casos que falham para casas sem caixinha**

Testar `buildExpenseTimelineSteps` com:
- `{ hasSharedFund: false, requireExpenseApproval: false }` + `status: 'APPROVED'` -> 1 passo concluído (`title: 'Registrada'`, `isLast: true`).
- `{ hasSharedFund: false, requireExpenseApproval: true }` -> 2 passos (`'created'` e `'approval'`, `isLast: true`), sem `'reimbursement'`.

- [ ] **Step 2: Rodar `screenDecomposition.test.ts` para confirmar falha**

Run: `cd frontend && npx jest src/utils/__tests__/screenDecomposition.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Adaptar `HomeScreen`, `QuickActions`, `FinancesDashboardScreen`, `FinancialSummary`, `MonthlyChart`, `PendingActions`, `ExpenseDetails` e `ExpenseTimeline`**

- Quando `hasSharedFund === false`:
  - `HomeScreen` e `FinancialSummary` destacam **"Gastos no mês"** (`totalExpensesCurrentMonth`) em vez de saldo de caixinha e ocultam ajuste de saldo.
  - `FinancesDashboardScreen` e `QuickActions` ocultam a aba `'incomes'` e ações de `"Nova receita"`; `MonthlyChart` plota apenas a série de gastos.
  - `ExpenseDetails` e `ExpenseTimeline` ocultam o passo/botão `"Reembolsar"`, exibem `"Registrada"` para `APPROVED` quando `requireExpenseApproval === false` e liberam edição/exclusão pelo criador ou admin conforme a regra da casa.
  - Quando `requireExpenseApproval === false`, `PendingActions` permanece oculto.

- [ ] **Step 4: Rodar `typecheck` e `screenDecomposition.test.ts`**

Run: `cd frontend && npm run typecheck && npx jest src/utils/__tests__/screenDecomposition.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/models/finances.model.ts frontend/src/hooks/useFinances.ts "frontend/app/(panel)/home.tsx" "frontend/app/(panel)/quick-actions.tsx" "frontend/app/(panel)/finances" frontend/components/finances frontend/src/utils/__tests__/screenDecomposition.test.ts
git commit -m "feat(frontend): adapt home and finance screens to shared-fund vs expense-tracking house modes"
```

---

### Task 7: Agenda com RSVP Opcional, Revisão Completa de Microcopy `Alpendre` e Guardrail Clean-Slate (Frontend)

**Files:**
- Modify: `frontend/src/services/events/eventsTypes.ts`, `frontend/src/services/events/eventsService.ts`
- Modify: `frontend/app/(panel)/events/**`, `frontend/components/events/**`
- Modify: `frontend/app/(panel)/tasks/**`, `frontend/components/tasks/**`
- Modify: `frontend/components/notifications/**`, `frontend/src/services/notifications.ts`, `frontend/src/services/calendar/calendarService.ts`
- Modify: `frontend/app/(auth)/**`, `frontend/app/(panel)/settings/{about,help,privacy-policy,terms-of-use}.tsx`
- Create: `frontend/src/design-system/__tests__/cleanSlateGuardrails.test.ts`

**Interfaces:**
- Consumes: `Event.requireRsvp` da Task 3.
- Produces:
  - Toggle `requireRsvp` nas telas de criação/edição de evento e modo *"Aviso na agenda"* nos cards/detalhes.
  - Guardrail automatizado `cleanSlateGuardrails.test.ts` validando zero resíduos de `rephelper` / `republic` (exceto o identificador de preset `'REPUBLIC'` / `'República'` em `housePresets.ts` e telas de seleção de preset).

- [ ] **Step 1: Criar `frontend/src/design-system/__tests__/cleanSlateGuardrails.test.ts`**

Varrer todos os arquivos `.ts`/`.tsx` em `frontend/app`, `frontend/components` e `frontend/src` (ignorando `__tests__`), verificando:
1. Zero ocorrências de `/rep\s?helper/i`.
2. Zero ocorrências de `/\brepublic(?:a|s|Id|Name|Service|Member)?\b/i` em identificadores/rotas/imports, permitindo a palavra em português `/repúblicas?/i` ou o literal `'REPUBLIC'` apenas nos arquivos autorizados de preset/onboarding/sobre (`src/utils/housePresets.ts`, `app/(house)/new.tsx`, `app/(panel)/settings/house.tsx`, `app/(panel)/settings/about.tsx`).
3. Presença de `'Alpendre'` e `'contato@alpendre.app'` em `app/(panel)/settings/about.tsx`.

- [ ] **Step 2: Rodar `cleanSlateGuardrails.test.ts` para listar todos os pontos residuais**

Run: `cd frontend && npx jest src/design-system/__tests__/cleanSlateGuardrails.test.ts`  
Expected: FAIL listando os arquivos restantes com copy antiga.

- [ ] **Step 3: Implementar `requireRsvp` na Agenda e concluir a revisão de microcopy `Alpendre` / `Casa / Moradores` em todos os arquivos apontados**

- Adicionar o toggle *"Pedir confirmação de presença dos moradores"* em `events/create.tsx` e `events/edit/[id].tsx`, e ocultar botões/abas de RSVP quando `requireRsvp === false` em `events/[id].tsx` e `events/index.tsx`.
- Atualizar textos em `(auth)`, `tasks`, `events`, `notifications`, `calendarService` e `settings/{about,help,privacy-policy,terms-of-use}.tsx` para **Alpendre**, `contato@alpendre.app`, `www.alpendre.app`, `@alpendre.app` e vocabulário **Casa / Moradores**.

- [ ] **Step 4: Rodar `typecheck` e toda a suíte Jest do frontend**

Run: `cd frontend && npm run typecheck && npm run test:ci`  
Expected: PASS em 100% das suítes Jest (incluindo `cleanSlateGuardrails.test.ts`, `designSystemGuardrails.test.ts`, `brandConfig.test.ts` e `envSecurity.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add optional event RSVP, complete Alpendre copy sweep, and enforce clean-slate guardrails"
```

---

### Task 8: Refatoração Integral da Documentação (`README.md`, `SECURITY.md`, `backend/README.md` e `docs/`) e Verificação Final

**Files:**
- Modify: `README.md`, `SECURITY.md`, `backend/README.md`, `frontend/src/services/README.md`
- Rename & Modify: `docs/designs/rep-helper-backend-monorepo.md` → `docs/designs/alpendre-backend-monorepo.md`
- Modify: `docs/arquitetura-e-modelagem/introducao.md`
- Modify: `docs/arquitetura-e-modelagem/visao-geral-arquitetura.md`
- Modify: `docs/arquitetura-e-modelagem/modelo-de-dados.md`
- Modify: `docs/arquitetura-e-modelagem/schema-postgresql-flyway.md`
- Modify: `docs/arquitetura-e-modelagem/diagramas-de-estados-e-sequencia.md`
- Modify: `docs/arquitetura-e-modelagem/especificacao-api-rest.md`
- Modify: `docs/arquitetura-e-modelagem/setup-ambiente-e-infraestrutura.md`

**Interfaces:**
- Consumes: estado final validado das Tasks 1 a 7.
- Produces: documentação de produto, requisitos funcionais, DER, DDL, diagramas de estados e contratos REST 100% alinhada ao **Alpendre**.

- [ ] **Step 1: Atualizar `README.md`, `SECURITY.md`, `backend/README.md` e `frontend/src/services/README.md`**

Documentar o **Alpendre** como plataforma full-stack para casas compartilhadas (casais, famílias, amigos e repúblicas), destacando presets configuráveis, financeiro adaptável, agenda com RSVP opcional, arquitetura `com.alpendre.backend` + `/api/v1/houses` + `com.alpendre.app` e contagens atualizadas de testes.

- [ ] **Step 2: Atualizar os 7 arquivos de `docs/arquitetura-e-modelagem/` e migrar `docs/designs/alpendre-backend-monorepo.md`**

Atualizar DER (`houses`, `house_members`, `house_id`, `current_house_id`), script DDL (`V1__init_schema.sql`), máquinas de estado de `Expense` (matriz `2 × 2`), especificação `/api/v1/houses` e variáveis de infraestrutura `alpendre`, preservando os arquivos históricos de `docs/qa/` e `docs/specs/` anteriores intactos como registro de engenharia.

- [ ] **Step 3: Rodar validação full-stack ponta a ponta**

Run: `cd backend && mvn test && cd ../frontend && npm run typecheck && npm run test:ci`  
Expected: `BUILD SUCCESS` no backend e `0` falhas no typecheck + Jest do frontend.

- [ ] **Step 4: Commit**

```bash
git add README.md SECURITY.md backend/README.md frontend/src/services/README.md docs
git commit -m "docs: rewrite architecture, data model, API spec, and product docs for Alpendre"
```
