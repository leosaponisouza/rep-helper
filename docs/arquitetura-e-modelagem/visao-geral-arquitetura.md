# Visão Geral da Arquitetura

O **RepHelper** é estruturado em um **monorepo único** composto pelo cliente **Expo React Native** (Android, iOS e Web) e por uma **API RESTful em Java 21 + Spring Boot 3.4.3** persistida no **PostgreSQL 16**, empacotada para execução simples em **VPS única via Docker Compose**.

---

## 1. Estrutura do Monorepo

```text
rep-helper/
├── docker-compose.yml              # Orquestra PostgreSQL 16 (512m) e Backend Spring Boot (1024m)
├── .env.example                    # Variáveis de ambiente da stack Docker e do app
├── README.md                       # Guia geral do monorepo
├── frontend/                       # App Expo React Native (fonte de verdade de UX e contratos)
│   ├── app/                        # Rotas Expo Router: (auth), (republic), (panel)
│   ├── components/                 # Componentes de domínio e UI
│   ├── src/
│   │   ├── context/                # AuthContext (JWT + Refresh Token + sessão)
│   │   ├── models/                 # Tipagens TypeScript (User, Republic, Task, Finance, Event)
│   │   ├── services/               # Clientes Axios (/api/v1/*) e upload multipart (/api/v1/media)
│   │   ├── hooks/, utils/, validation/, design-system/
│   └── package.json                # React 18, Expo ~52, TypeScript, Jest
├── backend/                        # API Java 21 + Spring Boot 3.4.3 + Maven
│   ├── Dockerfile                  # Build multi-stage Maven -> JRE 21 Alpine
│   ├── pom.xml                     # Web, Security, Data JPA, Validation, Actuator, Flyway, JJWT, Springdoc
│   └── src/
│       ├── main/java/com/rephelper/backend/
│       │   ├── config/             # SecurityConfig, JwtAuthenticationFilter, CorsConfig, JacksonConfig, OpenApiConfig
│       │   ├── common/             # GlobalExceptionHandler, CorrelationIdFilter, RateLimitFilter, HealthController, PagedResponse
│       │   ├── auth/               # AuthController, AuthService, JwtService, GoogleOAuthVerifier, HttpEmailSenderAdapter
│       │   ├── user/               # User, UserRepository, UserService, UserController
│       │   ├── media/              # MediaController, MediaStorageService, ImageMagicByteValidator, LocalFileSystemStorageAdapter
│       │   ├── republic/           # Republic, RepublicMember, RepublicSecurityService, RepublicCommandHandler, MembershipUseCase, RepublicController
│       │   ├── notification/       # Notification, NotificationService, NotificationController
│       │   ├── task/               # Task, TaskSpecifications, TaskService, TaskController
│       │   ├── finance/            # Expense, Income, BalanceAdjustment, RepublicBalanceLedger, FinanceService, Controllers
│       │   └── event/              # Event, EventInvitation, EventService, EventController
│       ├── main/resources/
│       │   ├── application.yml
│       │   └── db/migration/V1__init_schema.sql
│       └── test/                   # RepHelperBackendIntegrationTest (H2 modo PostgreSQL)
└── docs/
    └── arquitetura-e-modelagem/    # Documentação técnica sincronizada
```

---

## 2. Arquitetura do Back-end (`backend/`)

### 2.1 Camadas e Modularidade
- **Controllers REST (`@RestController`)**: Recebem DTOs validados com Jakarta Bean Validation (`@Valid`), extraem o usuário autenticado via `@AuthenticationPrincipal UserPrincipal` e delegam aos serviços de domínio.
- **Services Transacionais (`@Service` / `@Transactional`)**: Implementam regras de negócio, invariantes financeiras (`RepublicBalanceLedger` com `@Lock(PESSIMISTIC_WRITE)`), recorrência de tarefas, emissão de notificações internas e limpeza best-effort de arquivos substituídos.
- **Repositories (`JpaRepository` / `JpaSpecificationExecutor`)**: Consultas tipadas com `@EntityGraph` e `default_batch_fetch_size: 20` com `spring.jpa.open-in-view: false`.
- **Filters & Security (`SecurityFilterChain`)**:
  - `CorrelationIdFilter` (anexa `X-Request-Id` no MDC e na resposta HTTP).
  - `RateLimitFilter` (janela deslizante em memória usando `request.getRemoteAddr()` com `20 req/min` em endpoints críticos de autenticação e `30 req/min` em uploads de mídia, com evicção periódica lock-free).
  - `JwtAuthenticationFilter` (validação HS256 stateless sem registro duplicado de servlet).

---

## 3. Autenticação 100% Interna (Zero Firebase)

1. **Cadastro e Login Email/Senha**: Senhas armazenadas com **BCrypt** (`BCryptPasswordEncoder(10)`), mínimo de 8 caracteres.
2. **Access Token + Refresh Token Rotativo**:
   - `token`: JWT HS256 de curta duração (padrão 30 minutos) com claims `uid`, `email`, `name`, `currentRepublicId`, `isAdmin`, `isOwner`.
   - `refreshToken`: Token opaco criptograficamente aleatório persistido apenas como hash **SHA-256** na tabela `refresh_tokens` (validade padrão de 30 dias). A cada chamada em `POST /api/v1/auth/refresh`, o refresh token anterior é revogado (`revoked = true`) e um novo par é emitido.
3. **Google OAuth Direto**:
   - O aplicativo obtém `idToken` ou `accessToken` via `expo-auth-session/providers/google` e envia para `POST /api/v1/auth/google`.
   - O `GoogleOAuthVerifier` executa **fora de transações JPA** a validação criptográfica local da assinatura RS256 contra as chaves públicas JWKS do Google (`https://www.googleapis.com/oauth2/v3/certs`, cache em memória de 1 hora com proteção contra flood de refresh), conferindo `iss`, `aud` (`GOOGLE_CLIENT_IDS`) e `email_verified`; ou recorre a `/oauth2/v3/userinfo` para `accessToken`.
4. **Alteração e Recuperação de Senha**:
   - Usuário autenticado altera via `POST /api/v1/auth/change-password` validando senha atual.
   - Esqueci a senha funciona em 2 etapas via códigos numéricos de **6 dígitos** (hash SHA-256 em `password_reset_tokens`, validade 15 min, máximo 5 tentativas e cooldown de 60s), enviados após o commit (`@TransactionalEventListener(AFTER_COMMIT)`) via adaptador HTTP transacional (`HttpEmailSenderAdapter`) ou log em desenvolvimento quando sem API key.

---

## 4. Armazenamento Local de Mídia na VPS (Zero Supabase)

- **Upload (`POST /api/v1/media/{bucket}`)**: Aceita apenas os buckets `avatars` e `receipts`, máximo **5 MB**, leitura em passada única com `PushbackInputStream` + verificação por magic bytes (`JPEG`, `PNG`, `WebP`, `GIF`), gravação no volume persistente `/var/lib/rephelper/media/{bucket}/{userUid}/{uuid}.{ext}`.
- **Leitura Pública (`GET /api/v1/media/public/{bucket}/{userId}/{filename}`)**: Resposta pública cacheável (`Cache-Control: max-age=31536000, public, immutable`) com cabeçalho `X-Content-Type-Options: nosniff`.
- **Exclusão Segura (`DELETE /api/v1/media/{bucket}/{filename}`)**: Permitida somente ao dono (`principal.getUid()`) e executada automaticamente de forma best-effort quando avatar de usuário ou comprovante de despesa/receita é substituído ou excluído.
