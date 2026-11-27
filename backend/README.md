# Alpendre Backend — Java 21 & Spring Boot 3.4 API

![Java 21](https://img.shields.io/badge/Java-21%20(Virtual%20Threads)-ED8B00?style=flat-square&logo=openjdk&logoColor=white)
![Spring Boot 3.4.3](https://img.shields.io/badge/Spring%20Boot-3.4.3-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![Spring Security 6](https://img.shields.io/badge/Spring%20Security-6%20%2B%20JWT-6DB33F?style=flat-square&logo=springsecurity&logoColor=white)
![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16%20%2B%20Flyway-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![OpenAPI 3](https://img.shields.io/badge/OpenAPI-3.1%20(Swagger)-85EA2D?style=flat-square&logo=swagger&logoColor=black)

Self-contained RESTful backend powering **Alpendre**, structured as a **package-by-domain modular monolith** (`com.alpendre.backend`) on **Java 21** and **Spring Boot 3.4.3**. Designed for low-footprint, high-concurrency single-VPS deployment alongside PostgreSQL 16.

---

## Architectural Decisions & Production Defaults

| Concern | Implementation |
|---|---|
| **Concurrency Model** | **Java 21 Virtual Threads** enabled (`spring.threads.virtual.enabled=true`) for non-blocking throughput over JDBC and multipart I/O without reactive boilerplate. |
| **Persistence & Schema Discipline** | **Spring Data JPA / Hibernate 6.6** with `open-in-view=false`, `hibernate.ddl-auto=validate`, UTC JDBC timezone, `default_batch_fetch_size=20` to prevent N+1 queries, and **Flyway** (`V1__init_schema.sql`) as single schema source of truth. |
| **Authentication & Token Lifecycle** | Stateless **Spring Security 6** + **JJWT 0.12.6** access tokens, persistent refresh tokens with **one-time rotation and revocation**, BCrypt password hashing, 2-step OTP password reset (`@TransactionalEventListener(AFTER_COMMIT)`), and Google OAuth ID-token verification. |
| **Multi-Tenant Household RBAC & Presets** | Every household (`house`) operation is guarded server-side by `HouseSecurityService`, enforcing tenant membership, configurable presets (`COUPLE_FAMILY`, `SHARED_APT`, `REPUBLIC`, `CUSTOM`), optional postal address, and `OWNER` / `ADMIN` / `MEMBER` governance (including automatic `allMembersAdmin` synchronization). |
| **Adaptive Financial Ledger (`2 × 2`)** | `HouseBalanceLedger` enforces `PESSIMISTIC_WRITE` row locks across all four `hasSharedFund × requireExpenseApproval` rule combinations, rejecting shared-fund operations with `400 SHARED_FUND_DISABLED` when `hasSharedFund == false`. |
| **Abuse & Upload Protection** | Per-IP/endpoint `RateLimitFilter` on sensitive auth flows and **magic-byte signature inspection** (`PNG`, `JPEG`, `WEBP`, `GIF`) + size bounds (`5 MB`) on media uploads (`/var/lib/alpendre/media`). |
| **Observability & Diagnostics** | `CorrelationIdFilter` injecting `X-Request-Id` and authenticated `userId` into SLF4J MDC logs, **Spring Boot Actuator** (`/actuator/health`, `/actuator/info`, `/actuator/metrics`), custom `/api/v1/health` DB/storage probe, and **Springdoc OpenAPI** (`/swagger-ui.html`). |

---

## Domain Module Layout

```text
src/main/java/com/alpendre/backend/
├── AlpendreApplication.java
├── auth/          # Signup, login, Google OAuth, JWT service, refresh rotation, 2-step OTP reset
├── user/          # User profile management & current authenticated principal lookup
├── house/         # Household lifecycle, presets, optional address, invite codes, RBAC (HouseSecurityService)
├── task/          # Paginated/filtered chores, status transitions & automatic recurrence spawning
├── finance/       # Adaptive 2x2 expense workflows, incomes, HouseBalanceLedger, balance adjustments & analytics
├── event/         # Household agenda, OffsetDateTime handling & optional RSVP (requireRsvp) workflows
├── notification/  # In-app notification delivery, unread counters & bulk read/cleanup operations
├── media/         # Magic-byte validated image storage & static serving (/api/v1/media)
├── config/        # Security filter chain, JWT filter, CORS, Jackson OffsetDateTime, OpenAPI
└── common/        # GlobalExceptionHandler, ApiErrorResponse, CorrelationIdFilter, RateLimitFilter, HealthController
```

---

## Integration Test Suite (`src/test/`)

Run all **33 MockMvc integration tests** (executing against Flyway-migrated H2 in PostgreSQL compatibility mode with isolated temporary media storage):

```bash
mvn -B test
```

| Suite | Scenarios Covered |
|---|---|
| `AuthSecurityIntegrationTest` | Unauthenticated `401`, duplicate email `409`, invalid credentials `401`, password change, invalid reset OTP `400`, logout refresh revocation |
| `HouseRbacIntegrationTest` | Cross-tenant `403` isolation, `COUPLE_FAMILY` / `REPUBLIC` / `CUSTOM` preset resolution, optional address creation, `allMembersAdmin` auto-promotion & admin editing, `OWNER` protection, invite code regeneration & member removal |
| `TaskWorkflowIntegrationTest` | Weekly recurring task auto-spawning on completion, paginated filtering (`filter` & `assigned/filter`), cancel/delete, outsider `403` |
| `FinanceLedgerIntegrationTest` | All 4 `hasSharedFund × requireExpenseApproval` modes, `400 SHARED_FUND_DISABLED` enforcement, RBAC `403` on approvals/balance adjustments, expense rejection/reset/reversal, monthly analytics |
| `EventAndNotificationIntegrationTest` | `OffsetDateTime` (`-03:00`) instant preservation, optional RSVP (`requireRsvp = false` returning `400 RSVP_NOT_ENABLED` on `/respond` & `/invite`), RSVP transitions, unread notifications, outsider `403` |
| `AlpendreBackendIntegrationTest` | End-to-end smoke lifecycle, `/api/v1/health` probe, refresh token rotation, and spoofed vs. valid PNG magic-byte upload enforcement |

---

## Running Locally

### Option 1 — Docker Compose (Recommended, with PostgreSQL 16)
From the repository root:
```bash
cp .env.example .env
docker compose up -d --build
```

### Option 2 — Local Maven + Local PostgreSQL
```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/alpendre
export SPRING_DATASOURCE_USERNAME=alpendre
export SPRING_DATASOURCE_PASSWORD=alpendre_dev_password
export JWT_SECRET=replace-with-at-least-256-bit-secret-key-for-local-dev
mvn spring-boot:run
```

- **Health Check:** `http://localhost:8080/api/v1/health`
- **Swagger UI:** `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON:** `http://localhost:8080/v3/api-docs`
