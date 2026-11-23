# Introdução — Arquitetura e Modelagem Técnica

Esta seção documenta a arquitetura real do monorepo **RepHelper**, consolidando o aplicativo móvel/web (**Expo React Native**) como fonte de verdade dos contratos de interface e experiência do usuário, o back-end próprio (**Java 21 + Spring Boot 3.4 + PostgreSQL 16**) e a infraestrutura autocontida em **VPS via Docker Compose** (sem dependências de Firebase ou Supabase).

## Sumário da Seção

1. **[Visão Geral da Arquitetura](visao-geral-arquitetura.md)**: Estrutura do monorepo (`frontend/`, `backend/`, `docs/`), arquitetura em camadas modulares do Spring Boot 3.4, autenticação JWT + refresh token rotativo, armazenamento local de mídia e tratamento global de erros.
2. **[Modelo de Dados e Diagrama Entidade-Relacionamento (DER)](modelo-de-dados.md)**: Diagrama ER em Mermaid (`erDiagram`) e dicionário das **13 tabelas** do banco **PostgreSQL 16** com chaves estrangeiras, políticas de exclusão e índices.
3. **[Script SQL DDL Completo (`V1__init_schema.sql`)](schema-postgresql-flyway.md)**: Migração inicial gerenciada pelo **Flyway** (`backend/src/main/resources/db/migration/V1__init_schema.sql`), compatível com **PostgreSQL 16+** e **H2 (modo PostgreSQL)** para testes de integração.
4. **[Diagramas de Máquina de Estados e Sequência](diagramas-de-estados-e-sequencia.md)**: Máquinas de estado de Despesas e Tarefas e diagramas de sequência de renovação de token, recorrência de tarefas, reembolso/estorno financeiro e upload de mídia.
5. **[Especificação da API REST](especificacao-api-rest.md)**: Catálogo completo de endpoints `/api/v1/*`, contratos JSON, códigos HTTP, regras de permissão (`MEMBER`, `ADMIN`, `OWNER`) e invariantes transacionais.
6. **[Guia de Setup de Ambiente e Infraestrutura](setup-ambiente-e-infraestrutura.md)**: Configuração de `docker-compose.yml`, limites de memória para VPS, variáveis `.env.example`, execução de build/testes e fluxo de desenvolvimento.
