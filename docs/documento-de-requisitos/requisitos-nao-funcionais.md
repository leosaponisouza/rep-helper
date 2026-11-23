# Requisitos Não-Funcionais

Os Requisitos Não-Funcionais (`[RNFxxx]`) especificam os atributos de qualidade, restrições de arquitetura, segurança, desempenho e infraestrutura do **RepHelper**.

---

## 4.1 Desempenho e Escalabilidade

### [RNF001] Tempo de Resposta da API REST
As requisições síncronas à API REST (consultas de dashboard, listagem de tarefas, extrato do caixa e votações) devem apresentar tempo de resposta inferior a **500 ms** em condições normais de operação e no máximo **2 segundos** no percentil 95 ($p95$), mesmo para geração de relatórios em PDF.

### [RNF002] Carregamento Inicial do Front-end (PWA)
A aplicação web em React deve utilizar divisão de código (*code splitting* / *lazy loading*) para que o carregamento inicial (*First Contentful Paint*) ocorra em menos de **2 segundos** em conexões móveis 4G padrão.

---

## 4.2 Confiabilidade e Integridade de Dados

### [RNF003] Disponibilidade do Sistema
O sistema deve operar em regime **24x7**, com meta de disponibilidade mínima (SLA) de **99,5%** ao mês.

### [RNF004] Atomicidade e Consistência Transacional (ACID)
Todas as operações financeiras que alteram o saldo do Caixa Comunitário, liquidam reembolsos ou aplicam abatimentos em mensalidades devem ser executadas dentro de transações atômicas (`@Transactional` no Spring Boot com controle de concorrência no PostgreSQL). Em caso de falha em qualquer etapa, o sistema deve realizar *rollback* completo para preservar a integridade contábil.

### [RNF005] Tolerância a Falhas e Taxa de Erros
A taxa de respostas de erro interno do servidor (`HTTP 5xx`) deve ser inferior a **0,1%** do total de requisições diárias, com registro estruturado de logs para rastreamento e diagnóstico.

---

## 4.3 Segurança e Privacidade

### [RNF006] Autenticação Stateless (JWT) e Criptografia de Senhas
A autenticação entre o front-end React e o back-end Spring Boot deve ser realizada de forma *stateless* via **JSON Web Token (JWT)** assinado digitalmente, trafegado exclusivamente sobre **HTTPS (TLS 1.2+)**. As senhas dos usuários devem ser criptografadas com **BCrypt** (fator de custo $\ge 10$).

### [RNF007] Controle de Acesso Baseado em Papéis (RBAC) e Isolamento de Dados
O back-end deve validar em todas as rotas autenticadas:
1. O papel do usuário (`ROLE_ADMIN` vs. `ROLE_MORADOR`) via **Spring Security** (`@PreAuthorize`); e
2. Se o recurso acessado pertence ao `republica_id` do usuário autenticado, impedindo qualquer acesso cruzado (*Insecure Direct Object Reference — IDOR*).

---

## 4.4 Usabilidade e Manutenibilidade

### [RNF008] Tratamento Padronizado de Erros e Feedback Claro
A API deve retornar erros no formato padronizado **RFC 7807 (Problem Details for HTTP APIs)**, e a interface gráfica deve apresentar mensagens em linguagem clara e instrutiva, indicando exatamente ao usuário como corrigir o problema (ex.: *"Conflito de horário: a Churrasqueira já está reservada das 18h às 22h neste dia"*).

### [RNF009] Ajuda Contextual e Onboarding
O sistema deve fornecer dicas visuais (*empty states* explicativos e *tooltips*) e uma seção de ajuda rápida explicando o funcionamento do Caixa Comunitário, dos Reembolsos e do Ranking Mensal para novos moradores.

---

## 4.5 Arquitetura, Software e Infraestrutura

### [RNF010] Stack Tecnológica Padronizada
O sistema deve ser desenvolvido estritamente com as seguintes tecnologias modernas:
- **Front-end**: **React 18+** (com TypeScript/JavaScript, Vite, Tailwind CSS ou biblioteca de componentes responsiva, e configuração de Service Worker para **PWA**).
- **Back-end**: **Java 21 LTS** com **Spring Boot 3.x** (Spring Web, Spring Security, Spring Data JPA / Hibernate, Bean Validation, Flyway para versionamento de schema e agendamento via `@Scheduled`).
- **Banco de Dados**: **PostgreSQL 16+**.
- **Armazenamento de Arquivos (Uploads)**: Sistema de arquivos local em ambiente de desenvolvimento, abstraído por interface (`StorageService`) compatível com **AWS S3 / Cloudflare R2 / Cloudinary** em ambiente de produção.

### [RNF011] Compatibilidade de Dispositivos e Navegadores
Por ser uma aplicação web responsiva (PWA), o sistema deve funcionar em qualquer smartphone (Android 10+ ou iOS 15+) e computador desktop com navegador moderno atualizado (Google Chrome, Apple Safari, Mozilla Firefox ou Microsoft Edge), exigindo no dispositivo cliente apenas capacidade de execução de navegador web moderno (mínimo de 2 GB de RAM recomendados no dispositivo).
