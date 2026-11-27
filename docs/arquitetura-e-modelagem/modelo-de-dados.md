# Modelo de Dados e Diagrama Entidade-Relacionamento — Alpendre (PostgreSQL 16)

Este documento descreve a modelagem relacional limpa do **Alpendre** implementada na migração inicial do Flyway (`V1__init_schema.sql`), alinhada ao banco **PostgreSQL 16** e às entidades JPA do módulo `backend/`.

---

## 1. Diagrama Entidade-Relacionamento (DER)

```mermaid
erDiagram
    USERS ||--o{ HOUSES : "possui (owner_id)"
    USERS ||--o{ HOUSE_MEMBERS : "participa via"
    HOUSES ||--o{ HOUSE_MEMBERS : "contém"
    USERS ||--o{ REFRESH_TOKENS : "emite"
    USERS ||--o{ PASSWORD_RESET_TOKENS : "solicita"
    HOUSES ||--o{ TASKS : "mantém"
    USERS ||--o{ TASKS : "cria"
    TASKS ||--o{ TASKS : "gera recorrente (parent_task_id)"
    TASKS ||--o{ TASK_ASSIGNEES : "atribui"
    USERS ||--o{ TASK_ASSIGNEES : "responsável em"
    HOUSES ||--o{ EXPENSES : "registra"
    USERS ||--o{ EXPENSES : "cria / aprova"
    HOUSES ||--o{ INCOMES : "recebe"
    USERS ||--o{ INCOMES : "cria / contribui"
    HOUSES ||--o{ BALANCE_ADJUSTMENTS : "audita saldo"
    USERS ||--o{ BALANCE_ADJUSTMENTS : "executa ajuste"
    HOUSES ||--o{ EVENTS : "organiza"
    USERS ||--o{ EVENTS : "cria"
    EVENTS ||--o{ EVENT_INVITATIONS : "convida"
    USERS ||--o{ EVENT_INVITATIONS : "responde"
    USERS ||--o{ NOTIFICATIONS : "recebe"
    HOUSES ||--o{ NOTIFICATIONS : "origina"

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
        UUID current_house_id FK
        VARCHAR status
        TIMESTAMPTZ created_at
        TIMESTAMPTZ last_login
    }

    HOUSES {
        UUID id PK
        VARCHAR name
        VARCHAR code UK
        VARCHAR preset_type
        BOOLEAN has_shared_fund
        BOOLEAN require_expense_approval
        BOOLEAN all_members_admin
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

    HOUSE_MEMBERS {
        UUID id PK
        UUID house_id FK
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
        BOOLEAN used
        INTEGER attempts
        TIMESTAMPTZ created_at
    }

    TASKS {
        BIGINT id PK
        UUID house_id FK
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

    TASK_ASSIGNEES {
        BIGINT task_id PK_FK
        UUID user_uid PK_FK
    }

    EXPENSES {
        BIGINT id PK
        UUID house_id FK
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
        UUID house_id FK
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
        UUID house_id FK
        UUID actor_uid FK
        NUMERIC previous_balance
        NUMERIC new_balance
        NUMERIC delta
        VARCHAR description
        TIMESTAMPTZ created_at
    }

    EVENTS {
        BIGINT id PK
        UUID house_id FK
        UUID creator_uid FK
        VARCHAR title
        TEXT description
        TIMESTAMPTZ start_date
        TIMESTAMPTZ end_date
        VARCHAR location
        BOOLEAN require_rsvp
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
        UUID house_id FK
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
| 1 | `users` | `uid (UUID)` | `email UNIQUE`, `status IN ('active','inactive','banned')`, FK `current_house_id -> houses(id) ON DELETE SET NULL`. |
| 2 | `houses` | `id (UUID)` | `code UNIQUE` (código de convite de 6 caracteres), `preset_type IN ('COUPLE_FAMILY','SHARED_APT','REPUBLIC','CUSTOM')`, flags `has_shared_fund`, `require_expense_approval`, `all_members_admin`, endereço opcional (`street`..`zip_code` anuláveis), `current_balance NUMERIC(14,2) DEFAULT 0.00`, FK `owner_id -> users(uid) ON DELETE RESTRICT`. |
| 3 | `house_members` | `id (UUID)` | `UNIQUE (house_id, user_id)`, `status IN ('ACTIVE','INACTIVE','PENDING','BANNED')`, índices por `(house_id, status)` e `(user_id, status)`. |
| 4 | `refresh_tokens` | `id (BIGINT IDENTITY)` | `token_hash VARCHAR(64) UNIQUE` (SHA-256), índice `(user_uid, revoked)`. |
| 5 | `password_reset_tokens` | `id (BIGINT IDENTITY)` | `code_hash VARCHAR(64)` (SHA-256 do código de 6 dígitos), `attempts INTEGER`, índice `(user_uid, created_at DESC)`. |
| 6 | `tasks` | `id (BIGINT IDENTITY)` | `status IN ('PENDING','IN_PROGRESS','COMPLETED','OVERDUE','CANCELLED')`, `recurrence_type IN ('DAILY','WEEKLY','MONTHLY','YEARLY')`, `recurrence_interval >= 1`, `parent_task_id -> tasks(id) ON DELETE SET NULL`, índice `(house_id, status, due_date)`. |
| 7 | `task_assignees` | `(task_id, user_uid)` | Tabela associativa `N:N` com `ON DELETE CASCADE` e índice em `(user_uid)`. |
| 8 | `expenses` | `id (BIGINT IDENTITY)` | `amount > 0`, `status IN ('PENDING','APPROVED','REJECTED','REIMBURSED')`, FKs para `creator_uid (RESTRICT)` e `approver_uid (SET NULL)`, índice `(house_id, status, expense_date DESC)`. |
| 9 | `incomes` | `id (BIGINT IDENTITY)` | `amount > 0`, FKs para `creator_uid (RESTRICT)` e `contributor_uid (SET NULL)`, índice `(house_id, income_date DESC)`. |
| 10 | `balance_adjustments` | `id (BIGINT IDENTITY)` | Auditoria imutável de ajustes diretos de caixinha (`previous_balance`, `new_balance`, `delta`), índice `(house_id, created_at DESC)`. |
| 11 | `events` | `id (BIGINT IDENTITY)` | `require_rsvp BOOLEAN NOT NULL DEFAULT TRUE`, regra `CHECK (end_date > start_date)`, índice `(house_id, start_date, end_date)`. |
| 12 | `event_invitations` | `(event_id, user_uid)` | `status IN ('INVITED','CONFIRMED','DECLINED')`, índice `(user_uid, status)`. |
| 13 | `notifications` | `id (BIGINT IDENTITY)` | `read BOOLEAN DEFAULT FALSE`, FK `house_id -> houses(id) ON DELETE CASCADE`, índice `(recipient_uid, read, created_at DESC)`. |
