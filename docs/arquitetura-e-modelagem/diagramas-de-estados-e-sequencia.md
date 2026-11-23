# Diagramas de Máquina de Estados e Sequência

Este documento ilustra os ciclos de vida das entidades e os principais fluxos transacionais implementados no **RepHelper**.

---

## 1. Máquinas de Estado

### 1.1 Ciclo de Vida da Despesa (`Expense`) e Impacto no Saldo

```mermaid
stateDiagram-v2
    [*] --> PENDING : Morador cria despesa (saldo inalterado)
    PENDING --> APPROVED : Admin aprova (saldo inalterado)
    PENDING --> REJECTED : Admin rejeita com motivo (saldo inalterado)
    APPROVED --> REJECTED : Admin rejeita com motivo (saldo inalterado)
    APPROVED --> REIMBURSED : Admin reembolsa (debita amount do saldo)
    APPROVED --> PENDING : Admin executa /reset (saldo inalterado)
    REJECTED --> PENDING : Admin executa /reset (saldo inalterado)
    REIMBURSED --> PENDING : Admin executa /reset (estorna amount ao saldo)
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
    actor User as Usuário
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

### 2.3 Reembolso e Estorno Financeiro com Trava Pessimista

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrador
    participant App as App Expo
    participant FinSvc as FinanceService / RepublicBalanceLedger
    participant DB as PostgreSQL (expenses / republics)
    participant Notif as NotificationService

    Admin->>App: Clica em "Marcar como Reembolsada"
    App->>FinSvc: POST /api/v1/expenses/{id}/reimburse
    FinSvc->>DB: Lock Expense FOR UPDATE (verifica status == APPROVED)
    FinSvc->>DB: Lock Republic FOR UPDATE e aplica saldo -= amount
    FinSvc->>DB: Salva Expense REIMBURSED + Notificação EXPENSE_REIMBURSED
    FinSvc-->>App: 200 OK (ExpenseView atualizada)

    opt Administrador decide reverter reembolso
        Admin->>App: Clica em "Redefinir status" (/reset)
        App->>FinSvc: POST /api/v1/expenses/{id}/reset
        FinSvc->>DB: Lock Expense FOR UPDATE -> Lock Republic FOR UPDATE
        FinSvc->>DB: Aplica saldo += amount e volta status para PENDING
        FinSvc-->>App: 200 OK (ExpenseView em PENDING)
    end
```

---

### 2.4 Upload Seguro de Mídia na VPS

```mermaid
sequenceDiagram
    autonumber
    actor User as Morador
    participant App as App Expo (ImageManipulator)
    participant MediaCtrl as MediaController / MediaStorageService
    participant Validator as ImageMagicByteValidator
    participant Disk as Volume Local (/var/lib/rephelper/media)

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
