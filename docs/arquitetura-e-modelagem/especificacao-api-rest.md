# Especificação da API REST (`/api/v1/*`)

Este catálogo documenta os endpoints reais expostos pelo back-end **Spring Boot 3.4** (`backend/`) e consumidos pelos serviços Axios do aplicativo **Expo** (`frontend/src/services/*.ts`).

---

## 1. Convenções Gerais e Tratamento de Erros

- **Autenticação**: Header HTTP `Authorization: Bearer <accessToken>` em todas as rotas protegidas.
- **Correlação**: Header opcional `X-Request-Id` preservado no MDC de log e retornado na resposta.
- **Formato padrão de erro (`ApiErrorResponse`)**:
  ```json
  {
    "timestamp": "2026-11-23T13:30:00Z",
    "status": 400,
    "error": "Bad Request",
    "message": "Mensagem descritiva em português",
    "code": "BUSINESS_OR_VALIDATION_CODE",
    "requestId": "uuid",
    "errors": { "campo": "detalhe" }
  }
  ```

---

## 2. Infraestrutura e Saúde

| Método | Endpoint | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Público | Verifica disponibilidade da API, PostgreSQL e diretório de mídia. Retorna `{ "status": "UP", "database": "UP", "storage": "UP" }`. |
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
| `POST` | `/api/v1/auth/logout` | Autenticado | Entrada opcional `{ refreshToken? }`. Revoga token informado (ou todos os do usuário). Retorno `204 No Content`. |
| `POST` | `/api/v1/auth/change-password` | Autenticado | Entrada: `{ currentPassword, newPassword }`. Atualiza hash BCrypt e revoga refresh tokens ativos. |
| `POST` | `/api/v1/auth/forgot-password` | Público | Entrada: `{ email }`. Anti-enumeração (sempre `200 OK`). Cooldown 60s; envia código de 6 dígitos pós-commit. |
| `POST` | `/api/v1/auth/reset-password` | Público | Entrada: `{ email, code (6 dígitos), newPassword }`. Máximo 5 tentativas, expiração em 15 min; revoga sessões após troca. |

---

## 4. Usuários (`/api/v1/users`)

| Método | Endpoint | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | Autenticado | Retorna `{ "user": UserDTO }` (inclui `isAdmin` calculado na república ativa). |
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

## 6. Repúblicas e Membros (`/api/v1/republics`)

| Método | Endpoint | Regra de Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/republics/code-length` | Autenticado | Retorna `{ "length": 6, "codeLength": 6 }`. |
| `POST` | `/api/v1/republics` | Autenticado | Cria república + vincula criador como `OWNER` e `ADMIN`; retorna `201 Created` com `{ republic, user, token, refreshToken, message }`. |
| `GET` | `/api/v1/republics/{id}` | Membro ativo | Detalhes da república (`RepublicView` com `address` e contagem de membros). |
| `PUT` | `/api/v1/republics/{id}` | Proprietário (`OWNER`) | Atualiza nome e endereço (aceita campos planos ou `address: { ... }`, alias `zip_code` -> `zipCode`). |
| `POST` | `/api/v1/republics/join` | Autenticado | Entrada: `{ code }`. Vincula usuário e retorna `{ token, refreshToken, user, republic, message }`. |
| `GET` | `/api/v1/republics/{id}/members` | Membro ativo | Lista membros ativos ordenados por entrada (`id`, `uid`, `isAdmin`, `isOwner`, `entryDate`). |
| `POST` | `/api/v1/republics/{id}/members/{memberId}/admin` | Admin / Owner | Promove membro ativo a administrador. |
| `DELETE` | `/api/v1/republics/{id}/members/{memberId}/admin` | Proprietário (`OWNER`) | Rebaixa administrador para membro regular. |
| `DELETE` | `/api/v1/republics/{id}/members/{memberId}` | Admin / Owner ou próprio | Inativa membro (proprietário protegido) e limpa `currentRepublicId` do usuário. |
| `POST` | `/api/v1/republics/{id}/regenerate-code` | Admin / Owner | Gera código aleatório de 6 caracteres ou valida `customCode` / `code`. Retorno `{ code, message }`. |

---

## 7. Tarefas (`/api/v1/tasks`)

| Método | Endpoint | Regra de Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/tasks/{id}` | Membro ativo | Retorna `TaskView` (`assignedUsers`, `assigned_users`, `recurring`, `isRecurring`, etc.). |
| `GET` | `/api/v1/tasks?republicId=` | Membro ativo | Lista tarefas da república ordenadas por prazo e criação. |
| `POST` | `/api/v1/tasks/filter?republicId=` | Membro ativo | Paginação e filtros dinâmicos (`TaskSpecifications`: status, categoria, recorrência, atraso, datas, responsáveis, busca textual). |
| `GET` | `/api/v1/tasks/assigned?republicId=` | Membro ativo | Tarefas atribuídas ao usuário autenticado. |
| `POST` | `/api/v1/tasks/assigned/filter` | Membro ativo | Versão paginada e filtrada das tarefas atribuídas ao usuário atual. |
| `POST` | `/api/v1/tasks` | Membro ativo | Cria tarefa (`PENDING`), reconcilia `assigned_users` ativos e notifica responsáveis. |
| `PUT` | `/api/v1/tasks/{id}` | Membro ativo | Atualiza campos parciais e reconcilia atomicamente `assigned_users` (incluindo remoção). |
| `POST` | `/api/v1/tasks/{id}/complete` | Membro ativo | Bloqueio `PESSIMISTIC_WRITE`, marca `COMPLETED` de forma idempotente e cria próxima instância `PENDING` se recorrente dentro de `recurrenceEndDate`. |
| `POST` | `/api/v1/tasks/{id}/cancel` | Membro ativo | Cancela tarefa não concluída. |
| `DELETE` | `/api/v1/tasks/{id}` | Membro ativo | Exclui tarefa da república. |
| `POST` | `/api/v1/tasks/{id}/assign` | Membro ativo | Atribui usuário `{ userId }` (membro ativo) e emite notificação. |
| `POST` | `/api/v1/tasks/{id}/unassign` | Membro ativo | Remove atribuição do `{ userId }`. |

---

## 8. Módulo Financeiro (`/api/v1/expenses`, `/api/v1/incomes`, `/api/v1/financial-dashboard`, `/api/v1/finances`)

Todas as mutações de `republics.current_balance` executam `PESSIMISTIC_WRITE` em `Republic` via `RepublicBalanceLedger` (e lock prévio em `Expense`/`Income` para evitar deadlocks).

### 8.1 Despesas (`/api/v1/expenses`)
- `GET /api/v1/expenses?republicId=`, `GET /api/v1/expenses/status/{status}?republicId=`, `GET /api/v1/expenses/{id}`
- `POST /api/v1/expenses`: Cria despesa em `PENDING` (**não** altera saldo).
- `PUT /api/v1/expenses/{id}`: Editável por criador/admin apenas enquanto `PENDING`.
- `POST /api/v1/expenses/{id}/approve`: Admin/Owner (`PENDING -> APPROVED`, sem alterar saldo, notifica criador).
- `POST /api/v1/expenses/{id}/reject`: Admin/Owner (`{ reason }`, `PENDING|APPROVED -> REJECTED`, notifica criador).
- `POST /api/v1/expenses/{id}/reimburse`: Admin/Owner (`APPROVED -> REIMBURSED`, **debita `-amount` do saldo**, notifica criador).
- `POST /api/v1/expenses/{id}/reset`: Admin/Owner (volta para `PENDING`; se estava `REIMBURSED`, **estorna `+amount` ao saldo**).
- `DELETE /api/v1/expenses/{id}`: Exclui despesa (se `REIMBURSED`, exige admin e **estorna `+amount` ao saldo**; remove comprovante órfão).

### 8.2 Receitas (`/api/v1/incomes`)
- `GET /api/v1/incomes?republicId=`, `GET /api/v1/incomes/{id}`
- `POST /api/v1/incomes`: Credita `+amount` imediatamente no saldo da república.
- `PUT /api/v1/incomes/{id}`: Aplica `delta = novoValor - valorAnterior` no saldo.
- `DELETE /api/v1/incomes/{id}`: Subtrai `-amount` do saldo e limpa comprovante.

### 8.3 Dashboard e Ajuste de Saldo
- `GET /api/v1/financial-dashboard/summary/{republicId}`: Saldo atual, totais, pendentes, aprovadas, rejeitadas, reembolsadas e acumulados do mês UTC atual.
- `GET /api/v1/financial-dashboard/expenses/monthly/{republicId}?numberOfMonths=6`: Série mensal `YYYY-MM` (`1..24` meses).
- `GET /api/v1/financial-dashboard/pending-actions/{republicId}`: Despesas `PENDING` e `APPROVED` aguardando ação.
- `POST /api/v1/finances/{republicId}/adjust-balance`: Admin/Owner. `amount` define o **novo saldo alvo** (registra auditoria em `balance_adjustments` e retorna `FinancialDashboardSummaryView`).

---

## 9. Eventos (`/api/v1/events`) e Notificações (`/api/v1/notifications`)

- **Eventos**:
  - `GET /api/v1/events`, `GET /api/v1/events/upcoming`, `GET /api/v1/events/invited`, `GET /api/v1/events/confirmed`, `GET /api/v1/events/{id}`
  - `POST /api/v1/events` (valida `endDate > startDate`, confirma criador automaticamente e notifica convidados), `PUT /api/v1/events/{id}`, `DELETE /api/v1/events/{id}`
  - `PUT /api/v1/events/{id}/respond` (`{ status: 'INVITED' | 'CONFIRMED' | 'DECLINED' }`), `POST /api/v1/events/{id}/invite` (`{ userIds }`)
- **Notificações**:
  - `GET /api/v1/notifications`, `GET /api/v1/notifications/unread`, `GET /api/v1/notifications/count` (`{ count }`), `GET /api/v1/notifications/{id}`
  - `POST /api/v1/notifications/{id}/read`, `POST /api/v1/notifications/mark-all-read`
  - `POST /api/v1/notifications` (restringe destinatários externos à mesma república ativa), `DELETE /api/v1/notifications/{id}`, `DELETE /api/v1/notifications/clear-old?days=30`
