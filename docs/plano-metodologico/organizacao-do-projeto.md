# Organização do Projeto e da Equipe

## 1. Estrutura Organizacional

A equipe do projeto **RepHelper** é composta por **6 integrantes**, organizados de forma multidisciplinar para cobrir gestão, produto, design, desenvolvimento full-stack e garantia de qualidade:

| Papel | Qtd. | Foco Principal |
| :--- | :---: | :--- |
| **Gerente de Projeto (GP)** | 1 | Planejamento de releases, gestão de riscos, acompanhamento de métricas e comunicação. |
| **Product Owner (PO)** | 1 | Guardião das regras de negócio, priorização do Product Backlog e validação de critérios de aceitação. |
| **Scrum Master (SM)** | 1 | Facilitação dos rituais ágeis, remoção de impedimentos técnicos/organizacionais e melhoria contínua. |
| **Desenvolvedores Full-Stack** | 2+ | Implementação do back-end (Java / Spring Boot / PostgreSQL) e do front-end (React PWA), atuando em pares junto aos demais membros técnicos. |
| **UI/UX Designer** | 1 | Prototipação (wireframes e guia de estilos), usabilidade *Mobile-First* e testes de interface. |
| **QA / Testador** | 1 | Elaboração de planos de teste, automação de testes de API/UI e validação das regras de negócio (`RN`). |

*(Nota: Em uma equipe enxuta de 6 pessoas, os integrantes de gestão/design/QA também colaboram ativamente na revisão e implementação de front-end/back-end durante as Sprints).*

- **Quadro Visual de Planejamento**: [Roadmap Visual no Miro](https://miro.com/app/board/uXjVKmd4UU4=/?share_link_id=234361324001)

---

## 2. Responsabilidades Detalhadas por Papel

### 2.1 Gerente de Projeto
- Manter o cronograma de Releases atualizado e monitorar o progresso das entregas no GitHub.
- Gerenciar riscos técnicos (ex.: integração entre módulos de Estoque e Financeiro) e garantir o alinhamento da equipe.

### 2.2 Product Owner (PO)
- Detalhar os critérios de aceitação de cada requisito (`RF001` a `RF026`) e regra de negócio (`RN001` a `RN017`).
- Homologar os incrementos entregues ao final de cada Sprint.

### 2.3 Scrum Master
- Conduzir as cerimônias (*Planning*, *Daily*, *Review* e *Retrospective*).
- Garantir o cumprimento da **Definição de Pronto (*Definition of Done — DoD*)**.

### 2.4 Desenvolvedores (Back-end Spring Boot & Front-end React)
- Desenvolver a API REST em **Spring Boot 3**, migrações **Flyway** no **PostgreSQL** e segurança **JWT**.
- Construir os componentes responsivos em **React (PWA)** consumindo a API REST.
- Escrever testes unitários e de integração e realizar revisões de código (*Pull Requests*).

### 2.5 Designer UI/UX
- Manter os wireframes e o *Design System* (cores, tipografia, temas claro/escuro e componentes mobile).
- Garantir que os fluxos de usuário respeitem os Requisitos de Interface (`RI001` a `RI008`).

### 2.6 Testador (QA)
- Criar cenários de teste baseados nos fluxos básicos e alternativos de todos os Casos de Uso.
- Validar casos de borda (ex.: bloqueio de saída de morador com dívida, abatimento de reembolso maior que a mensalidade, conflito de reserva de espaço comum).

---

## 3. Rituais e Fluxo de Trabalho (Workflow)

| Ritual | Frequência / Duração | Objetivo |
| :--- | :--- | :--- |
| **Sprint Planning** | Início da Sprint (1h–2h) | Selecionar os itens do Backlog da Sprint e quebrar em tarefas técnicas de front-end, back-end e banco. |
| **Daily Scrum** | Diária (15 min) | Sincronizar o que foi feito, o que será feito no dia e identificar bloqueios. |
| **Refinamento Técnico** | Meio da Sprint (45 min) | Revisar contratos de endpoints JSON e regras de negócio da próxima Sprint. |
| **Sprint Review** | Fim da Sprint (1h) | Demonstração prática do incremento funcionando (ambiente de staging/local) e validação pelo PO. |
| **Sprint Retrospective** | Fim da Sprint (45 min) | Avaliar o processo de trabalho da equipe e definir ações de melhoria para a próxima Sprint. |

## 4. Definição de Pronto (Definition of Done — DoD)

Uma funcionalidade (`RF`) só é considerada **Pronta (Done)** quando:
1. O banco de dados possui a migration **Flyway** correspondente versionada;
2. O endpoint no **Spring Boot** implementa todas as **Regras de Negócio (`RN`)** e validações de segurança (`ROLE_ADMIN` / `ROLE_MORADOR` e isolamento de `republica_id`);
3. A tela em **React** está responsiva (mobile e desktop), integrada à API e tratando estados de carregamento e erro;
4. Os fluxos básico e alternativos do Caso de Uso foram testados e aprovados pelo QA/PO.
