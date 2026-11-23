# Code Quality Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar a arquitetura em camadas (`UI -> Hooks -> Services`), eliminar fragilidades de tipagem (`[x: string]: any`), centralizar utilitários/validações com testes unitários e decompor as quatro "God Screens" (>1.450 linhas) em componentes modulares sem alterar o comportamento visual.

**Architecture:** Refatoração incremental bottom-up em 6 tarefas independentemente testáveis: (1) scripts de qualidade e logger seguro para `__DEV__`, (2) utilitários puros de data/moeda e normalização estrita do modelo `Task`, (3) extração de `financesService` e unificação de endpoints em `taskService`/`republicService`, (4) desacoplamento dos hooks `useFinances`, `useTasks` e novo `useRepublicMembers`, (5) unificação do formulário de tarefas (`create.tsx` e `edit.tsx`) com Zod schema compartilhado, e (6) decomposição das telas de detalhes (`tasks/[id].tsx`, `events/[id].tsx`, `finances/expenses/[id].tsx`).

**Tech Stack:** React Native `0.76.8`, Expo `~52.0.42`, Expo Router `~4.0.19`, TypeScript `~5.3.3` (`strict: true`), React Hook Form `^7.54.2`, Zod `^3.24.2`, Axios `^1.7.9`, date-fns `^4.1.0`, Jest `^29.7.0` (`jest-expo`).

**Spec:** `docs/superpowers/specs/2026-11-14-code-quality-refactoring-design.md`

## Global Constraints

- Compatibilidade de plataforma: React Native `0.76.8`, Expo `~52.0.42`, Expo Router `~4.0.19`, TypeScript `~5.3.3` (`strict: true`).
- Sem novas dependências de produção: utilizar exclusivamente os pacotes já presentes em `package.json`.
- Camada de rede isolada: `src/services/` é a única camada autorizada a importar `src/services/api.ts`; nenhum arquivo em `app/`, `components/` ou `src/hooks/` deve chamar `api.get/post/put/delete` diretamente.
- Preservação de rotas e UI: manter todas as rotas do Expo Router, cores (`#222`, `#7B68EE`) e mensagens de validação/erro em português (`pt-BR`).

## Review Focus

1. **Payloads mistos do backend (snake_case vs camelCase em `Task`):** A API retorna ora `republic_id`/`assigned_users`/`isRecurring`, ora `republicId`/`assignedUsers`/`recurring`; `normalizeTask` deve mapear ambos sem perder dados quando `[x: string]: any` for removido.
2. **Strings de data inválidas ou nulas em utilitários de formatação:** `formatLocalDate`, `formatShortDate` e `formatTime` não podem lançar exceção não tratada ao receber `undefined`, `null` ou string vazia vindos de tarefas/despesas sem data.
3. **Valores monetários com vírgula ou máscara BRL (`"R$ 1.250,50"` ou `"1250,50"`):** `parseCurrencyInput` deve converter corretamente formatos brasileiros para `number` e retornar `NaN` para entradas vazias ou não numéricas.
4. **Tarefas recorrentes sem `dueDate` na criação:** O schema `taskFormSchema` deve rejeitar `recurring: true` quando `dueDate` estiver ausente, com a mensagem exata `"Para tarefas recorrentes, a data da primeira ocorrência é obrigatória"` no caminho `["dueDate"]`.
5. **Logs sensíveis fora de `__DEV__`:** Chamadas a `logger.debug` e `logger.info` não devem executar `console.log`/`console.info` quando `(global as any).__DEV__ === false`.

---

### Task 1: Infraestrutura de Qualidade, Scripts de Verificação e Logger Seguro

**Files:**
- Modify: `package.json:5-27`
- Create: `src/utils/logger.ts`
- Modify: `src/context/AuthContext.tsx:80-115`
- Test: `src/utils/__tests__/logger.test.ts`

**Interfaces:**
- Consumes: Variável global `__DEV__: boolean` do ambiente React Native / Expo.
- Produces:
  - `src/utils/logger.ts`:
    ```ts
    export interface Logger {
      debug: (message: string, ...meta: unknown[]) => void;
      info: (message: string, ...meta: unknown[]) => void;
      warn: (message: string, ...meta: unknown[]) => void;
      error: (message: string, ...meta: unknown[]) => void;
    }
    export const logger: Logger;
    ```
  - Scripts em `package.json`: `"test:ci": "jest --watchAll=false"`, `"typecheck": "tsc --noEmit"`.

- [x] **Step 1: Write the failing test in `src/utils/__tests__/logger.test.ts`**

```ts
import { logger } from '../logger';

describe('logger', () => {
  const originalDev = (global as any).__DEV__;

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  it('emits debug and info logs when __DEV__ is true', () => {
    (global as any).__DEV__ = true;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    logger.debug('debug msg', { id: 1 });
    logger.info('info msg');

    expect(logSpy).toHaveBeenCalledWith('[DEBUG] debug msg', { id: 1 });
    expect(infoSpy).toHaveBeenCalledWith('[INFO] info msg');
  });

  it('suppresses debug, info, and warn logs when __DEV__ is false', () => {
    (global as any).__DEV__ = false;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    logger.debug('secret token');
    logger.info('user data');
    logger.warn('warning');

    expect(logSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/logger.test.ts --watchAll=false`
Expected: FAIL with `Cannot find module '../logger'`

- [x] **Step 3: Implement `logger` in `src/utils/logger.ts`, add scripts to `package.json`, and replace unprotected `console.log` calls in `src/context/AuthContext.tsx`**

Implementar `logger` em `src/utils/logger.ts` verificando `typeof __DEV__ !== 'undefined' && __DEV__`, adicionar `"test:ci": "jest --watchAll=false"` e `"typecheck": "tsc --noEmit"` em `package.json`, e substituir `console.log`/`console.error` diretos em `src/context/AuthContext.tsx` por `logger.debug`/`logger.error`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest src/utils/__tests__/logger.test.ts --watchAll=false`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add package.json src/utils/logger.ts src/utils/__tests__/logger.test.ts src/context/AuthContext.tsx
git commit -m "chore: add safe dev logger, unit test, and verification scripts"
```

---

### Task 2: Padronização do Modelo `Task` e Utilitários de Formatação (`dateUtils` e `currencyUtils`)

**Files:**
- Modify: `src/models/task.model.ts:1-57`
- Modify: `src/utils/dateUtils.ts:1-67`
- Create: `src/utils/currencyUtils.ts`
- Test: `src/models/__tests__/task.model.test.ts`
- Test: `src/utils/__tests__/dateUtils.test.ts`
- Test: `src/utils/__tests__/currencyUtils.test.ts`

**Interfaces:**
- Consumes: `User` de `src/models/user.model.ts`.
- Produces:
  - `src/models/task.model.ts`:
    ```ts
    export type RecurrenceType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    export type TaskStatus = 'PENDING' | 'COMPLETED' | 'IN_PROGRESS' | 'OVERDUE' | 'CANCELLED';

    export interface Task {
      id: number;
      republicId: string;
      republic_id?: string;
      title: string;
      description?: string;
      dueDate?: string;
      category?: string;
      status: TaskStatus;
      createdAt?: string;
      updatedAt?: string;
      updated_at?: string;
      assignedUsers?: User[];
      assigned_users?: string[];
      completedAt?: string;
      completed_at?: string;
      createdBy?: User;
      recurring?: boolean;
      isRecurring?: boolean;
      recurrenceType?: RecurrenceType;
      recurrenceInterval?: number;
      recurrenceEndDate?: string;
      parentTaskId?: number;
    }

    export function normalizeTask(raw: Record<string, unknown>): Task;
    ```
  - `src/utils/dateUtils.ts`:
    ```ts
    export const formatShortDate: (date?: Date | string | null) => string;
    export const mergeDateAndTime: (baseDate: Date, selected: Date, mode: 'date' | 'time') => Date;
    ```
  - `src/utils/currencyUtils.ts`:
    ```ts
    export const formatCurrencyBRL: (amount: number | null | undefined) => string;
    export const parseCurrencyInput: (raw: string | number) => number;
    ```

- [x] **Step 1: Write the failing tests for `normalizeTask`, `dateUtils`, and `currencyUtils`**

Em `src/models/__tests__/task.model.test.ts`:
```ts
import { normalizeTask } from '../task.model';

describe('normalizeTask', () => {
  it('normalizes snake_case and isRecurring fields into standard Task properties', () => {
    const raw = {
      id: 42,
      republic_id: 'rep-1',
      title: 'Limpar cozinha',
      status: 'PENDING',
      isRecurring: true,
      recurrenceType: 'WEEKLY',
      recurrenceInterval: 2,
      completed_at: '2026-11-10T10:00:00',
    };

    const task = normalizeTask(raw);
    expect(task.id).toBe(42);
    expect(task.republicId).toBe('rep-1');
    expect(task.republic_id).toBe('rep-1');
    expect(task.recurring).toBe(true);
    expect(task.completedAt).toBe('2026-11-10T10:00:00');
  });
});
```

Em `src/utils/__tests__/dateUtils.test.ts`:
```ts
import { formatShortDate, mergeDateAndTime, formatTime } from '../dateUtils';

describe('dateUtils', () => {
  it('formats Date or ISO string to dd/MM/yyyy and returns empty string for null/undefined/invalid', () => {
    expect(formatShortDate('2026-11-14T15:30:00')).toBe('14/11/2026');
    expect(formatShortDate(undefined)).toBe('');
    expect(formatShortDate(null)).toBe('');
    expect(formatShortDate('invalid-date')).toBe('');
  });

  it('merges date part or time part preserving the counterpart', () => {
    const base = new Date(2026, 10, 14, 10, 15, 0);
    const newDatePart = new Date(2026, 11, 25, 0, 0, 0);
    const mergedDate = mergeDateAndTime(base, newDatePart, 'date');
    expect(mergedDate.getFullYear()).toBe(2026);
    expect(mergedDate.getMonth()).toBe(11);
    expect(mergedDate.getDate()).toBe(25);
    expect(mergedDate.getHours()).toBe(10);
    expect(mergedDate.getMinutes()).toBe(15);

    const newTimePart = new Date(2026, 0, 1, 18, 45, 0);
    const mergedTime = mergeDateAndTime(base, newTimePart, 'time');
    expect(mergedTime.getDate()).toBe(14);
    expect(mergedTime.getHours()).toBe(18);
    expect(mergedTime.getMinutes()).toBe(45);
  });
});
```

Em `src/utils/__tests__/currencyUtils.test.ts`:
```ts
import { formatCurrencyBRL, parseCurrencyInput } from '../currencyUtils';

describe('currencyUtils', () => {
  it('formats numbers as BRL currency string', () => {
    expect(formatCurrencyBRL(1250.5)).toMatch(/R\$\s?1\.250,50/);
    expect(formatCurrencyBRL(0)).toMatch(/R\$\s?0,00/);
    expect(formatCurrencyBRL(null)).toMatch(/R\$\s?0,00/);
  });

  it('parses Brazilian currency strings and numbers accurately', () => {
    expect(parseCurrencyInput('R$ 1.250,50')).toBe(1250.5);
    expect(parseCurrencyInput('45,90')).toBe(45.9);
    expect(parseCurrencyInput('120.75')).toBe(120.75);
    expect(parseCurrencyInput(89.9)).toBe(89.9);
    expect(Number.isNaN(parseCurrencyInput(''))).toBe(true);
    expect(Number.isNaN(parseCurrencyInput('abc'))).toBe(true);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx jest src/models/__tests__/task.model.test.ts src/utils/__tests__/dateUtils.test.ts src/utils/__tests__/currencyUtils.test.ts --watchAll=false`
Expected: FAIL (`normalizeTask is not a function`, `formatShortDate is not a function`, `Cannot find module '../currencyUtils'`)

- [x] **Step 3: Implement `normalizeTask` in `src/models/task.model.ts`, extend `src/utils/dateUtils.ts`, and create `src/utils/currencyUtils.ts`**

Remover `[x: string]: any` de `Task` em `src/models/task.model.ts` e implementar `normalizeTask`. Em `src/utils/dateUtils.ts`, tornar `formatLocalDate`, `formatTime` e `formatShortDate` resilientes a entradas nulas/inválidas (`isValid` do `date-fns`) e adicionar `mergeDateAndTime`. Em `src/utils/currencyUtils.ts`, implementar `formatCurrencyBRL` via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` e `parseCurrencyInput` tratando separadores de milhar (`.`) e decimal (`,`).

- [x] **Step 4: Run tests to verify they pass**

Run: `npx jest src/models/__tests__/task.model.test.ts src/utils/__tests__/dateUtils.test.ts src/utils/__tests__/currencyUtils.test.ts --watchAll=false`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/models/task.model.ts src/models/__tests__/task.model.test.ts src/utils/dateUtils.ts src/utils/__tests__/dateUtils.test.ts src/utils/currencyUtils.ts src/utils/__tests__/currencyUtils.test.ts
git commit -m "refactor(models,utils): remove any index signature from Task and centralize date/currency utils"
```

---

### Task 3: Extração e Padronização da Camada de Serviços (`financesService`, `taskService`)

**Files:**
- Create: `src/services/financesService.ts`
- Modify: `src/services/taskService.ts:1-127`
- Test: `src/services/__tests__/financesService.test.ts`
- Test: `src/services/__tests__/taskService.test.ts`

**Interfaces:**
- Consumes:
  - `api` de `src/services/api.ts`
  - `normalizeTask`, `Task`, `CreateTaskDTO`, `UpdateTaskDTO` de `src/models/task.model.ts`
  - `Expense`, `Income`, `CreateExpenseRequest`, `UpdateExpenseRequest`, `RejectExpenseRequest`, `CreateIncomeRequest`, `UpdateIncomeRequest`, `FinancialDashboardSummary`, `MonthlyChartData`, `PendingActionsResponse` de `src/models/finances.model.ts`
- Produces:
  - `src/services/financesService.ts`:
    ```ts
    export const getExpenses: (republicId: string) => Promise<Expense[]>;
    export const getExpensesByStatus: (republicId: string, status: string) => Promise<Expense[]>;
    export const getExpenseById: (id: number) => Promise<Expense>;
    export const createExpense: (data: CreateExpenseRequest) => Promise<Expense>;
    export const updateExpense: (id: number, data: UpdateExpenseRequest) => Promise<Expense>;
    export const approveExpense: (id: number) => Promise<Expense>;
    export const rejectExpense: (id: number, data: RejectExpenseRequest) => Promise<Expense>;
    export const reimburseExpense: (id: number) => Promise<Expense>;
    export const resetExpenseStatus: (id: number) => Promise<Expense>;
    export const deleteExpense: (id: number) => Promise<void>;
    export const getIncomes: (republicId: string) => Promise<Income[]>;
    export const getIncomeById: (id: number) => Promise<Income>;
    export const createIncome: (data: CreateIncomeRequest) => Promise<Income>;
    export const updateIncome: (id: number, data: UpdateIncomeRequest) => Promise<Income>;
    export const deleteIncome: (id: number) => Promise<void>;
    export const getDashboardSummary: (republicId: string) => Promise<FinancialDashboardSummary>;
    export const getMonthlyExpensesChart: (republicId: string, numberOfMonths?: number) => Promise<MonthlyChartData>;
    export const getPendingActions: (republicId: string) => Promise<PendingActionsResponse>;
    export const adjustRepublicBalance: (republicId: string, amount: number, description?: string) => Promise<FinancialDashboardSummary>;
    ```
  - `src/services/taskService.ts`:
    ```ts
    export const getTaskById: (taskId: number | string) => Promise<Task>;
    ```

- [x] **Step 1: Write the failing tests for `financesService` and `taskService`**

Em `src/services/__tests__/financesService.test.ts`:
```ts
import api from '../api';
import * as financesService from '../financesService';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('financesService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches expenses for a republic', async () => {
    const mockExpenses = [{ id: 1, description: 'Luz', amount: 150 }];
    mockedApi.get.mockResolvedValueOnce({ data: mockExpenses } as any);

    const result = await financesService.getExpenses('rep-123');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/expenses', { params: { republicId: 'rep-123' } });
    expect(result).toEqual(mockExpenses);
  });

  it('adjusts republic balance with default empty description', async () => {
    const mockSummary = { currentBalance: 500 };
    mockedApi.post.mockResolvedValueOnce({ data: mockSummary } as any);

    const result = await financesService.adjustRepublicBalance('rep-123', 500);
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/finances/rep-123/adjust-balance', {
      amount: 500,
      description: '',
    });
    expect(result).toEqual(mockSummary);
  });
});
```

Em `src/services/__tests__/taskService.test.ts`:
```ts
import api from '../api';
import * as taskService from '../taskService';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('taskService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches and normalizes a single task by ID via getTaskById', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { id: 9, republic_id: 'rep-1', title: 'Compras', status: 'PENDING', isRecurring: true },
    } as any);

    const task = await taskService.getTaskById(9);
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/tasks/9');
    expect(task.republicId).toBe('rep-1');
    expect(task.recurring).toBe(true);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx jest src/services/__tests__/financesService.test.ts src/services/__tests__/taskService.test.ts --watchAll=false`
Expected: FAIL (`Cannot find module '../financesService'`, `taskService.getTaskById is not a function`)

- [x] **Step 3: Implement `src/services/financesService.ts` and add `getTaskById` + `normalizeTask` integration in `src/services/taskService.ts`**

Criar `src/services/financesService.ts` encapsulando todos os endpoints financeiros hoje presentes em `useFinances.ts`. Em `src/services/taskService.ts`, adicionar `getTaskById(taskId: number | string): Promise<Task>` e aplicar `normalizeTask` no retorno dos métodos que devolvem `Task` ou `PagedResponse<Task>`.

- [x] **Step 4: Run tests to verify they pass**

Run: `npx jest src/services/__tests__/financesService.test.ts src/services/__tests__/taskService.test.ts --watchAll=false`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/services/financesService.ts src/services/taskService.ts src/services/__tests__/financesService.test.ts src/services/__tests__/taskService.test.ts
git commit -m "refactor(services): extract financesService and add getTaskById with normalization"
```

---

### Task 4: Refatoração dos Hooks (`useFinances`, `useTasks`, `useRepublicMembers`)

**Files:**
- Create: `src/hooks/useRepublicMembers.ts`
- Modify: `src/hooks/useFinances.ts:1-449`
- Modify: `src/hooks/useTasks.ts:295-390`
- Test: `src/hooks/__tests__/useRepublicMembers.test.ts`

**Interfaces:**
- Consumes:
  - `getRepublicMembers` de `src/services/republicService.ts`
  - `* as financesService` de `src/services/financesService.ts`
  - `* as taskService` de `src/services/taskService.ts`
- Produces:
  - `src/hooks/useRepublicMembers.ts`:
    ```ts
    export interface SelectableMember {
      uid: string;
      name: string;
      nickname?: string;
      email: string;
      profilePictureUrl?: string;
    }

    export function normalizeMembers(rawMembers: Array<Record<string, any>>): SelectableMember[];
    export function useRepublicMembers(republicId?: string): {
      members: SelectableMember[];
      loading: boolean;
      error: string | null;
      refreshMembers: () => Promise<void>;
    };
    ```
  - `src/hooks/useFinances.ts`: Mesma interface pública de retorno atual, sem importar `src/services/api.ts`.
  - `src/hooks/useTasks.ts`: `createTask(taskData: CreateTaskDTO)`, `updateTask(taskId: number, updateData: UpdateTaskDTO)`, `getTaskById(taskId: number | string): Promise<Task>` e atualização em `assignMultipleUsers` usando `await refreshLists()` em vez de `setTimeout(..., 500)`.

- [x] **Step 1: Write the failing test in `src/hooks/__tests__/useRepublicMembers.test.ts`**

```ts
import { normalizeMembers } from '../useRepublicMembers';

describe('normalizeMembers', () => {
  it('maps id fallback to uid and preserves profilePictureUrl', () => {
    const raw = [
      { id: 'u-1', name: 'Ana Silva', email: 'ana@rep.com', nickname: 'Ana', profilePictureUrl: 'https://img/1.png' },
      { uid: 'u-2', name: 'Bruno Souza', email: 'bruno@rep.com' },
    ];

    const result = normalizeMembers(raw);
    expect(result).toEqual([
      { uid: 'u-1', name: 'Ana Silva', email: 'ana@rep.com', nickname: 'Ana', profilePictureUrl: 'https://img/1.png' },
      { uid: 'u-2', name: 'Bruno Souza', email: 'bruno@rep.com', nickname: undefined, profilePictureUrl: undefined },
    ]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest src/hooks/__tests__/useRepublicMembers.test.ts --watchAll=false`
Expected: FAIL (`Cannot find module '../useRepublicMembers'`)

- [x] **Step 3: Implement `useRepublicMembers.ts` and refactor `useFinances.ts` and `useTasks.ts`**

1. Criar `src/hooks/useRepublicMembers.ts` consumindo `getRepublicMembers` de `src/services/republicService.ts` (endpoint único `/api/v1/republics/${republicId}/members`) e exportando `normalizeMembers`.
2. Refatorar `src/hooks/useFinances.ts` substituindo todas as chamadas `api.get/post/put/delete` por chamadas a `financesService.*` e removendo o import de `../services/api`.
3. Em `src/hooks/useTasks.ts`, expor `getTaskById: taskService.getTaskById`, tipar `createTask` e `updateTask` com `CreateTaskDTO` e `UpdateTaskDTO`, e substituir os `setTimeout` de 500ms em `assignMultipleUsers` por `await refreshLists()`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest src/hooks/__tests__/useRepublicMembers.test.ts --watchAll=false`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/hooks/useRepublicMembers.ts src/hooks/__tests__/useRepublicMembers.test.ts src/hooks/useFinances.ts src/hooks/useTasks.ts
git commit -m "refactor(hooks): decouple useFinances from axios, add useRepublicMembers, and clean up useTasks"
```

---

### Task 5: Unificação do Formulário de Tarefas e Refatoração de `tasks/create.tsx` e `tasks/edit.tsx`

**Files:**
- Create: `src/validation/taskSchemas.ts`
- Create: `components/Task/TaskEdit/RecurrenceSection.tsx`
- Modify: `components/Task/TaskEdit/index.tsx:1-6`
- Modify: `app/(panel)/tasks/create.tsx:1-1623`
- Modify: `app/(panel)/tasks/edit.tsx:1-299`
- Test: `src/validation/__tests__/taskSchemas.test.ts`

**Interfaces:**
- Consumes:
  - `mergeDateAndTime`, `formatShortDate`, `formatTime` de `src/utils/dateUtils.ts`
  - `useRepublicMembers` de `src/hooks/useRepublicMembers.ts`
  - `useTasks` de `src/hooks/useTasks.ts`
- Produces:
  - `src/validation/taskSchemas.ts`:
    ```ts
    export const COMMON_TASK_CATEGORIES: readonly string[];
    export const RECURRENCE_TYPES: ReadonlyArray<{ key: RecurrenceType; label: string; icon: string }>;
    export const taskFormSchema: z.ZodEffects<z.ZodObject<any>>;
    export type TaskFormValues = z.infer<typeof taskFormSchema>;
    export function getRecurrencePatternLabel(recurring?: boolean, recurrenceType?: string, recurrenceInterval?: number): string;
    export function getRecurrenceDescriptionText(recurring?: boolean, recurrenceType?: string, recurrenceInterval?: number, recurrenceEndDate?: Date): string;
    ```
  - `components/Task/TaskEdit/RecurrenceSection.tsx`: Componente modular para configuração e modal de recorrência, exportado em `components/Task/TaskEdit/index.tsx`.

- [x] **Step 1: Write the failing test in `src/validation/__tests__/taskSchemas.test.ts`**

```ts
import { taskFormSchema, getRecurrencePatternLabel } from '../taskSchemas';

describe('taskFormSchema', () => {
  it('validates a standard non-recurring task with valid title', () => {
    const result = taskFormSchema.safeParse({
      title: 'Comprar detergente',
      recurring: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a title shorter than 3 characters', () => {
    const result = taskFormSchema.safeParse({
      title: 'Oi',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Título deve ter pelo menos 3 caracteres');
    }
  });

  it('rejects a recurring task without dueDate', () => {
    const result = taskFormSchema.safeParse({
      title: 'Limpar banheiro',
      recurring: true,
      recurrenceType: 'WEEKLY',
      recurrenceInterval: 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['dueDate']);
      expect(result.error.issues[0].message).toBe(
        'Para tarefas recorrentes, a data da primeira ocorrência é obrigatória'
      );
    }
  });

  it('formats recurrence pattern label in Portuguese', () => {
    expect(getRecurrencePatternLabel(false, 'WEEKLY', 1)).toBe('');
    expect(getRecurrencePatternLabel(true, 'WEEKLY', 1)).toBe('Semanal');
    expect(getRecurrencePatternLabel(true, 'DAILY', 3)).toBe('Diária (a cada 3 dias)');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest src/validation/__tests__/taskSchemas.test.ts --watchAll=false`
Expected: FAIL (`Cannot find module '../taskSchemas'`)

- [x] **Step 3: Create `src/validation/taskSchemas.ts`, `components/Task/TaskEdit/RecurrenceSection.tsx`, and refactor `app/(panel)/tasks/create.tsx` and `app/(panel)/tasks/edit.tsx`**

1. Criar `src/validation/taskSchemas.ts` com `taskFormSchema`, `COMMON_TASK_CATEGORIES`, `RECURRENCE_TYPES`, `getRecurrencePatternLabel` e `getRecurrenceDescriptionText`.
2. Criar `components/Task/TaskEdit/RecurrenceSection.tsx` extraindo o switch e o modal de recorrência de `app/(panel)/tasks/create.tsx`, e reexportá-lo em `components/Task/TaskEdit/index.tsx`.
3. Refatorar `app/(panel)/tasks/create.tsx` para usar `HeaderBar`, `TitleDescriptionInputs`, `UserAssignmentSection`, `DateTimePickerSection`, `CategorySection`, `RecurrenceSection`, `useRepublicMembers` e `taskFormSchema`, removendo o import direto de `api` e os 3 modais duplicados.
4. Refatorar `app/(panel)/tasks/edit.tsx` para usar `getTaskById` de `useTasks()`, `useRepublicMembers(user?.currentRepublicId)` (corrigindo o endpoint `/users` para `/members`) e `taskFormSchema`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest src/validation/__tests__/taskSchemas.test.ts --watchAll=false`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/validation/taskSchemas.ts src/validation/__tests__/taskSchemas.test.ts components/Task/TaskEdit/RecurrenceSection.tsx components/Task/TaskEdit/index.tsx "app/(panel)/tasks/create.tsx" "app/(panel)/tasks/edit.tsx"
git commit -m "refactor(tasks): unify task form components, schema, and member fetching across create and edit screens"
```

---

### Task 6: Decomposição das Telas de Detalhes ("God Screens": `tasks/[id].tsx`, `events/[id].tsx`, `finances/expenses/[id].tsx`)

**Files:**
- Create: `components/common/ConfirmDeleteModal.tsx`
- Create: `components/Task/TaskDetails/TaskActionButtons.tsx`
- Create: `components/Task/TaskDetails/TaskAssignedUsersCard.tsx`
- Create: `components/Event/EventDetails/EventAttendanceGroups.tsx`
- Create: `components/Finances/ExpenseDetails/ExpenseTimeline.tsx`
- Create: `components/Finances/ExpenseDetails/RejectExpenseModal.tsx`
- Modify: `app/(panel)/tasks/[id].tsx:1-1593`
- Modify: `app/(panel)/events/[id].tsx:1-1553`
- Modify: `app/(panel)/finances/expenses/[id].tsx:1-1458`
- Test: `src/utils/__tests__/screenDecomposition.test.ts`

**Interfaces:**
- Consumes:
  - `Task` de `src/models/task.model.ts`
  - `Event` de `src/services/events/eventsTypes.ts`
  - `Expense` de `src/models/finances.model.ts`
  - `formatLocalDate`, `formatTime` de `src/utils/dateUtils.ts`
  - `formatCurrencyBRL` de `src/utils/currencyUtils.ts`
- Produces:
  - `components/common/ConfirmDeleteModal.tsx`:
    ```ts
    export interface ConfirmDeleteModalProps {
      visible: boolean;
      title: string;
      message: string;
      warningText?: string;
      loading?: boolean;
      onCancel: () => void;
      onConfirm: () => void;
    }
    ```
  - `components/Finances/ExpenseDetails/ExpenseTimeline.tsx`:
    ```ts
    export interface ExpenseTimelineProps {
      expense: Expense;
    }
    export function buildExpenseTimelineSteps(expense: Expense): Array<{
      key: string;
      title: string;
      date?: string | null;
      isCompleted: boolean;
      isRejected?: boolean;
      rejectionReason?: string;
      isLast?: boolean;
      isFuture?: boolean;
    }>;
    ```

- [x] **Step 1: Write the failing test in `src/utils/__tests__/screenDecomposition.test.ts`**

```ts
import { buildExpenseTimelineSteps } from '../../../components/Finances/ExpenseDetails/ExpenseTimeline';
import { Expense } from '../../models/finances.model';

describe('buildExpenseTimelineSteps', () => {
  const baseExpense: Expense = {
    id: 10,
    type: 'EXPENSE',
    description: 'Internet',
    amount: 120,
    date: '2026-11-01',
    expenseDate: '2026-11-01',
    category: 'Contas',
    status: 'PENDING',
    republicId: 'rep-1',
    creatorId: 'u-1',
    creatorName: 'João',
    createdAt: '2026-11-01T12:00:00',
  };

  it('marks creation completed and approval/reimbursement pending when status is PENDING', () => {
    const steps = buildExpenseTimelineSteps(baseExpense);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatchObject({ key: 'created', isCompleted: true });
    expect(steps[1]).toMatchObject({ key: 'approval', isCompleted: false, isRejected: false });
    expect(steps[2]).toMatchObject({ key: 'reimbursement', isCompleted: false, isFuture: true, isLast: true });
  });

  it('marks second step as rejected with rejectionReason when status is REJECTED', () => {
    const rejected: Expense = {
      ...baseExpense,
      status: 'REJECTED',
      rejectionReason: 'Comprovante ilegível',
    };
    const steps = buildExpenseTimelineSteps(rejected);
    expect(steps[1]).toMatchObject({
      key: 'approval',
      isCompleted: false,
      isRejected: true,
      rejectionReason: 'Comprovante ilegível',
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/screenDecomposition.test.ts --watchAll=false`
Expected: FAIL (`Cannot find module '../../../components/Finances/ExpenseDetails/ExpenseTimeline'`)

- [x] **Step 3: Extract shared and domain detail components and refactor the three detail screens**

1. Criar `components/common/ConfirmDeleteModal.tsx` unificando o modal de confirmação de exclusão usado em tarefas, eventos e despesas.
2. Criar `components/Finances/ExpenseDetails/ExpenseTimeline.tsx` (incluindo `buildExpenseTimelineSteps`) e `components/Finances/ExpenseDetails/ExpenseReceiptModal.tsx`, e atualizar `app/(panel)/finances/expenses/[id].tsx` para utilizá-los junto com `formatCurrencyBRL` e `ConfirmDeleteModal`.
3. Criar `components/Task/TaskDetails/TaskRecurrenceCard.tsx`, `components/Task/TaskDetails/TaskAssignedUsersCard.tsx` e `components/Task/TaskDetails/TaskActionButtons.tsx`, e atualizar `app/(panel)/tasks/[id].tsx` para utilizá-los, substituindo `api.get('/api/v1/tasks/${id}')` por `getTaskById(id)` do hook `useTasks()`.
4. Criar `components/Event/EventDetails/EventAttendanceGroups.tsx` e `components/Event/EventDetails/EventParticipationActions.tsx` e atualizar `app/(panel)/events/[id].tsx` para utilizá-los junto com `ConfirmDeleteModal`.

- [x] **Step 4: Run all tests and typecheck to verify everything passes**

Run: `npx jest --watchAll=false`
Expected: PASS (todas as suítes de testes verdes)

- [x] **Step 5: Commit**

```bash
git add components/common/ConfirmDeleteModal.tsx components/Finances/ExpenseDetails/ExpenseTimeline.tsx components/Finances/ExpenseDetails/RejectExpenseModal.tsx components/Task/TaskDetails/TaskAssignedUsersCard.tsx components/Task/TaskDetails/TaskActionButtons.tsx components/Event/EventDetails/EventAttendanceGroups.tsx "app/(panel)/tasks/[id].tsx" "app/(panel)/events/[id].tsx" "app/(panel)/finances/expenses/[id].tsx" src/utils/__tests__/screenDecomposition.test.ts
git commit -m "refactor(screens): decompose task, event, and expense detail god-screens into modular components"
```
