# Modelo de Dados e Diagrama Entidade-Relacionamento (PostgreSQL 16)

Este documento descreve a modelagem relacional do **RepHelper** implementada na migração inicial do Flyway (`V1__init_schema.sql`), alinhada ao banco **PostgreSQL 16** e às entidades JPA do módulo `backend/`.

---

## 1. Diagrama Entidade-Relacionamento (DER)

```mermaid
erDiagram
    USERS ||--o{ REPUBLICS : "possui (owner_id)"
    USERS ||--o{ REPUBLIC_MEMBERS : "participa via"
    REPUBLICS ||--o{ REPUBLIC_MEMBERS : "contém"
    USERS ||--o{ REFRESH_TOKENS : "emite"
    USERS ||--o{ PASSWORD_RESET_TOKENS : "solicita"
    REPUBLICS ||--o{ TASKS : "mantém"
    USERS ||--o{ TASKS : "cria"
    TASKS ||--o{ TASKS : "gera recorrente (parent_task_id)"
    TASKS ||--o{ TASK_ASSIGNEES : "atribui"
    USERS ||--o{ TASK_ASSIGNEES : "responsável em"
    REPUBLICS ||--o{ EXPENSES : "registra"
    USERS ||--o{ EXPENSES : "cria / aprova"
    REPUBLICS ||--o{ INCOMES : "recebe"
    USERS ||--o{ INCOMES : "cria / contribui"
    REPUBLICS ||--o{ BALANCE_ADJUSTMENTS : "audita saldo"
    USERS ||--o{ BALANCE_ADJUSTMENTS : "executa ajuste"
    REPUBLICS ||--o{ EVENTS : "organiza"
    USERS ||--o{ EVENTS : "cria"
    EVENTS ||--o{ EVENT_INVITATIONS : "convida"
    USERS ||--o{ EVENT_INVITATIONS : "responde"
    USERS ||--o{ NOTIFICATIONS : "recebe"
    REPUBLICS ||--o{ NOTIFICATIONS : "origina"

    USERS {
        UUID uid PK
        VARCHAR name
        VARCHAR nickname
        VARCHAR email UK
        VARCHAR phone_number
        VARCHAR profile_picture_url
        VARCHAR password_hash
        VARCHAR provider
        VARCHAR firebase_uid
        UUID current_republic_id FK
        VARCHAR status
        TIMESTAMPTZ created_at
        TIMESTAMPTZ last_login
    }

    REPUBLICS {
        UUID id PK
        VARCHAR name
        VARCHAR code UK
        VARCHAR street
        VARCHAR number
        VARCHAR complement
        VARCHAR neighborhood
        VARCHAR city
        VARCHAR state
        VARCHAR zip_code
        UUID owner_id FK
        NUMERIC current_balance
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    REPUBLIC_MEMBERS {
        UUID id PK
        UUID republic_id FK
        UUID user_id FK
        BOOLEAN is_admin
        BOOLEAN is_owner
        VARCHAR status
        TIMESTAMPTZ joined_at
    }

    REFRESH_TOKENS {
        BIGINT id PK
        UUID user_uid FK
        VARCHAR token_hash UK
        TIMESTAMPTZ expires_at
        BOOLEAN revoked
        TIMESTAMPTZ created_at
    }

    PASSWORD_RESET_TOKENS {
        BIGINT id PK
        UUID user_uid FK
        VARCHAR code_hash
        TIMESTAMPTZ expires_at
        INTEGER attempts
        BOOLEAN used
        TIMESTAMPTZ created_at
    }

    TASKS {
        BIGINT id PK
        UUID republic_id FK
        VARCHAR title
        TEXT description
        TIMESTAMPTZ due_date
        VARCHAR category
        VARCHAR status
        UUID created_by_uid FK
        BOOLEAN recurring
        VARCHAR recurrence_type
        INTEGER recurrence_interval
        TIMESTAMPTZ recurrence_end_date
        BIGINT parent_task_id FK
        TIMESTAMPTZ completed_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    EXPENSES {
        BIGINT id PK
        UUID republic_id FK
        UUID creator_uid FK
        VARCHAR description
        NUMERIC amount
        TIMESTAMPTZ expense_date
        VARCHAR category
        VARCHAR status
        VARCHAR receipt_url
        TEXT notes
        UUID approver_uid FK
        TIMESTAMPTZ approval_date
        TIMESTAMPTZ reimbursement_date
        VARCHAR rejection_reason
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    INCOMES {
        BIGINT id PK
        UUID republic_id FK
        UUID creator_uid FK
        UUID contributor_uid FK
        VARCHAR description
        NUMERIC amount
        TIMESTAMPTZ income_date
        VARCHAR source
        VARCHAR receipt_url
        TEXT notes
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    BALANCE_ADJUSTMENTS {
        BIGINT id PK
        UUID republic_id FK
        UUID actor_uid FK
        NUMERIC previous_balance
        NUMERIC new_balance
        NUMERIC delta
        VARCHAR description
        TIMESTAMPTZ created_at
    }

    EVENTS {
        BIGINT id PK
        UUID republic_id FK
        UUID creator_uid FK
        VARCHAR title
        TEXT description
        TIMESTAMPTZ start_date
        TIMESTAMPTZ end_date
        VARCHAR location
        TIMESTAMPTZ created_at
    }

    EVENT_INVITATIONS {
        BIGINT event_id PK_FK
        UUID user_uid PK_FK
        VARCHAR status
        TIMESTAMPTZ responded_at
    }

    NOTIFICATIONS {
        BIGINT id PK
        UUID recipient_uid FK
        UUID republic_id FK
        VARCHAR title
        TEXT message
        VARCHAR type
        VARCHAR entity_type
        VARCHAR entity_id
        BOOLEAN read
        TIMESTAMPTZ created_at
    }
```

---

## 2. Dicionário das 13 Tabelas e Restrições de Integridade

| # | Tabela | Chave Primária | Principais Restrições e Índices |
| :--- | :--- | :--- | :--- |
| 1 | `users` | `uid (UUID)` | `email UNIQUE`, `status IN ('active','inactive','banned')`, FK `current_republic_id -> republics(id) ON DELETE SET NULL`. |
| 2 | `republics` | `id (UUID)` | `code UNIQUE` (código de convite de 6 caracteres), endereço embutido (`street`..`zip_code`), `current_balance NUMERIC(14,2) DEFAULT 0.00`, FK `owner_id -> users(uid) ON DELETE RESTRICT`. |
| 3 | `republic_members` | `id (UUID)` | `UNIQUE (republic_id, user_id)`, `status IN ('ACTIVE','INACTIVE','PENDING','BANNED')`, índices por `(republic_id, status)` e `(user_id, status)`. |
| 4 | `refresh_tokens` | `id (BIGINT IDENTITY)` | `token_hash VARCHAR(64) UNIQUE` (SHA-256), índice `(user_uid, revoked)`. |
| 5 | `password_reset_tokens` | `id (BIGINT IDENTITY)` | `code_hash VARCHAR(64)` (SHA-256 do código de 6 dígitos), `attempts INTEGER`, índice `(user_uid, created_at DESC)`. |
| 6 | `tasks` | `id (BIGINT IDENTITY)` | `status IN ('PENDING','IN_PROGRESS','COMPLETED','OVERDUE','CANCELLED')`, `recurrence_type IN ('DAILY','WEEKLY','MONTHLY','YEARLY')`, `recurrence_interval >= 1`, `parent_task_id -> tasks(id) ON DELETE SET NULL`, índice `(republic_id, status, due_date)`. |
| 7 | `task_assignees` | `(task_id, user_uid)` | Tabela associativa `N:N` com `ON DELETE CASCADE` e índice em `(user_uid)`. |
| 8 | `expenses` | `id (BIGINT IDENTITY)` | `amount > 0`, `status IN ('PENDING','APPROVED','REJECTED','REIMBURSED')`, FKs para `creator_uid (RESTRICT)` e `approver_uid (SET NULL)`, índice `(republic_id, status, expense_date DESC)`. |
| 9 | `incomes` | `id (BIGINT IDENTITY)` | `amount > 0`, FKs para `creator_uid (RESTRICT)` e `contributor_uid (SET NULL)`, índice `(republic_id, income_date DESC)`. |
| 10 | `balance_adjustments` | `id (BIGINT IDENTITY)` | Auditoria imutável de ajustes diretos de saldo (`previous_balance`, `new_balance`, `delta`), índice `(republic_id, created_at DESC)`. |
| 11 | `events` | `id (BIGINT IDENTITY)` | Regra `CHECK (end_date > start_date)`, índice `(republic_id, start_date, end_date)`. |
| 12 | `event_invitations` | `(event_id, user_uid)` | `status IN ('INVITED','CONFIRMED','DECLINED')`, índice `(user_uid, status)`. |
| 13 | `notifications` | `id (BIGINT IDENTITY)` | `read BOOLEAN DEFAULT FALSE`, índice `(recipient_uid, read, created_at DESC)`. |
