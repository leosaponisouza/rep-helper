# Security Hardening & Vulnerability Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate all Critical, High, Medium, and Low security findings across routing, session/token handling, log redaction, input/URL validation, Supabase storage uploads, Android native configuration, and vulnerable dependencies.

**Architecture:** Apply defense-in-depth across six isolated layers: synchronous route guards on every protected Expo Router group, fail-closed Axios/AuthContext session lifecycle with HTTPS & same-origin enforcement, recursive PII/secret log redaction, anti-enumeration auth schemas & URL path encoding, owner-scoped Supabase storage validation, and hardened Android release/build configuration plus dependency CVE updates.

**Tech Stack:** React Native 0.76, Expo SDK 52, Expo Router 4, TypeScript, Axios, Firebase Auth, Supabase Storage, Zod, Jest (`jest-expo`).

**Spec:** `docs/superpowers/specs/2026-11-18-security-hardening-design.md`

## Global Constraints

- Todas as alterações devem funcionar sem regressões em Android, iOS e Expo Web (`react-native-web`).
- `loginSchema` mantém `min(6)` para retrocompatibilidade com contas legadas; política forte (`min(8)`, 1 maiúscula, 1 minúscula, 1 número) aplica-se a `signUpSchema` e `changePasswordSchema`.
- Manter toda a UI, esquema de cores (`#222`, `#333`, `#7B68EE`, `#FF6347`) e mensagens ao usuário em Português (`pt-BR`).
- Upgrades de dependências devem preservar compatibilidade com Expo SDK 52 (`expo@~52.0.42`, `jest-expo@~52.0.6`); upgrades major incompatíveis ficam documentados como follow-up.
- Todos os novos módulos devem ser cobertos por testes Jest passando em `npm run test:ci` (exit code 0) e zero novos erros em `npx tsc --noEmit`.

## Review Focus

1. Direct URL or deep-link navigation to `/(panel)/*` or `/(republic)/*` when unauthenticated must resolve redirect synchronously during render (zero pre-`useEffect` render flash of protected children) -> pinned by Task 1 `authProtection.test.ts`.
2. A 401 refresh response returning HTTP 200 without `token` (or failing while concurrent requests are queued in `failedQueue`) must reject all queued promises cleanly, clear auth storage/headers, and invoke the unauthorized logout handler -> pinned by Task 2 `apiSecurity.test.ts`.
3. Passing an Axios-like error object with circular references and `config.headers.Authorization: "Bearer eyJ..."` to `sanitizeForLog` must not throw and must replace all tokens/PII with `'[REDACTED]'` -> pinned by Task 3 `logSanitizer.test.ts`.
4. Route parameters containing path traversal or injected slashes (`"1/../../admin"`, `"../other"`) passed to `validatePositiveIntId` / `encodePathSegment` must be rejected or safely encoded -> pinned by Task 4 `urlSecurity.test.ts`.
5. Image deletion URLs pointing to an untrusted host or attempting `../` traversal into another user's folder (`public/u1/../u2/a.jpg`) must throw before any Supabase `.remove()` call -> pinned by Task 5 `supabase.test.ts`.

---

### Task 1: Blindagem Síncrona de Rotas Protegidas (`AuthProtection` + Layouts)

**Files:**
- Modify: `src/utils/authProtection.tsx:1-87`
- Modify: `app/(panel)/_layout.tsx:1-84`
- Modify: `app/(republic)/_layout.tsx:1-47`
- Test: `src/utils/__tests__/authProtection.test.ts`

**Interfaces:**
- Consumes: `useAuth()` from `src/context/AuthContext.tsx`
- Produces:
  - `src/utils/authProtection.tsx`:
    ```ts
    export interface AuthRouteState {
      isAuthenticated: boolean;
      loading: boolean;
      segments: readonly string[];
      currentRepublicId?: string | null;
    }
    export function resolveAuthRedirect(state: AuthRouteState): string | null;
    export function useProtectedRoute(): { redirectTo: string | null; loading: boolean };
    export function AuthProtection({ children }: { children: React.ReactNode }): React.ReactElement;
    ```

- [x] **Step 1: Write the failing test in `src/utils/__tests__/authProtection.test.ts`**

```ts
import { resolveAuthRedirect } from '../authProtection';

describe('resolveAuthRedirect', () => {
  it('returns null while auth state is loading', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: true,
        segments: ['(panel)', 'home'],
        currentRepublicId: null,
      })
    ).toBeNull();
  });

  it('redirects unauthenticated users accessing (panel) or (republic) to sign-in', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['(panel)', 'home'],
        currentRepublicId: null,
      })
    ).toBe('/(auth)/sign-in');

    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['(republic)', 'choice'],
        currentRepublicId: null,
      })
    ).toBe('/(auth)/sign-in');
  });

  it('allows unauthenticated users inside (auth) routes', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['(auth)', 'sign-in'],
        currentRepublicId: null,
      })
    ).toBeNull();
  });

  it('redirects authenticated users without republic away from (panel) to (republic)/choice', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(panel)', 'tasks'],
        currentRepublicId: null,
      })
    ).toBe('/(republic)/choice');
  });

  it('redirects authenticated users with republic away from (auth) and (republic)/choice to (panel)/home, but allows (republic)/new', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(auth)', 'sign-in'],
        currentRepublicId: 'rep-1',
      })
    ).toBe('/(panel)/home');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(republic)', 'choice'],
        currentRepublicId: 'rep-1',
      })
    ).toBe('/(panel)/home');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(republic)', 'new'],
        currentRepublicId: 'rep-1',
      })
    ).toBeNull();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/authProtection.test.ts --watchAll=false`
Expected: FAIL (`resolveAuthRedirect is not a function`)

- [x] **Step 3: Implement synchronous `resolveAuthRedirect`, fix tuple typing in `src/utils/authProtection.tsx`, and wrap protected layouts**

1. In `src/utils/authProtection.tsx`, export `resolveAuthRedirect(state: AuthRouteState): string | null` using `const segs = state.segments as readonly string[];` (fixing the TS2493 `segments[1]` tuple error).
2. Compute `redirectTo` synchronously in `useProtectedRoute()` via `useMemo(() => resolveAuthRedirect({ isAuthenticated, loading, segments: segments as readonly string[], currentRepublicId: user?.currentRepublicId }), [isAuthenticated, loading, segments, user?.currentRepublicId])` — remove the `useState`/`useEffect` indirection so protected children never mount for a frame before redirecting.
3. In `AuthProtection`, keep the loading spinner when `loading && !inAuthGroup`, return `<Redirect href={redirectTo as any} />` when `redirectTo` is non-null, and only render `{children}` otherwise.
4. Wrap the `<Tabs>` tree in `app/(panel)/_layout.tsx` and the `<Stack>` tree in `app/(republic)/_layout.tsx` with `<AuthProtection>...</AuthProtection>`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest src/utils/__tests__/authProtection.test.ts --watchAll=false`
Expected: PASS (5 tests passing)

- [x] **Step 5: Commit**

```bash
git add src/utils/authProtection.tsx src/utils/__tests__/authProtection.test.ts "app/(panel)/_layout.tsx" "app/(republic)/_layout.tsx"
git commit -m "fix(security): enforce synchronous AuthProtection across panel and republic layouts"
```

---

### Task 2: Hardening de Sessão, Refresh 401, Logout Resiliente, HTTPS e Storage Seguro

**Files:**
- Create: `src/utils/securityConfig.ts`
- Modify: `src/utils/storage.ts:1-140`
- Modify: `src/services/api.ts:1-134`
- Modify: `src/services/authService.ts:504-522`
- Modify: `src/context/AuthContext.tsx:71-140,327-346`
- Modify: `app/(republic)/choice.tsx:72-80`
- Modify: `app/(republic)/join.tsx:33-44`
- Test: `src/utils/__tests__/securityConfig.test.ts`
- Test: `src/services/__tests__/apiSecurity.test.ts`

**Interfaces:**
- Consumes: `logger` from `src/utils/logger.ts`
- Produces:
  - `src/utils/securityConfig.ts`:
    ```ts
    export function assertSecureApiUrl(url: string | undefined, isDev: boolean): string;
    export function isSameOriginRequest(requestUrl: string | undefined, baseUrl: string | undefined): boolean;
    ```
  - `src/services/api.ts`:
    ```ts
    export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null): void;
    ```

- [x] **Step 1: Write the failing tests in `src/utils/__tests__/securityConfig.test.ts` and `src/services/__tests__/apiSecurity.test.ts`**

`src/utils/__tests__/securityConfig.test.ts`:
```ts
import { assertSecureApiUrl, isSameOriginRequest } from '../securityConfig';

describe('securityConfig', () => {
  it('allows http localhost in dev mode and rejects plain http in production', () => {
    expect(assertSecureApiUrl('http://localhost:8080', true)).toBe('http://localhost:8080');
    expect(assertSecureApiUrl('https://api.rephelper.com', false)).toBe('https://api.rephelper.com');
    expect(() => assertSecureApiUrl('http://api.rephelper.com', false)).toThrow(
      'API_BASE_URL deve usar HTTPS em produção'
    );
  });

  it('allows relative paths and same-origin URLs, but rejects cross-origin absolute URLs', () => {
    expect(isSameOriginRequest('/api/v1/tasks', 'https://api.rephelper.com')).toBe(true);
    expect(isSameOriginRequest('api/v1/notifications', 'https://api.rephelper.com')).toBe(true);
    expect(
      isSameOriginRequest('https://api.rephelper.com/api/v1/tasks', 'https://api.rephelper.com')
    ).toBe(true);
    expect(
      isSameOriginRequest('https://evil.example.com/steal', 'https://api.rephelper.com')
    ).toBe(false);
    expect(
      isSameOriginRequest('//evil.example.com/steal', 'https://api.rephelper.com')
    ).toBe(false);
  });
});
```

`src/services/__tests__/apiSecurity.test.ts`:
```ts
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { apiBaseUrl: 'https://api.rephelper.com' } } },
}));

jest.mock('../../utils/storage', () => ({
  getToken: jest.fn(),
  storeToken: jest.fn(),
  clearAuthData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/errorHandling', () => ({
  ErrorHandler: {
    parseError: jest.fn().mockResolvedValue({ type: 'authentication', message: '401' }),
    logError: jest.fn(),
  },
}));

import axios from 'axios';
import api, { setUnauthorizedHandler } from '../api';
import { getToken, clearAuthData } from '../../utils/storage';

describe('api security interceptors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUnauthorizedHandler(null);
  });

  it('does not attach Authorization header for cross-origin absolute URLs', async () => {
    (getToken as jest.Mock).mockResolvedValue('secret-jwt');
    const reqHandler = (api.interceptors.request as any).handlers.find(
      (h: any) => h && h.fulfilled && h.fulfilled.toString().includes('getToken')
    );

    const externalConfig = await reqHandler.fulfilled({
      url: 'https://evil.example.com/hook',
      headers: {},
    });
    expect(externalConfig.headers.Authorization).toBeUndefined();

    const internalConfig = await reqHandler.fulfilled({
      url: '/api/v1/tasks',
      headers: {},
    });
    expect(internalConfig.headers.Authorization).toBe('Bearer secret-jwt');
  });

  it('clears auth data, rejects queued promises, and invokes unauthorized handler when refresh returns 200 without token', async () => {
    (getToken as jest.Mock).mockResolvedValue('expired-jwt');
    const postSpy = jest.spyOn(axios, 'post').mockResolvedValue({ data: {} } as any);
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);

    const resHandler = (api.interceptors.response as any).handlers[0].rejected;
    const err401 = {
      response: { status: 401 },
      config: { url: '/api/v1/tasks', headers: {} },
    };

    await expect(resHandler(err401)).rejects.toBeDefined();
    expect(clearAuthData).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    postSpy.mockRestore();
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx jest src/utils/__tests__/securityConfig.test.ts src/services/__tests__/apiSecurity.test.ts --watchAll=false`
Expected: FAIL (`Cannot find module '../securityConfig'` and `setUnauthorizedHandler is not a function`)

- [x] **Step 3: Implement `securityConfig.ts`, harden `api.ts`, `storage.ts`, `authService.ts`, `AuthContext.tsx`, and await `login()` in republic screens**

1. Create `src/utils/securityConfig.ts`:
   - `assertSecureApiUrl(url, isDev)`: returns `''` if empty; throws `new Error('API_BASE_URL deve usar HTTPS em produção')` if `!isDev && !url.startsWith('https://')`; returns `url` otherwise.
   - `isSameOriginRequest(requestUrl, baseUrl)`: returns `false` for protocol-relative URLs (`//...`); returns `true` for relative URLs not matching `/^[a-zA-Z][a-zA-Z\d+\-.]*:/`; for absolute URLs compares `new URL(requestUrl).origin === new URL(baseUrl).origin` inside `try/catch` (returning `false` on parse failure).
2. Update `src/services/api.ts`:
   - Validate `API_BASE_URL` with `assertSecureApiUrl(API_BASE_URL, __DEV__)` (catching and logging via `logger.error` only if misconfigured so module import doesn't crash Jest tests where `API_BASE_URL` is undefined, while blocking insecure `http://` URLs in non-dev runtime).
   - Guard token attachment in request interceptor with `isSameOriginRequest(config.url, config.baseURL || API_BASE_URL)`.
   - Export `setUnauthorizedHandler(handler)` and on refresh failure **or** missing `newToken` in 401 handler: throw `new Error('Token de renovação ausente')`, call `processQueue(refreshError, null)`, `delete api.defaults.headers.common['Authorization']`, `await clearAuthData()`, and `await unauthorizedHandler?.()`.
3. Update `src/utils/storage.ts`:
   - Apply default native options `{ keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }` when `options` is omitted on non-web platforms.
   - On Web (`Platform.OS === 'web'`), store/read/remove auth keys via `window.sessionStorage` (instead of `localStorage`) and in `removeData` / `clearAuthData` also remove any legacy keys from `window.localStorage`.
4. Update `src/services/authService.ts` (`logout`) & `src/context/AuthContext.tsx`:
   - In `authService.logout()`, wrap backend notify and `auth.signOut` (guarded by `typeof (auth as any)?.signOut === 'function'`) in separate `try/catch`, and execute `await clearAuthData()` inside `finally` so local credentials are always wiped.
   - In `AuthContext.tsx`, register `setUnauthorizedHandler` in a `useEffect` (clearing `user`, removing `Authorization` header, and redirecting to `/(auth)/sign-in`); in `logout()`, put `setUser(null)`, `delete api.defaults.headers.common['Authorization']`, and `router.replace('/(auth)/sign-in')` inside `finally`; in `loadUser()` non-401 error branch, keep cached session only on transient network errors (do NOT delete token while leaving `user` set!), and on 401/invalid auth call `await clearAuthData(); setUser(null);`.
5. In `app/(republic)/choice.tsx` and `app/(republic)/join.tsx`, add `await` before `login(response.token, response.user)`.

- [x] **Step 4: Run tests to verify they pass**

Run: `npx jest src/utils/__tests__/securityConfig.test.ts src/services/__tests__/apiSecurity.test.ts --watchAll=false`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/utils/securityConfig.ts src/utils/storage.ts src/services/api.ts src/services/authService.ts src/context/AuthContext.tsx "app/(republic)/choice.tsx" "app/(republic)/join.tsx" src/utils/__tests__/securityConfig.test.ts src/services/__tests__/apiSecurity.test.ts
git commit -m "fix(security): harden session lifecycle, 401 refresh queue, HTTPS enforcement, and secure storage"
```

---

### Task 3: Redação de Segredos/PII em Logs e Remoção de Logs Sensíveis em Produção

**Files:**
- Create: `src/utils/logSanitizer.ts`
- Modify: `src/utils/logger.ts:1-35`
- Modify: `src/utils/errorHandling.ts:424-455`
- Modify: `app/_layout.tsx:20-27`
- Modify: `src/services/authService.ts:97-121,197-201,405-427,453-487`
- Modify: `src/services/republicService.ts:33-38,55-72`
- Modify: `app/(panel)/settings/account.tsx:80,124-180,226-260`
- Modify: `app/(panel)/settings/republic.tsx:264-288,329-358`
- Modify: `app/(panel)/settings/members.tsx:83-99`
- Test: `src/utils/__tests__/logSanitizer.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `src/utils/logSanitizer.ts`:
    ```ts
    export function sanitizeForLog(value: unknown): unknown;
    ```

- [x] **Step 1: Write the failing test in `src/utils/__tests__/logSanitizer.test.ts`**

```ts
import { sanitizeForLog } from '../logSanitizer';

describe('sanitizeForLog', () => {
  it('redacts sensitive keys case-insensitively in nested objects', () => {
    const input = {
      name: 'Maria',
      email: 'maria@example.com',
      phoneNumber: '+5511999998888',
      password: 'Secret123!',
      config: {
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig',
          'Content-Type': 'application/json',
        },
      },
      firebaseToken: 'abc123',
    };

    const sanitized = sanitizeForLog(input) as Record<string, any>;
    expect(sanitized.name).toBe('Maria');
    expect(sanitized.email).toBe('[REDACTED]');
    expect(sanitized.phoneNumber).toBe('[REDACTED]');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.firebaseToken).toBe('[REDACTED]');
    expect(sanitized.config.headers.Authorization).toBe('[REDACTED]');
    expect(sanitized.config.headers['Content-Type']).toBe('application/json');
  });

  it('redacts inline Bearer and JWT strings and handles circular references safely', () => {
    const circular: Record<string, any> = {
      msg: 'Failed with Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig',
    };
    circular.self = circular;

    const sanitized = sanitizeForLog(circular) as Record<string, any>;
    expect(sanitized.msg).not.toContain('eyJhbGci');
    expect(sanitized.msg).toContain('[REDACTED]');
    expect(sanitized.self).toBe('[Circular]');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/logSanitizer.test.ts --watchAll=false`
Expected: FAIL (`Cannot find module '../logSanitizer'`)

- [x] **Step 3: Implement `sanitizeForLog` and integrate with `logger.ts`, `errorHandling.ts`, and sensitive callers**

1. Create `src/utils/logSanitizer.ts`:
   - Sensitive key matcher (case-insensitive): `authorization`, `token`, `firebasetoken`, `refreshtoken`, `accesstoken`, `idtoken`, `password`, `senha`, `secret`, `apikey`, `cookie`, `set-cookie`, `email`, `phonenumber`, `phone`, `code`, `invitecode`.
   - String scrubber: replaces `Bearer\s+[A-Za-z0-9\-._~+/]+=*` and JWTs (`eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`) with `[REDACTED]`.
   - Uses a `WeakSet<object>` to break cycles (`'[Circular]'`) and handles `Error` instances by preserving `{ name, message: scrubString(err.message), code: (err as any).code }` without dumping raw Axios `request`/`config.headers`.
2. Update `src/utils/logger.ts` so `debug`, `info`, `warn`, `error` pass all extra arguments through `sanitizeForLog`.
3. Update `ErrorHandler.logError` in `src/utils/errorHandling.ts` to sanitize `error.context` and `error.originalError` via `sanitizeForLog`.
4. Replace unprotected `console.log`/`console.error` calls leaking push tokens, `signupData`, republic invite codes/addresses, member lists, and user profiles with `logger.debug`/`logger.error` in `app/_layout.tsx`, `src/services/authService.ts` (including line 424 `console.log(signupData)`!), `src/services/republicService.ts`, `app/(panel)/settings/account.tsx`, `app/(panel)/settings/republic.tsx`, and `app/(panel)/settings/members.tsx`.

- [x] **Step 4: Run tests to verify they pass**

Run: `npx jest src/utils/__tests__/logSanitizer.test.ts src/utils/__tests__/logger.test.ts --watchAll=false`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/utils/logSanitizer.ts src/utils/logger.ts src/utils/errorHandling.ts app/_layout.tsx src/services/authService.ts src/services/republicService.ts "app/(panel)/settings/account.tsx" "app/(panel)/settings/republic.tsx" "app/(panel)/settings/members.tsx" src/utils/__tests__/logSanitizer.test.ts
git commit -m "fix(security): redact tokens and PII in logs and remove production console leaks"
```

---

### Task 4: Anti-Enumeração de Contas, Política de Senha Forte e Sanitização de Parâmetros de URL

**Files:**
- Create: `src/utils/urlSecurity.ts`
- Modify: `src/validation/authSchemas.ts:1-100`
- Modify: `src/utils/errorHandling.ts:307-335`
- Modify: `app/(auth)/forgot-password.tsx:43-76`
- Modify: `app/(auth)/sign-in.tsx:57-64,223-234`
- Modify: `app/(panel)/settings/change-password.tsx:44-111`
- Modify: `src/services/taskService.ts:8-147`
- Modify: `src/services/financesService.ts:16-149`
- Modify: `src/services/republicService.ts:29-220`
- Modify: `src/services/events/eventsService.ts:69-159`
- Test: `src/validation/__tests__/authSchemas.test.ts`
- Test: `src/utils/__tests__/urlSecurity.test.ts`

**Interfaces:**
- Consumes: `logger` from `src/utils/logger.ts`
- Produces:
  - `src/utils/urlSecurity.ts`:
    ```ts
    export function encodePathSegment(value: string | number): string;
    export function validatePositiveIntId(value: string | number): number;
    ```
  - `src/validation/authSchemas.ts`:
    ```ts
    export const changePasswordSchema: z.ZodTypeAny;
    export type ChangePasswordFormData = {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    };
    ```

- [x] **Step 1: Write the failing tests in `src/validation/__tests__/authSchemas.test.ts` and `src/utils/__tests__/urlSecurity.test.ts`**

`src/validation/__tests__/authSchemas.test.ts`:
```ts
import { loginSchema, signUpSchema, changePasswordSchema } from '../authSchemas';

describe('authSchemas security policy', () => {
  it('keeps legacy 6-char login compatibility while enforcing strong passwords on signup', () => {
    expect(
      loginSchema.safeParse({ email: 'user@example.com', password: '123456' }).success
    ).toBe(true);

    expect(
      signUpSchema.safeParse({
        name: 'Ana Silva',
        email: 'ana@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      }).success
    ).toBe(false);

    expect(
      signUpSchema.safeParse({
        name: 'Ana Silva',
        email: 'ana@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      }).success
    ).toBe(false);

    expect(
      signUpSchema.safeParse({
        name: 'Ana Silva',
        email: 'ana@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      }).success
    ).toBe(true);
  });

  it('validates changePasswordSchema requiring strong new password different from current', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1',
        newPassword: 'OldPassword1',
        confirmPassword: 'OldPassword1',
      }).success
    ).toBe(false);

    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'OldPassword1',
        newPassword: 'NewPassword2',
        confirmPassword: 'NewPassword2',
      }).success
    ).toBe(true);
  });
});
```

`src/utils/__tests__/urlSecurity.test.ts`:
```ts
import { encodePathSegment, validatePositiveIntId } from '../urlSecurity';

describe('urlSecurity', () => {
  it('validates positive integer IDs and rejects traversal or non-numeric strings', () => {
    expect(validatePositiveIntId(42)).toBe(42);
    expect(validatePositiveIntId('42')).toBe(42);
    expect(() => validatePositiveIntId('1/../../admin')).toThrow('Identificador inválido');
    expect(() => validatePositiveIntId('-5')).toThrow('Identificador inválido');
    expect(() => validatePositiveIntId('0')).toThrow('Identificador inválido');
  });

  it('encodes path segments and rejects empty or traversal segments', () => {
    expect(encodePathSegment('rep-123')).toBe('rep-123');
    expect(encodePathSegment('a/b')).toBe('a%2Fb');
    expect(() => encodePathSegment('..')).toThrow('Parâmetro de rota inválido');
    expect(() => encodePathSegment('  ')).toThrow('Parâmetro de rota inválido');
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx jest src/validation/__tests__/authSchemas.test.ts src/utils/__tests__/urlSecurity.test.ts --watchAll=false`
Expected: FAIL (`Cannot find module '../urlSecurity'` and `changePasswordSchema is undefined`)

- [x] **Step 3: Implement `urlSecurity.ts`, update `authSchemas.ts`, anti-enumeration messages, `sign-in.tsx`, `change-password.tsx`, and service path encoding**

1. Create `src/utils/urlSecurity.ts`:
   - `validatePositiveIntId(value)`: verifies string/number matches `/^\d+$/` and `Number(value) > 0`; throws `new Error('Identificador inválido')` otherwise.
   - `encodePathSegment(value)`: trims string, rejects empty string, `.` or `..` (or strings containing `..`), and returns `encodeURIComponent(trimmed)`.
2. Update `src/validation/authSchemas.ts`:
   - Add reusable `strongPasswordSchema` (`min(8)`, `max(64)`, regex requiring at least 1 uppercase, 1 lowercase, and 1 digit with pt-BR messages).
   - Apply `strongPasswordSchema` to `signUpSchema.password` and export `changePasswordSchema` (with refinements ensuring `newPassword === confirmPassword` and `newPassword !== currentPassword`).
   - Keep `loginSchema.password` at `min(6)` for legacy compatibility.
3. Prevent account enumeration:
   - In `app/(auth)/forgot-password.tsx`: treat `auth/user-not-found` identically to success, showing `"Se existir uma conta associada a este email, enviaremos um link de redefinição de senha."`.
   - In `src/utils/errorHandling.ts`: map both `'auth/user-not-found'` and `'auth/wrong-password'` to `'Email ou senha incorretos.'`.
4. Harden `app/(panel)/settings/change-password.tsx` & `app/(auth)/sign-in.tsx`:
   - Validate inputs in `change-password.tsx` with `changePasswordSchema.safeParse(...)`, clear `currentPassword`/`newPassword`/`confirmPassword` on success, replace raw `error.message` concatenation with mapped pt-BR messages, and use `logger.error`.
   - In `sign-in.tsx`, compute `isGoogleAuthConfigured` from the active platform's `EXPO_PUBLIC_*_CLIENT_ID` and disable the `"Continuar com o Google"` button (with clear user feedback if triggered) when unconfigured.
5. Apply `validatePositiveIntId` / `encodePathSegment` to path parameters in `taskService.ts`, `financesService.ts`, `republicService.ts`, and `eventsService.ts`.

- [x] **Step 4: Run tests to verify they pass**

Run: `npx jest src/validation/__tests__/authSchemas.test.ts src/utils/__tests__/urlSecurity.test.ts src/services/__tests__/taskService.test.ts src/services/__tests__/financesService.test.ts --watchAll=false`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/utils/urlSecurity.ts src/validation/authSchemas.ts src/utils/errorHandling.ts "app/(auth)/forgot-password.tsx" "app/(auth)/sign-in.tsx" "app/(panel)/settings/change-password.tsx" src/services/taskService.ts src/services/financesService.ts src/services/republicService.ts src/services/events/eventsService.ts src/validation/__tests__/authSchemas.test.ts src/utils/__tests__/urlSecurity.test.ts
git commit -m "fix(security): prevent account enumeration, enforce password policy, and sanitize URL path params"
```

---

### Task 5: Hardening de Upload e Exclusão de Arquivos (Supabase Storage & Comprovantes)

**Files:**
- Modify: `src/services/supabase.ts:1-104`
- Modify: `app/(panel)/settings/account.tsx:119-265`
- Modify: `app/(panel)/finances/expenses/create.tsx:280-325`
- Test: `src/services/__tests__/supabase.test.ts`

**Interfaces:**
- Consumes: `logger` from `src/utils/logger.ts`
- Produces:
  - `src/services/supabase.ts`:
    ```ts
    export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
    export function sanitizeStorageUserId(userId: string): string;
    export function validateImageUploadUri(uri: string): void;
    export function extractOwnedStoragePath(
      url: string,
      bucket: string,
      ownerUserId: string,
      expectedBaseUrl: string
    ): string;
    export function uploadImageToSupabase(
      uri: string,
      bucket: string,
      userId: string,
      fileSizeBytes?: number
    ): Promise<{ url: string | null; error: Error | null }>;
    export function deleteImageFromSupabase(
      url: string,
      bucket: string,
      ownerUserId: string
    ): Promise<{ success: boolean; error: Error | null }>;
    ```

- [x] **Step 1: Write the failing test in `src/services/__tests__/supabase.test.ts`**

```ts
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://demo.supabase.co',
        supabaseAnonKey: 'anon-key',
      },
    },
  },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

import {
  sanitizeStorageUserId,
  validateImageUploadUri,
  extractOwnedStoragePath,
} from '../supabase';

describe('supabase storage security helpers', () => {
  it('rejects anonymous, empty, or traversal userIds', () => {
    expect(sanitizeStorageUserId('user_123-abc')).toBe('user_123-abc');
    expect(() => sanitizeStorageUserId('anon')).toThrow('Usuário inválido');
    expect(() => sanitizeStorageUserId('../other')).toThrow('Usuário inválido');
    expect(() => sanitizeStorageUserId('u1/u2')).toThrow('Usuário inválido');
  });

  it('allows only safe local/blob/image URIs', () => {
    expect(() => validateImageUploadUri('file:///tmp/photo.jpg')).not.toThrow();
    expect(() => validateImageUploadUri('content://media/1')).not.toThrow();
    expect(() => validateImageUploadUri('https://evil.com/ssrf.jpg')).toThrow('URI de imagem inválida');
    expect(() => validateImageUploadUri('javascript:alert(1)')).toThrow('URI de imagem inválida');
  });

  it('extracts path only when host matches Supabase and object belongs to ownerUserId', () => {
    const valid =
      'https://demo.supabase.co/storage/v1/object/public/avatars/public/user_1/12345.jpg';
    expect(
      extractOwnedStoragePath(valid, 'avatars', 'user_1', 'https://demo.supabase.co')
    ).toBe('public/user_1/12345.jpg');

    const otherUser =
      'https://demo.supabase.co/storage/v1/object/public/avatars/public/user_2/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(otherUser, 'avatars', 'user_1', 'https://demo.supabase.co')
    ).toThrow('Sem permissão para remover este arquivo');

    const traversal =
      'https://demo.supabase.co/storage/v1/object/public/avatars/public/user_1/../user_2/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(traversal, 'avatars', 'user_1', 'https://demo.supabase.co')
    ).toThrow('Caminho de arquivo inválido');

    const evilOrigin =
      'https://evil.example/storage/v1/object/public/avatars/public/user_1/12345.jpg';
    expect(() =>
      extractOwnedStoragePath(evilOrigin, 'avatars', 'user_1', 'https://demo.supabase.co')
    ).toThrow('Origem de armazenamento inválida');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/supabase.test.ts --watchAll=false`
Expected: FAIL (`sanitizeStorageUserId is not a function`)

- [x] **Step 3: Implement storage validation in `src/services/supabase.ts` and update `account.tsx` & `expenses/create.tsx`**

1. In `src/services/supabase.ts`:
   - Export `MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024`, `sanitizeStorageUserId`, `validateImageUploadUri`, and `extractOwnedStoragePath`.
   - Require `userId` (no `'anon'` default!) in `uploadImageToSupabase(uri, bucket = 'avatars', userId, fileSizeBytes?)`, enforce `fileSizeBytes <= MAX_IMAGE_UPLOAD_BYTES` when provided, and replace all `console.log`/`console.error` with `logger`.
   - Require `ownerUserId` in `deleteImageFromSupabase(url, bucket = 'avatars', ownerUserId)` and validate with `extractOwnedStoragePath` before calling `supabase.storage.from(bucket).remove([urlPath])`.
2. In `app/(panel)/settings/account.tsx`:
   - Guard `!user?.uid` before uploading or deleting profile picture.
   - Pass `user.uid` and `asset.fileSize` to `uploadImageToSupabase(imageUri, 'avatars', user.uid, asset.fileSize)`.
   - Pass `user.uid` to `deleteImageFromSupabase(profileImage, 'avatars', user.uid)`.
3. In `app/(panel)/finances/expenses/create.tsx`:
   - Replace the simulated `uploadImage` (which sent local `file://` device URIs to the backend!) with `uploadImageToSupabase(uri, 'receipts', user.uid, fileSize)` and show an error alert if upload fails or `!user?.uid`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest src/services/__tests__/supabase.test.ts --watchAll=false`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/services/supabase.ts "app/(panel)/settings/account.tsx" "app/(panel)/finances/expenses/create.tsx" src/services/__tests__/supabase.test.ts
git commit -m "fix(security): enforce ownership, URI, size, and path validation on Supabase uploads and deletes"
```

---

### Task 6: Hardening Nativo Android, Filtro de Variáveis de Build (`env.js`) e Atualização de Dependências Vulneráveis

**Files:**
- Modify: `env.js:31-75`
- Modify: `app.config.js:12-35`
- Modify: `app.json:28-35`
- Modify: `android/app/build.gradle:68-118`
- Modify: `android/app/src/main/AndroidManifest.xml:1-35`
- Modify: `android/gradle.properties:50-56`
- Modify: `package.json` & `package-lock.json`
- Test: `src/utils/__tests__/envSecurity.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `env.js`: exports loaded env object while logging ONLY `EXPO_PUBLIC_*` variable names (zero host OS/CI env leaks).

- [x] **Step 1: Write the failing test in `src/utils/__tests__/envSecurity.test.ts`**

```ts
import fs from 'fs';
import path from 'path';

describe('native and build security configuration', () => {
  const root = path.resolve(__dirname, '../../..');

  it('AndroidManifest disables allowBackup and removes unused privileged permissions', () => {
    const manifest = fs.readFileSync(
      path.join(root, 'android/app/src/main/AndroidManifest.xml'),
      'utf8'
    );
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).not.toContain('android.permission.RECORD_AUDIO');
    expect(manifest).not.toContain('android.permission.SYSTEM_ALERT_WINDOW');
    expect(manifest).not.toContain('android:scheme="myapp"');
  });

  it('Android release build does not sign with debug.keystore and enables ProGuard by default', () => {
    const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
    const releaseSection = gradle.split('release {')[1]?.split('packagingOptions {')[0] || '';
    expect(releaseSection).not.toContain('signingConfig signingConfigs.debug');
    expect(gradle).toContain('enableProguardInReleaseBuilds = (findProperty(\'android.enableProguardInReleaseBuilds\') ?: true).toBoolean()');
  });

  it('env.js filters logged keys strictly to EXPO_PUBLIC_ prefix', () => {
    const envScript = fs.readFileSync(path.join(root, 'env.js'), 'utf8');
    expect(envScript).toContain("startsWith('EXPO_PUBLIC_')");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/envSecurity.test.ts --watchAll=false`
Expected: FAIL (all 3 assertions fail on current files)

- [x] **Step 3: Apply native hardening, `env.js` filtering, and safe dependency CVE upgrades**

1. `android/app/src/main/AndroidManifest.xml`:
   - Change `android:allowBackup="true"` to `android:allowBackup="false"`.
   - Remove unused permissions `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`.
   - Replace generic `android:scheme="myapp"` with `android:scheme="rephelper"` and align `scheme: "rephelper"` in both `app.config.js` and `app.json`.
2. `android/app/build.gradle` & `android/gradle.properties`:
   - Set default `enableProguardInReleaseBuilds` to `true` and `shrinkResources` default to `true`.
   - Add an optional `signingConfigs.release` reading from `REPHELPER_UPLOAD_STORE_FILE` / `REPHELPER_UPLOAD_STORE_PASSWORD` / `REPHELPER_UPLOAD_KEY_ALIAS` / `REPHELPER_UPLOAD_KEY_PASSWORD` properties (only binding `signingConfig signingConfigs.release` when configured, never falling back to `signingConfigs.debug` in `release`).
   - Change `EX_DEV_CLIENT_NETWORK_INSPECTOR=false` in `android/gradle.properties`.
3. `env.js`:
   - Filter keys in `logEnvStatus` to `keys.filter((k) => k.startsWith('EXPO_PUBLIC_'))` so OS/CI environment variable names are never printed during builds.
4. Upgrade vulnerable direct & transitive runtime packages compatible with Expo SDK 52:
   - Run `npm install axios@latest @supabase/supabase-js@latest --legacy-peer-deps` and `npm audit fix --legacy-peer-deps` (without `--force`, preserving Expo SDK 52 and `jest-expo@~52.0.6`).
   - Run `npm run test:ci` and `npm audit --omit=dev` to record exact before/after vulnerability counts.

- [x] **Step 4: Run full test suite to verify everything passes**

Run: `npm run test:ci`
Expected: PASS (all test suites passing, exit code 0)

- [x] **Step 5: Commit**

```bash
git add env.js app.config.js app.json android/app/build.gradle android/app/src/main/AndroidManifest.xml android/gradle.properties package.json package-lock.json src/utils/__tests__/envSecurity.test.ts
git commit -m "fix(security): harden Android release config, filter env logs, and patch vulnerable dependencies"
```
