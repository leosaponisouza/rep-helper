# Diagramas de Máquina de Estados e Sequência — Alpendre

Este documento ilustra os ciclos de vida das entidades e os fluxos transacionais adaptáveis implementados no **Alpendre**.

---

## 1. Máquinas de Estado

### 1.1 Ciclo de Vida Adaptável da Despesa (`Expense`) — Matriz `2 × 2`

#### A) Modo Acompanhar Gastos (`hasSharedFund = false`) — Saldo inalterado (`SHARED_FUND_DISABLED` em entradas/reembolsos)

```mermaid
stateDiagram-v2
    [*] --> APPROVED : requireExpenseApproval == false\n(Nasce "Registrada", Δ Saldo = 0)
    [*] --> PENDING : requireExpenseApproval == true\n(Aguarda revisão, Δ Saldo = 0)
    PENDING --> APPROVED : Admin executa /approve\n(Δ Saldo = 0)
    PENDING --> REJECTED : Admin executa /reject\n(Δ Saldo = 0)
    APPROVED --> REJECTED : Admin executa /reject\n(Δ Saldo = 0)
    APPROVED --> PENDING : Admin executa /reset\n(Δ Saldo = 0)
    REJECTED --> PENDING : Admin executa /reset\n(Δ Saldo = 0)
    APPROVED --> [*] : DELETE [Criador ou Admin]
    PENDING --> [*] : DELETE [Criador ou Admin]
    REJECTED --> [*] : DELETE [Criador ou Admin]
```

#### B) Modo Caixinha (`hasSharedFund = true`) — Mutação atômica via `HouseBalanceLedger`

```mermaid
stateDiagram-v2
    [*] --> REIMBURSED : requireExpenseApproval == false\n(Débito direto Δ Saldo = -amount)
    [*] --> PENDING : requireExpenseApproval == true\n(Δ Saldo = 0)
    PENDING --> APPROVED : Admin aprova (Δ Saldo = 0)
    PENDING --> REJECTED : Admin rejeita com motivo (Δ Saldo = 0)
    APPROVED --> REJECTED : Admin rejeita com motivo (Δ Saldo = 0)
    APPROVED --> REIMBURSED : Admin reembolsa (Δ Saldo = -amount)
    APPROVED --> PENDING : Admin executa /reset (Δ Saldo = 0)
    REJECTED --> PENDING : Admin executa /reset (Δ Saldo = 0)
    REIMBURSED --> PENDING : Admin executa /reset (Estorno Δ Saldo = +amount)
    REIMBURSED --> REIMBURSED : PUT /expenses/{id} sem aprovação\n(Ajuste Δ Saldo = valorAnterior - novoValor)
    REIMBURSED --> [*] : DELETE (Estorno Δ Saldo = +amount)
```

---

### 1.2 Ciclo de Vida da Tarefa (`Task`)

```mermaid
stateDiagram-v2
    [*] --> PENDING : Tarefa criada (com ou sem recorrência)
    PENDING --> IN_PROGRESS : Atualização manual via PUT
    PENDING --> OVERDUE : Prazo expirado / filtro overdue
    PENDING --> COMPLETED : POST /complete
    IN_PROGRESS --> COMPLETED : POST /complete
    OVERDUE --> COMPLETED : POST /complete
    COMPLETED --> [*] : Sem recorrência ou fora de recurrenceEndDate
    COMPLETED --> PENDING : Recorrente gera nova instância vinculada (parentTaskId)
    PENDING --> CANCELLED : POST /cancel
    IN_PROGRESS --> CANCELLED : POST /cancel
    CANCELLED --> [*]
```

---

## 2. Diagramas de Sequência dos Fluxos Críticos

### 2.1 Autenticação e Rotação de Refresh Token

```mermaid
sequenceDiagram
    autonumber
    actor User as Morador
    participant App as App Expo (Axios Interceptor)
    participant Auth as AuthController / AuthService
    participant DB as PostgreSQL (users / refresh_tokens)

    User->>App: Faz login (email/senha ou Google OAuth)
    App->>Auth: POST /api/v1/auth/login (ou /google)
    Auth->>DB: Valida credenciais ou JWKS Google e salva hash SHA-256 do refreshToken
    Auth-->>App: 200 OK { token, refreshToken, user }
    App->>App: Salva tokens no SecureStore

    Note over App,Auth: Token de acesso expira (401 em requisição protegida)
    App->>Auth: POST /api/v1/auth/refresh { refreshToken }
    Auth->>DB: Busca SHA-256(refreshToken), verifica revogado/expiração
    Auth->>DB: Marca token anterior revoked = true e emite novo par
    Auth-->>App: 200 OK { token, refreshToken, user }
    App->>App: Atualiza SecureStore e reexecuta fila de requisições
```

---

### 2.2 Conclusão Idempotente de Tarefa Recorrente

```mermaid
sequenceDiagram
    autonumber
    actor Member as Morador
    participant App as App Expo
    participant TaskSvc as TaskService (@Transactional)
    participant DB as PostgreSQL (tasks / task_assignees)

    Member->>App: Clica em concluir tarefa
    App->>TaskSvc: POST /api/v1/tasks/{id}/complete
    TaskSvc->>DB: SELECT ... FOR UPDATE (PESSIMISTIC_WRITE na tarefa)
    alt Já estava COMPLETED
        TaskSvc-->>App: 200 OK (retorno idempotente sem duplicar)
    else Pendente ou em progresso
        TaskSvc->>DB: Atualiza status = COMPLETED e completedAt = now
        opt recurring == true e nextDue <= recurrenceEndDate
            TaskSvc->>TaskSvc: Calcula nextDue conforme recurrenceType e interval
            TaskSvc->>DB: Insere nova Task PENDING com parentTaskId = id e mesmos assignees
        end
        TaskSvc-->>App: 200 OK (TaskView concluída)
    end
```

---

### 2.3 Reembolso e Estorno na Caixinha com Trava Pessimista (`HouseBalanceLedger`)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrador da Casa
    participant App as App Expo
    participant FinSvc as FinanceService / HouseBalanceLedger
    participant DB as PostgreSQL (expenses / houses)
    participant Notif as NotificationService

    Admin->>App: Clica em "Marcar como Reembolsada"
    App->>FinSvc: POST /api/v1/expenses/{id}/reimburse
    FinSvc->>DB: Verifica house.hasSharedFund == true (ou retorna 400 SHARED_FUND_DISABLED)
    FinSvc->>DB: Lock Expense FOR UPDATE (verifica status == APPROVED)
    FinSvc->>DB: Lock House FOR UPDATE e aplica currentBalance -= amount
    FinSvc->>DB: Salva Expense REIMBURSED + Notificação EXPENSE_REIMBURSED
    FinSvc-->>App: 200 OK (ExpenseView atualizada)

    opt Administrador decide reverter reembolso
        Admin->>App: Clica em "Redefinir status" (/reset)
        App->>FinSvc: POST /api/v1/expenses/{id}/reset
        FinSvc->>DB: Lock Expense FOR UPDATE -> Lock House FOR UPDATE
        FinSvc->>DB: Aplica currentBalance += amount e volta status para PENDING
        FinSvc-->>App: 200 OK (ExpenseView em PENDING)
    end
```

---

### 2.4 Evento da Agenda com Confirmação Opcional (`requireRsvp`)

```mermaid
sequenceDiagram
    autonumber
    actor Creator as Morador Organizador
    participant App as App Expo
    participant EventSvc as EventService (@Transactional)
    participant DB as PostgreSQL (events / event_invitations)

    Creator->>App: Cria compromisso (toggle requireRsvp = true ou false)
    App->>EventSvc: POST /api/v1/events { title, startDate, endDate, requireRsvp }
    alt requireRsvp == true (Padrão)
        EventSvc->>DB: Salva Event (require_rsvp = true) + criador CONFIRMED em event_invitations
        EventSvc-->>App: 201 Created (habilita convites e botões de presença)
    else requireRsvp == false (Aviso na agenda)
        EventSvc->>DB: Salva Event (require_rsvp = false) sem registros em event_invitations
        EventSvc-->>App: 201 Created (exibe selo "Aviso na agenda"; /invite e /respond retornam 400 RSVP_NOT_ENABLED)
    end
```

---

### 2.5 Upload Seguro de Mídia na VPS

```mermaid
sequenceDiagram
    autonumber
    actor User as Morador
    participant App as App Expo (ImageManipulator)
    participant MediaCtrl as MediaController / MediaStorageService
    participant Validator as ImageMagicByteValidator
    participant Disk as Volume Local (/var/lib/alpendre/media)

    User->>App: Seleciona avatar ou comprovante
    App->>App: Redimensiona (largura 600px, JPEG 0.6) e valida URI local
    App->>MediaCtrl: POST /api/v1/media/{bucket} (multipart file)
    MediaCtrl->>Validator: Lê 12 bytes via PushbackInputStream e devolve cabeçalho ao stream
    alt Magic bytes válidos (JPEG / PNG / WebP / GIF)
        MediaCtrl->>Disk: Grava stream em {bucket}/{userUid}/{uuid}.{ext}
        MediaCtrl-->>App: 201 Created { url, bucket, filename, contentType }
    else Tipo inválido ou arquivo > 5 MB
        MediaCtrl-->>App: 400 UNSUPPORTED_MEDIA_TYPE / FILE_TOO_LARGE
    end
```
