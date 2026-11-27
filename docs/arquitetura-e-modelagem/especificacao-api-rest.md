# Especificação da API REST (`/api/v1/*`) — Alpendre

Este catálogo documenta os endpoints reais expostos pelo back-end **Spring Boot 3.4** (`backend/`, pacote `com.alpendre.backend`) e consumidos pelos serviços Axios do aplicativo **Expo** (`frontend/src/services/*.ts`).

---

## 1. Convenções Gerais e Tratamento de Erros

- **Autenticação**: Header HTTP `Authorization: Bearer <accessToken>` em todas as rotas protegidas.
- **Correlação**: Header opcional `X-Request-Id` preservado no MDC de log e retornado na resposta.
- **Formato padrão de erro (`ApiErrorResponse`)**:
  ```json
  {
    "timestamp": "2026-11-27T15:00:00Z",
    "status": 400,
    "error": "Bad Request",
    "message": "Mensagem descritiva em português",
    "code": "BUSINESS_OR_VALIDATION_CODE",
    "requestId": "uuid",
    "errors": { "campo": "detalhe" }
  }
  ```
- **Códigos de Domínio Adaptáveis**:
  - `SHARED_FUND_DISABLED` (`400`): retornado ao acionar endpoints de caixinha (`/api/v1/incomes`, `/adjust-balance` ou `/reimburse`) em uma casa configurada com `hasSharedFund = false`.
  - `RSVP_NOT_ENABLED` (`400`): retornado ao tentar convidar ou responder presença (`/invite` ou `/respond`) em um evento informativo com `requireRsvp = false`.

---

## 2. Infraestrutura e Saúde

| Método | Endpoint | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Público | Verifica disponibilidade da API, PostgreSQL e diretório de mídia (`/var/lib/alpendre/media`). Retorna `{ "status": "UP", "database": "UP", "storage": "UP" }`. |
| `GET` | `/swagger-ui.html`, `/v3/api-docs/**` | Público | Documentação OpenAPI interativa (Springdoc). |

---

## 3. Autenticação (`/api/v1/auth`)

Rate limiting aplicado em memória por IP (`20 req/min`) para `signup`, `login`, `forgot-password` e `reset-password`.

| Método | Endpoint | Acesso | Payload / Resposta |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | Público | Entrada: `{ name, nickname?, email, phoneNumber?, profilePictureUrl?, password (min 8) }`. Retorno `201 Created`: `{ token, refreshToken, user }`. |
| `POST` | `/api/v1/auth/login` | Público | Entrada: `{ email, password }`. Retorno `200 OK`: `{ token, refreshToken, user }`. |
| `POST` | `/api/v1/auth/google` | Público | Entrada: `{ idToken?, accessToken? }`. Valida assinatura RS256 JWKS do Google (ou `/oauth2/v3/userinfo` fallback). Retorno `200 OK`: `{ token, refreshToken, user }`. |
| `POST` | `/api/v1/auth/refresh` | Público | Entrada: `{ refreshToken }`. Valida SHA-256 em `refresh_tokens`, revoga o anterior e emite novo `{ token, refreshToken, user }`. |
| `POST` | `/api/v1/auth/logout` | Autenticado | Entrada opcional `{ refreshToken? }`. Revoga token informado (ou todos os do morador). Retorno `204 No Content`. |
| `POST` | `/api/v1/auth/change-password` | Autenticado | Entrada: `{ currentPassword, newPassword }`. Atualiza hash BCrypt e revoga refresh tokens ativos. |
| `POST` | `/api/v1/auth/forgot-password` | Público | Entrada: `{ email }`. Anti-enumeração (sempre `200 OK`). Cooldown 60s; envia código de 6 dígitos pós-commit. |
| `POST` | `/api/v1/auth/reset-password` | Público | Entrada: `{ email, code (6 dígitos), newPassword }`. Máximo 5 tentativas, expiração em 15 min; revoga sessões após troca. |

---

## 4. Moradores / Usuários (`/api/v1/users`)

| Método | Endpoint | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | Autenticado | Retorna `{ "user": UserDTO }` (inclui `currentHouseId` e `isAdmin` calculado na casa ativa). |
| `PUT` | `/api/v1/users/{uid}` | Próprio usuário | Atualiza `name`, `nickname`, `phoneNumber`, `profilePictureUrl`. Aceita `null` explícito via `JsonNode` para limpar `nickname` ou `profilePictureUrl` (removendo arquivo local substituído). |

---

## 5. Armazenamento de Mídia Local (`/api/v1/media`)

Rate limiting aplicado em memória (`30 req/min` por IP em uploads). Buckets permitidos: `avatars`, `receipts`. Limite: `5 MB`.

| Método | Endpoint | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/media/{bucket}` | Autenticado | `multipart/form-data` com campo `file`. Validação em passada única por magic bytes (`JPEG`, `PNG`, `WebP`, `GIF`). Retorno `201 Created`: `{ url, bucket, filename, contentType }`. |
| `GET` | `/api/v1/media/public/{bucket}/{userId}/{filename}` | Público | Serve imagem do volume persistente com cache imutável (`max-age=365d`) e `X-Content-Type-Options: nosniff`. |
| `DELETE` | `/api/v1/media/{bucket}/{filename}` | Dono do arquivo | Remove arquivo pertencente a `principal.getUid()`. Retorno `204 No Content`. |

---

## 6. Casas, Presets e Moradores (`/api/v1/houses`)

| Método | Endpoint | Regra de Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/houses/code-length` | Autenticado | Retorna `{ "length": 6, "codeLength": 6 }`. |
| `POST` | `/api/v1/houses` | Autenticado | Cria casa com `name` obrigatório, preset/regras opcionais (`presetType`, `hasSharedFund`, `requireExpenseApproval`, `allMembersAdmin` — padrão `COUPLE_FAMILY`) e endereço postal opcional (`street`..`zipCode`); vincula criador como `OWNER` e `ADMIN`; retorna `201 Created` com `{ house, user, token, refreshToken, message }`. |
| `GET` | `/api/v1/houses/{id}` | Morador ativo | Detalhes da casa (`HouseView` com `presetType`, regras booleanas, `address` opcional e contagem de moradores). |
| `PUT` | `/api/v1/houses/{id}` | Admin / Owner ativo | Atualiza nome, preset, regras (`hasSharedFund`, `requireExpenseApproval`, `allMembersAdmin` — promovendo moradores ativos caso `allMembersAdmin` seja ativado) e endereço opcional (campos planos ou `address: { ... }`). |
| `POST` | `/api/v1/houses/join` | Autenticado | Entrada: `{ code }`. Vincula morador (com `isAdmin = true` se `house.allMembersAdmin == true`) e retorna `{ token, refreshToken, user, house, message }`. |
| `GET` | `/api/v1/houses/{id}/members` | Morador ativo | Lista moradores ativos ordenados por entrada (`id`, `uid`, `isAdmin`, `isOwner`, `entryDate`). |
| `POST` | `/api/v1/houses/{id}/members/{memberId}/admin` | Admin / Owner | Promove morador ativo a administrador. |
| `DELETE` | `/api/v1/houses/{id}/members/{memberId}/admin` | Owner | Rebaixa administrador para morador regular (bloqueado quando `allMembersAdmin == true` ou para o próprio `OWNER`). |
| `DELETE` | `/api/v1/houses/{id}/members/{memberId}` | Admin / Owner ou próprio | Inativa morador (`OWNER` é estritamente protegido contra remoção) e limpa `currentHouseId` do usuário removido. |
| `POST` | `/api/v1/houses/{id}/regenerate-code` | Admin / Owner | Gera código aleatório de 6 caracteres ou valida `customCode` / `code`. Retorno `{ code, message }`. |

---

## 7. Tarefas (`/api/v1/tasks`)

| Método | Endpoint | Regra de Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/tasks/{id}` | Morador ativo | Retorna `TaskView` (`houseId`, `assignedUsers`, `assigned_users`, `recurring`, `isRecurring`, etc.). |
| `GET` | `/api/v1/tasks?houseId=` | Morador ativo | Lista tarefas da casa ordenadas por prazo e criação (usa `currentHouseId` se omitido). |
| `POST` | `/api/v1/tasks/filter?houseId=` | Morador ativo | Paginação e filtros dinâmicos (`TaskSpecifications`: status, categoria, recorrência, atraso, datas, responsáveis, busca textual). |
| `GET` | `/api/v1/tasks/assigned?houseId=` | Morador ativo | Tarefas atribuídas ao morador autenticado. |
| `POST` | `/api/v1/tasks/assigned/filter` | Morador ativo | Versão paginada e filtrada das tarefas atribuídas ao morador atual. |
| `POST` | `/api/v1/tasks` | Morador ativo | Cria tarefa (`PENDING`), reconcilia `assigned_users` ativos e notifica responsáveis. |
| `PUT` | `/api/v1/tasks/{id}` | Morador ativo | Atualiza campos parciais e reconcilia atomicamente `assigned_users` (incluindo remoção). |
| `POST` | `/api/v1/tasks/{id}/complete` | Morador ativo | Bloqueio `PESSIMISTIC_WRITE`, marca `COMPLETED` de forma idempotente e cria próxima instância `PENDING` se recorrente dentro de `recurrenceEndDate`. |
| `POST` | `/api/v1/tasks/{id}/cancel` | Morador ativo | Cancela tarefa não concluída. |
| `DELETE` | `/api/v1/tasks/{id}` | Morador ativo | Exclui tarefa da casa. |
| `POST` | `/api/v1/tasks/{id}/assign` | Morador ativo | Atribui morador `{ userId }` ativo e emite notificação. |
| `POST` | `/api/v1/tasks/{id}/unassign` | Morador ativo | Remove atribuição do `{ userId }`. |

---

## 8. Módulo Financeiro Adaptável (`/api/v1/expenses`, `/api/v1/incomes`, `/api/v1/financial-dashboard`, `/api/v1/finances`)

Todas as mutações de `houses.current_balance` executam `PESSIMISTIC_WRITE` em `House` via `HouseBalanceLedger` (e lock prévio em `Expense`/`Income` para evitar deadlocks).

### 8.1 Despesas (`/api/v1/expenses`)
- `GET /api/v1/expenses?houseId=`, `GET /api/v1/expenses/status/{status}?houseId=`, `GET /api/v1/expenses/{id}`
- `POST /api/v1/expenses`:
  - `(false, false)` [Acompanhar Gastos]: nasce `APPROVED` (*"Registrada"*), saldo inalterado.
  - `(false, true)` [Aprovação sem Caixinha]: nasce `PENDING`, saldo inalterado.
  - `(true, false)` [Caixinha Direta]: nasce `REIMBURSED`, debita `-amount` imediatamente do saldo.
  - `(true, true)` [Caixinha com Aprovação]: nasce `PENDING`, saldo inalterado.
- `PUT /api/v1/expenses/{id}`: Editável por criador/admin enquanto `PENDING`, ou em estados auto-registrados quando `requireExpenseApproval == false` (ajustando `previousAmount - newAmount` se `REIMBURSED`).
- `POST /api/v1/expenses/{id}/approve`: Admin/Owner (`PENDING -> APPROVED`, sem alterar saldo, notifica criador).
- `POST /api/v1/expenses/{id}/reject`: Admin/Owner (`{ reason }`, `PENDING|APPROVED -> REJECTED`, notifica criador).
- `POST /api/v1/expenses/{id}/reimburse`: Admin/Owner. Requer `hasSharedFund == true` (caso contrário `400 SHARED_FUND_DISABLED`); transiciona `APPROVED -> REIMBURSED` e debita `-amount` do saldo.
- `POST /api/v1/expenses/{id}/reset`: Admin/Owner (volta para `PENDING`; se estava `REIMBURSED` com caixinha, estorna `+amount` ao saldo).
- `DELETE /api/v1/expenses/{id}`: Exclui despesa (se `REIMBURSED` em casa com aprovação exige admin e estorna `+amount` ao saldo; remove comprovante órfão).

### 8.2 Entradas da Caixinha (`/api/v1/incomes`) — Requer `hasSharedFund == true`
- `GET /api/v1/incomes?houseId=`, `GET /api/v1/incomes/{id}`
- `POST /api/v1/incomes`: Credita `+amount` no saldo da casa (retorna `400 SHARED_FUND_DISABLED` se `hasSharedFund == false`).
- `PUT /api/v1/incomes/{id}`: Aplica `delta = novoValor - valorAnterior` no saldo (`400 SHARED_FUND_DISABLED` se desativada).
- `DELETE /api/v1/incomes/{id}`: Subtrai `-amount` do saldo e limpa comprovante (`400 SHARED_FUND_DISABLED` se desativada).

### 8.3 Dashboard e Ajuste de Saldo
- `GET /api/v1/financial-dashboard/summary/{houseId}`: Retorna `hasSharedFund`, `requireExpenseApproval`, saldo atual, totais por status, acumulados do mês atual e quebra por categoria.
- `GET /api/v1/financial-dashboard/expenses/monthly/{houseId}?numberOfMonths=6`: Série mensal `YYYY-MM` (`1..24` meses).
- `GET /api/v1/financial-dashboard/pending-actions/{houseId}`: Despesas aguardando aprovação ou reembolso conforme as regras ativas da casa.
- `POST /api/v1/finances/{houseId}/adjust-balance`: Admin/Owner. Requer `hasSharedFund == true` (`400 SHARED_FUND_DISABLED` se desativada); `amount` define o novo saldo alvo e registra auditoria em `balance_adjustments`.

---

## 9. Agenda (`/api/v1/events`) e Notificações (`/api/v1/notifications`)

- **Eventos (`/api/v1/events`)**:
  - `GET /api/v1/events?houseId=`, `GET /api/v1/events/upcoming`, `GET /api/v1/events/invited`, `GET /api/v1/events/confirmed`, `GET /api/v1/events/{id}`
  - `POST /api/v1/events`: Aceita `requireRsvp` (`true` padrão). Se `true`, confirma o criador automaticamente; se `false`, cria aviso informativo sem convites (`invitations = []`).
  - `PUT /api/v1/events/{id}`, `DELETE /api/v1/events/{id}`
  - `PUT /api/v1/events/{id}/respond` (`{ status: 'INVITED' | 'CONFIRMED' | 'DECLINED' }`) e `POST /api/v1/events/{id}/invite` (`{ userIds }`): retornam `400 RSVP_NOT_ENABLED` quando `event.requireRsvp == false`.
- **Notificações (`/api/v1/notifications`)**:
  - `GET /api/v1/notifications`, `GET /api/v1/notifications/unread`, `GET /api/v1/notifications/count` (`{ count }`), `GET /api/v1/notifications/{id}`
  - `POST /api/v1/notifications/{id}/read`, `POST /api/v1/notifications/mark-all-read`
  - `POST /api/v1/notifications` (restringe destinatários à mesma casa ativa), `DELETE /api/v1/notifications/{id}`, `DELETE /api/v1/notifications/clear-old?days=30`
