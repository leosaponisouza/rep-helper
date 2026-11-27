# Visão Geral da Arquitetura — Alpendre

O **Alpendre** é estruturado em um **monorepo único** composto pelo cliente **Expo React Native** (Android, iOS e Web — pacote nativo `com.alpendre.app` e scheme `alpendre`) e por uma **API RESTful em Java 21 + Spring Boot 3.4.3** (`com.alpendre.backend`) persistida no **PostgreSQL 16**, empacotada para execução simples e econômica em **VPS única via Docker Compose**.

---

## 1. Estrutura do Monorepo

```text
alpendre/
├── docker-compose.yml              # Orquestra PostgreSQL 16 (alpendre-postgres, 512m) e Backend (alpendre-backend, 1024m)
├── .env.example                    # Variáveis de ambiente da stack Docker e da API
├── README.md                       # Guia geral do monorepo
├── SECURITY.md                     # Política e arquitetura de segurança
├── frontend/                       # App Expo React Native (com.alpendre.app)
│   ├── app/                        # Rotas Expo Router: (auth), (house), (panel)
│   ├── components/                 # Componentes de domínio (finances, tasks, events, notifications)
│   ├── assets/images/              # Identidade visual Alpendre (arco arquitetônico + monograma A)
│   ├── src/
│   │   ├── context/                # AuthContext (JWT + Refresh Token + currentHouseId)
│   │   ├── models/                 # Tipagens TypeScript (User, House, Task, Finance, Event)
│   │   ├── services/               # Clientes Axios (/api/v1/*) e upload multipart (/api/v1/media)
│   │   └── hooks/, utils/, validation/, design-system/
│   └── package.json                # React 18, Expo ~52, TypeScript, Jest (28 suítes / 133 testes)
├── backend/                        # API Java 21 + Spring Boot 3.4.3 + Maven (com.alpendre:alpendre-backend)
│   ├── Dockerfile                  # Build multi-stage Maven -> JRE 21 Alpine (usuário não-root alpendre)
│   ├── pom.xml                     # Web, Security, Data JPA, Validation, Actuator, Flyway, JJWT, Springdoc
│   └── src/
│       ├── main/java/com/alpendre/backend/
│       │   ├── AlpendreApplication.java
│       │   ├── config/             # SecurityConfig, JwtAuthenticationFilter, CorsConfig, JacksonConfig, OpenApiConfig
│       │   ├── common/             # GlobalExceptionHandler, CorrelationIdFilter, RateLimitFilter, HealthController, PagedResponse
│       │   ├── auth/               # AuthController, AuthService, JwtService, GoogleOAuthVerifier, HttpEmailSenderAdapter
│       │   ├── user/               # User, UserRepository, UserService, UserController
│       │   ├── media/              # MediaController, MediaStorageService, ImageMagicByteValidator, LocalFileSystemStorageAdapter
│       │   ├── house/              # House, HouseMember, HousePresetType, HouseSecurityService, HouseCommandHandler, MembershipUseCase, HouseController
│       │   ├── notification/       # Notification, NotificationService, NotificationController
│       │   ├── task/               # Task, TaskSpecifications, TaskService, TaskController
│       │   ├── finance/            # Expense, Income, BalanceAdjustment, HouseBalanceLedger, FinanceService, Controllers
│       │   └── event/              # Event, EventInvitation, EventService, EventController
│       ├── main/resources/
│       │   ├── application.yml
│       │   └── db/migration/V1__init_schema.sql
│       └── test/                   # 6 suítes de integração JUnit 5 + MockMvc (33 testes em H2 modo PostgreSQL)
└── docs/
    ├── arquitetura-e-modelagem/    # Documentação técnica e requisitos funcionais sincronizados
    ├── designs/                    # Documento de design arquitetural do monorepo
    └── specs/                      # Especificações e planos SDD
```

---

## 2. Arquitetura do Back-end (`backend/`)

### 2.1 Camadas e Modularidade
- **Controllers REST (`@RestController`)**: Recebem DTOs validados com Jakarta Bean Validation (`@Valid`), extraem o morador autenticado via `@AuthenticationPrincipal UserPrincipal` e delegam aos serviços de domínio.
- **Isolamento Multi-Tenant e Governança (`HouseSecurityService`)**: Valida em banco a participação ativa na casa (`requireActiveMember`), permissões administrativas (`requireAdmin`, respeitando `allMembersAdmin`) e propriedade (`requireOwner`), impedindo acessos cruzados (IDOR) entre casas distintas.
- **Services Transacionais (`@Service` / `@Transactional`)**: Implementam presets e regras de casa (`HouseCommandHandler`, `MembershipUseCase`), o motor financeiro adaptável `2 × 2` (`HouseBalanceLedger` com `@Lock(PESSIMISTIC_WRITE)`), recorrência idempotente de tarefas, agenda com RSVP opcional (`requireRsvp`), notificações internas e limpeza best-effort de arquivos substituídos.
- **Repositories (`JpaRepository` / `JpaSpecificationExecutor`)**: Consultas tipadas com `@EntityGraph`, agregações SQL diretas para o dashboard financeiro e `default_batch_fetch_size: 20` com `spring.jpa.open-in-view: false`.
- **Filters & Security (`SecurityFilterChain`)**:
  - `CorrelationIdFilter` (propaga `X-Request-Id` no MDC e na resposta HTTP).
  - `RateLimitFilter` (janela deslizante em memória com `20 req/min` em endpoints sensíveis de autenticação e `30 req/min` em uploads de mídia).
  - `JwtAuthenticationFilter` (validação HS256 stateless e resolução ao vivo do vínculo `UserPrincipal` no banco).

---

## 3. Autenticação 100% Interna (Zero Firebase)

1. **Cadastro e Login Email/Senha**: Senhas armazenadas com **BCrypt** (`BCryptPasswordEncoder(10)`), mínimo de 8 caracteres.
2. **Access Token + Refresh Token Rotativo**:
   - `token`: JWT HS256 de curta duração (padrão 30 minutos) com claims `uid`, `email`, `name`, `currentHouseId`, `isAdmin`, `isOwner`.
   - `refreshToken`: Token opaco criptograficamente aleatório persistido apenas como hash **SHA-256** na tabela `refresh_tokens` (validade padrão de 30 dias). A cada chamada em `POST /api/v1/auth/refresh`, o refresh token anterior é revogado (`revoked = true`) e um novo par é emitido.
3. **Google OAuth Direto**:
   - O aplicativo obtém `idToken` ou `accessToken` via `expo-auth-session/providers/google` e envia para `POST /api/v1/auth/google`.
   - O `GoogleOAuthVerifier` executa fora de transações JPA a validação criptográfica local da assinatura RS256 contra as chaves públicas JWKS do Google (`https://www.googleapis.com/oauth2/v3/certs`, cache em memória de 1 hora), conferindo `iss`, `aud` (`GOOGLE_CLIENT_IDS`) e `email_verified`; ou recorre a `/oauth2/v3/userinfo` para `accessToken`.
4. **Alteração e Recuperação de Senha**:
   - Morador autenticado altera via `POST /api/v1/auth/change-password` validando a senha atual.
   - Recuperação de senha funciona em 2 etapas via códigos numéricos de **6 dígitos** (hash SHA-256 em `password_reset_tokens`, validade 15 min, máximo 5 tentativas e cooldown de 60s), enviados após o commit (`@TransactionalEventListener(AFTER_COMMIT)`) via `HttpEmailSenderAdapter` ou logados no console em ambiente de desenvolvimento.

---

## 4. Armazenamento Local de Mídia na VPS (Zero Supabase)

- **Upload (`POST /api/v1/media/{bucket}`)**: Aceita apenas os buckets `avatars` e `receipts`, máximo **5 MB**, leitura em passada única com `PushbackInputStream` + verificação por magic bytes (`JPEG`, `PNG`, `WebP`, `GIF`), gravação no volume persistente `/var/lib/alpendre/media/{bucket}/{userUid}/{uuid}.{ext}`.
- **Leitura Pública (`GET /api/v1/media/public/{bucket}/{userId}/{filename}`)**: Resposta cacheável (`Cache-Control: max-age=31536000, public, immutable`) com cabeçalho `X-Content-Type-Options: nosniff`.
- **Exclusão Segura (`DELETE /api/v1/media/{bucket}/{filename}`)**: Permitida somente ao dono (`principal.getUid()`) e executada automaticamente de forma best-effort quando avatar de morador ou comprovante de despesa/entrada é substituído ou excluído.
