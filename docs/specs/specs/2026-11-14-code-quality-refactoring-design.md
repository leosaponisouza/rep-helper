# Design Spec: Refatoração para Qualidade de Código (rep-helper-frontend)

## 1. Intent & Why

O `rep-helper-frontend` (aplicativo React Native / Expo Router em TypeScript) cresceu rapidamente em funcionalidades (Tarefas, Eventos, Finanças, Repúblicas, Autenticação), mas acumulou dívida técnica estrutural que dificulta a manutenção, aumenta o risco de regressões e gera inconsistências entre telas:

1. **God Screens e Duplicação de Código:** Quatro arquivos de tela ultrapassam 1.450 linhas cada (`app/(panel)/tasks/create.tsx` com 1.623 linhas, `app/(panel)/tasks/[id].tsx` com 1.593 linhas, `app/(panel)/events/[id].tsx` com 1.553 linhas, `app/(panel)/finances/expenses/[id].tsx` com 1.458 linhas). Enquanto `app/(panel)/tasks/edit.tsx` (299 linhas) já usa componentes modulares em `components/Task/TaskEdit/`, `create.tsx` mantém toda a lógica, modais e estilos duplicados inline.
2. **Quebra de Camadas Arquiteturais:** Telas fazem chamadas HTTP diretas via `api.get` em vez de passar por `services`/`hooks` (gerando inclusive bugs de rota, como `/api/v1/republics/${id}/users` em `tasks/edit.tsx` vs `/api/v1/republics/${id}/members` em `tasks/create.tsx` e `republicService.ts`). Além disso, `useFinances.ts` concentra chamadas Axios diretas sem um `financesService.ts`.
3. **Fragilidade de Tipagem e Logs em Produção:** `src/models/task.model.ts` declara `[x: string]: any` na interface `Task`, desativando a verificação estática de propriedades e mascarando divergências (`recurring` vs `isRecurring`, `assigned_users` vs `assignedUsers`). Há múltiplos `console.log` executando fora de `__DEV__` (inclusive logando objetos de usuário e respostas de API).
4. **Ausência de Testes e Automação de Qualidade:** Embora `jest`, `jest-expo` e `typescript` estejam instalados em `package.json`, não há nenhum arquivo de teste automatizado nem scripts de `typecheck` ou `test:ci`.

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- Padronizar a arquitetura em 3 camadas claras: **UI (`app/` + `components/`) → Hooks (`src/hooks/`) → Services (`src/services/`)**.
- Eliminar a assinatura `[x: string]: any` de `Task` e tipar estritamente os DTOs e respostas da API com normalização segura.
- Centralizar utilitários repetidos (datas, moeda BRL, logs seguros em `__DEV__`) e schemas Zod (`src/validation/taskSchemas.ts`).
- Reduzir cada "God Screen" (>1.400 linhas) para telas de composição enxutas (<350 linhas) extraindo componentes coesos e reutilizando `components/Task/TaskEdit/`.
- Estabelecer cobertura de testes unitários com Jest para utilitários, modelos/normalizadores, serviços, schemas e hooks.

### Non-Goals
- Alterar o design visual, cores (`#222`, `#7B68EE`), fluxos de navegação ou contratos de backend existentes.
- Introduzir novas bibliotecas pesadas de gerenciamento de estado global (ex.: Redux, Zustand) — manter o padrão atual de Context + Custom Hooks.
- Reescrever módulos que já passaram por refatoração recente (`useEvents.ts` e `EventsService`), exceto na decomposição da tela `app/(panel)/events/[id].tsx`.

### Anti-Goals
- Quebrar compatibilidade com payloads legados do backend (snake_case vs camelCase) ao remover `any`.
- Criar abstrações prematuras ou genéricas demais que dificultem a leitura do código.

## 3. Constraints

- **Compatibilidade de Plataforma:** React Native `0.76.8`, Expo `~52.0.42`, Expo Router `~4.0.19`, TypeScript `~5.3.3` (`strict: true`).
- **Sem novas dependências de produção:** Utilizar exclusivamente os pacotes já presentes em `package.json` (`zod`, `react-hook-form`, `date-fns`, `axios`, `jest`, `jest-expo`).
- **Preservação de Comportamento:** Todas as rotas do Expo Router em `app/` devem manter os mesmos caminhos e parâmetros de URL (`useLocalSearchParams`).
- **Idioma de Mensagens de UI:** Todas as mensagens de erro, validação e alertas visíveis ao usuário devem permanecer em português (`pt-BR`).

## 4. Approaches Considered

1. **Big-Bang Rewrite (Descartada):** Reescrever todas as telas e hooks simultaneamente adicionando uma nova biblioteca de estado. Alto risco de regressão e difícil revisão.
2. **Apenas Extração Visual de Componentes (Descartada):** Quebrar arquivos grandes em subcomponentes mantendo chamadas `api.get` diretas e `[x: string]: any`. Reduz linhas por arquivo, mas mantém bugs de contrato e falta de testabilidade.
3. **Refatoração Incremental em Camadas — Bottom-Up (Escolhida):**
   - **Fase 1 (Base & Utilitários):** Scripts de verificação, logger seguro, utilitários de data/moeda e limpeza de tipos/normalizadores em `models/`.
   - **Fase 2 (Serviços & Hooks):** Extração de `financesService.ts`, completude de `taskService.ts`/`republicService.ts` e refatoração de `useFinances`, `useTasks` e `useRepublicMembers`.
   - **Fase 3 (UI & God Screens):** Unificação do formulário de tarefas (`create.tsx` + `edit.tsx`) e decomposição modular das telas de detalhes (`tasks/[id].tsx`, `events/[id].tsx`, `finances/expenses/[id].tsx`).

## 5. Architecture & Module Boundaries

- `src/utils/logger.ts`: Único ponto de log (`debug`, `info`, `warn`, `error`), silenciando `debug`/`info` quando `__DEV__` for `false`.
- `src/utils/dateUtils.ts` & `src/utils/currencyUtils.ts`: Funções puras testadas para formatação/parsing de datas (`pt-BR`) e valores monetários (`R$`).
- `src/models/task.model.ts`: Tipagem estrita sem `[x: string]: any`, acompanhada de `normalizeTask(raw: unknown): Task` para traduzir `republic_id`/`republicId`, `assigned_users`/`assignedUsers`, `recurring`/`isRecurring`.
- `src/services/`: Única camada autorizada a importar `src/services/api.ts`. Nenhum arquivo em `app/`, `components/` ou `src/hooks/` deve chamar `api.get/post/put/delete` diretamente.
- `src/validation/taskSchemas.ts`: Schema Zod compartilhado entre criação e edição de tarefas.
- `components/`: Componentes focados (cada um com responsabilidade única e <250 linhas) agrupados por domínio (`Task/TaskEdit`, `Task/TaskDetails`, `Event/EventDetails`, `Finances/ExpenseDetails`, `common/`).
