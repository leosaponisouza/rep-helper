# RepHelper Monorepo

Plataforma de gestão para repúblicas estudantis composta por aplicativo mobile/web (**React Native / Expo**) e API REST autossuficiente (**Java 21 + Spring Boot 3.4 + PostgreSQL 16**) projetada para execução em VPS única via Docker Compose.

## Estrutura do Repositório

```text
rep-helper/
├── frontend/             # Aplicativo React Native / Expo Router
├── backend/              # API REST Java 21 / Spring Boot 3.4 / Flyway / PostgreSQL 16
├── docs/                 # Arquitetura, especificação de API, modelo de dados e designs EGM
├── docker-compose.yml    # Orquestração PostgreSQL 16 + Backend + volume local de mídia
└── .env.example          # Variáveis de ambiente para desenvolvimento e produção na VPS
```

## Executando Back-end + PostgreSQL (Docker Compose)

1. Copie `.env.example` para `.env` e ajuste `POSTGRES_PASSWORD`, `JWT_SECRET` e `APP_PUBLIC_BASE_URL`:
   ```bash
   cp .env.example .env
   ```
2. Suba o banco PostgreSQL 16 e a API Java:
   ```bash
   docker compose up -d --build
   ```
3. Verifique a saúde da API:
   ```bash
   curl http://localhost:8080/api/v1/health
   ```
   A documentação interativa OpenAPI fica disponível em `http://localhost:8080/swagger-ui.html`.

## Executando o Front-end (Expo)

```bash
cd frontend
npm install
npm run start
```

Configure `EXPO_PUBLIC_API_BASE_URL` (ex.: `http://localhost:8080` em desenvolvimento ou `https://api.seu-dominio.com.br` em produção).

## Testes e Verificação

- **Back-end**:
  ```bash
  cd backend
  mvn test
  ```
- **Front-end**:
  ```bash
  cd frontend
  npm run typecheck
  npm run test:ci
  ```
