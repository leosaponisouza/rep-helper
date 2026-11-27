# Guia de Setup de Ambiente e Infraestrutura — Alpendre

Este documento descreve como executar a stack completa do **Alpendre** em desenvolvimento local e em produção na **VPS** usando **Docker Compose**, mantendo configurações consistentes entre `frontend/` e `backend/`.

---

## 1. Pré-requisitos

### Para rodar via Docker (recomendado em VPS e homologação)
- **Docker Engine** e **Docker Compose v2** (`docker compose`)

### Para desenvolvimento local de aplicativo / back-end
- **Node.js 20+** e **npm** (para `frontend/`)
- **Java JDK 21 LTS** e **Maven 3.9+** (para `backend/`, caso execute fora do container)

---

## 2. Orquestração via `docker-compose.yml` (Raiz do Monorepo)

O arquivo `docker-compose.yml` na raiz sobe o banco **PostgreSQL 16 Alpine** (`alpendre-postgres`, limite `512m`) e a API **Spring Boot 3.4** (`alpendre-backend`, limite `1024m`, flags JVM `-XX:MaxRAMPercentage=60.0 -XX:+UseG1GC`) com volumes persistentes para banco (`pgdata`) e imagens enviadas pelos moradores (`media_data` montado em `/var/lib/alpendre/media`).

```bash
# Na raiz do monorepo:
cp .env.example .env
# Edite JWT_SECRET, POSTGRES_PASSWORD, APP_PUBLIC_BASE_URL e APP_CORS_ALLOWED_ORIGINS no .env

docker compose up -d --build
```

Para validar o health check após subir os serviços:

```bash
curl http://localhost:8080/api/v1/health
```

Resposta esperada:

```json
{"status":"UP","database":"UP","storage":"UP"}
```

---

## 3. Variáveis de Ambiente

### 3.1 Back-end e Docker Compose (`.env.example` na raiz)

| Variável | Exemplo / Padrão | Descrição |
| :--- | :--- | :--- |
| `POSTGRES_DB` | `alpendre` | Nome do banco PostgreSQL. |
| `POSTGRES_USER` | `alpendre` | Usuário do banco. |
| `POSTGRES_PASSWORD` | `change_me_strong_password` | Senha forte do PostgreSQL em produção. |
| `POSTGRES_PORT` | `5432` | Porta exposta do PostgreSQL. |
| `BACKEND_PORT` | `8080` | Porta HTTP da API Spring Boot. |
| `JWT_SECRET` | mínimo 32 caracteres aleatórios | Segredo HMAC-SHA256 para assinatura de access tokens JWT. |
| `JWT_ACCESS_EXPIRATION_MS` | `1800000` | Validade do access token em ms (30 min). |
| `JWT_REFRESH_EXPIRATION_MS` | `2592000000` | Validade do refresh token rotativo em ms (30 dias). |
| `APP_PUBLIC_BASE_URL` | `https://api.seu-dominio.com.br` | URL pública da API usada para compor links de mídia e CORS/Swagger. |
| `APP_CORS_ALLOWED_ORIGINS` | `*` (dev) ou lista HTTPS explícita | Origens CORS permitidas (`allowCredentials` é habilitado automaticamente apenas quando não há wildcard `*`). |
| `GOOGLE_CLIENT_IDS` | lista separada por vírgula | Client IDs OAuth do Google (Android/iOS/Web) validados no claim `aud` do `idToken`. |
| `EMAIL_PROVIDER_URL` | `https://api.resend.com/emails` | Endpoint HTTPS do provedor transacional de e-mail. |
| `EMAIL_PROVIDER_API_KEY` | vazio em dev | Chave Bearer da API de e-mail. Se vazia em desenvolvimento, os códigos de 6 dígitos são logados no stdout do back-end. |
| `EMAIL_FROM_ADDRESS` | `Alpendre <no-reply@alpendre.app>` | Remetente padrão dos e-mails de recuperação de senha. |

### 3.2 Front-end (`frontend/.env`)

```ini
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
EXPO_PUBLIC_WEB_CLIENT_ID=seu-google-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_ANDROID_CLIENT_ID=seu-google-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_IOS_CLIENT_ID=seu-google-ios-client-id.apps.googleusercontent.com
```

> Em builds de produção (`__DEV__ === false`), `assertSecureApiUrl` recusa URLs HTTP não seguras em `EXPO_PUBLIC_API_BASE_URL` (exigindo **HTTPS**). Para builds Android de release assinados via Gradle, configure as propriedades de keystore `ALPENDRE_UPLOAD_STORE_FILE`, `ALPENDRE_UPLOAD_STORE_PASSWORD`, `ALPENDRE_UPLOAD_KEY_ALIAS` e `ALPENDRE_UPLOAD_KEY_PASSWORD`.

---

## 4. Comandos de Verificação

### Front-end (`frontend/`)
```bash
cd frontend
npm install
npm run typecheck
npm run test:ci
npm start
```

### Back-end (`backend/`)
```bash
cd backend
mvn test
```

As **6 suítes de integração JUnit 5 + MockMvc (33 testes)** executam sobre **H2 em modo PostgreSQL** com validação completa do schema Flyway (`V1__init_schema.sql`), autenticação, refresh rotation, redefinição de senha em 6 dígitos, presets e governança da casa (`HouseRbacIntegrationTest`), validação por magic bytes de uploads, recorrência de tarefas, agenda com RSVP opcional e invariantes da matriz financeira `2 × 2`.

---

## 5. Recomendações para Produção em VPS

1. **Proxy Reverso TLS**: Coloque **Caddy** ou **Nginx** na frente da porta `8080` do container `alpendre-backend` com certificado Let's Encrypt e encaminhamento de cabeçalhos `X-Forwarded-For` / `X-Forwarded-Proto`.
2. **Backups Persistentes**: Faça backup periódico dos volumes Docker `pgdata` (via `pg_dump`) e `media_data` (`/var/lib/alpendre/media`).
3. **Hardening de Segredos**: Nunca suba `.env` para o Git; utilize `JWT_SECRET` com pelo menos 64 caracteres aleatórios e `APP_CORS_ALLOWED_ORIGINS` restrito às origens reais.
