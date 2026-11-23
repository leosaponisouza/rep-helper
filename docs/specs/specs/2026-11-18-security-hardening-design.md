# Especificação de Segurança e Hardening — `rep-helper-frontend`

**Data:** 2026-11-18
**Branch Alvo:** `refactor/code-quality` (ou nova branch `security/hardening`)
**Objetivo:** Corrigir as vulnerabilidades de controle de acesso, gerenciamento de sessão, vazamento de dados sensíveis, manipulação de arquivos, validação de entradas, configuração nativa Android e dependências identificadas na auditoria de segurança do aplicativo React Native / Expo Router (`rep-helper-frontend`).

---

## 1. Sumário Executivo da Auditoria

A revisão completa de `app/`, `src/`, `components/`, `android/` e `package.json` identificou **11 achados de segurança** distribuídos em 4 níveis de severidade:

| # | Severidade | Categoria | Resumo do Achado | Arquivos Principais |
|---|---|---|---|---|
| 1 | **CRÍTICO** | Controle de Acesso (OWASP M3 / A01) | `AuthProtection` só envolve `(auth)/_layout.tsx`; `(panel)` e `(republic)` são acessíveis sem login; redirecionamento em `useEffect` causa render-flash | `src/utils/authProtection.tsx`, `app/(panel)/_layout.tsx`, `app/(republic)/_layout.tsx` |
| 2 | **CRÍTICO** | Gestão de Sessão (OWASP M3 / A07) | Falha de refresh 401 não limpa tokens nem encerra sessão; `logout()` falha silenciosamente se `auth.signOut` falhar; erro de rede em `/users/me` apaga token mantendo `user` autenticado; `login()` sem `await` em `choice.tsx`/`join.tsx` | `src/services/api.ts`, `src/services/authService.ts`, `src/context/AuthContext.tsx`, `app/(republic)/choice.tsx`, `app/(republic)/join.tsx` |
| 3 | **CRÍTICO** | Hardening Nativo Android (OWASP M8 / M7) | `buildTypes.release` assinado com `debug.keystore` (`androiddebugkey`), ProGuard desabilitado, `allowBackup="true"`, permissões excessivas (`RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`), scheme genérico `myapp` | `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`, `android/gradle.properties`, `app.config.js` |
| 4 | **CRÍTICO** | Cadeia de Suprimentos (OWASP M2 / A06) | `npm audit --omit=dev` aponta 60 vulnerabilidades (5 críticas, 29 altas), incluindo `axios`, `@supabase/auth-js`, `form-data`, `protobufjs`, `websocket-driver` | `package.json`, `package-lock.json` |
| 5 | **ALTO** | Storage / IDOR / Path Traversal (OWASP M4 / M9) | Upload anônimo (`public/anon/`), ausência de validação de URI/tamanho/ownership; `deleteImageFromSupabase` remove qualquer caminho sem validar domínio/dono; `expenses/create.tsx` envia `file://` local como `receiptUrl` | `src/services/supabase.ts`, `app/(panel)/settings/account.tsx`, `app/(panel)/finances/expenses/create.tsx` |
| 6 | **ALTO** | Transporte e Injeção de Path (OWASP M5 / M4) | `API_BASE_URL` não exige HTTPS em produção; `Authorization` é anexado mesmo em URLs absolutas cross-origin; IDs de rota interpolados em URLs sem `encodeURIComponent` | `src/services/api.ts`, `src/services/taskService.ts`, `src/services/financesService.ts`, `src/services/republicService.ts`, `src/services/events/eventsService.ts` |
| 7 | **ALTO** | Armazenamento Seguro (OWASP M9) | Web armazena JWT/PII em `localStorage` persistente; iOS `SecureStore` sem `WHEN_UNLOCKED_THIS_DEVICE_ONLY` | `src/utils/storage.ts` |
| 8 | **MÉDIO** | Vazamento de PII/Tokens em Logs (OWASP M9) | 103 chamadas `console.*`, incluindo `console.log(signupData)` em produção, push token em `app/_layout.tsx`, dados de república/membros e `originalError` (headers Axios) sem redação | `src/utils/logger.ts`, `src/utils/errorHandling.ts`, `app/_layout.tsx`, `src/services/authService.ts`, `app/(panel)/settings/*.tsx` |
| 9 | **MÉDIO** | Enumeração de Contas e Senha Fraca (OWASP M3) | `forgot-password.tsx` e `ErrorHandler` distinguem `user-not-found` de `wrong-password`; política de senha fraca (mín. 6 chars sem complexidade) em cadastro e troca de senha | `app/(auth)/forgot-password.tsx`, `src/utils/errorHandling.ts`, `src/validation/authSchemas.ts`, `app/(panel)/settings/change-password.tsx` |
| 10 | **MÉDIO** | Validação de OAuth Placeholder & Limpeza de Memória | Botão Google permanece clicável quando `EXPO_PUBLIC_*_CLIENT_ID` está ausente; `change-password.tsx` não limpa estado de senhas após sucesso e expõe `error.message` cru | `app/(auth)/sign-in.tsx`, `app/(panel)/settings/change-password.tsx` |
| 11 | **BAIXO** | Exposição de Ambiente no Build | `env.js` lista todas as chaves de `process.env` do host no console durante o build; divergência de `scheme`/`package` entre `app.json` e `app.config.js` | `env.js`, `app.config.js`, `app.json` |

---

## 2. Restrições Globais (Global Constraints)

1. **Compatibilidade de Plataforma:** Todas as alterações devem funcionar sem regressões em **Android, iOS e Expo Web** (`react-native-web`).
2. **Retrocompatibilidade de Login Existente:** `loginSchema` deve manter `min(6)` para não bloquear usuários legados que ainda possuem senhas de 6 caracteres; a política forte (`min(8)`, 1 maiúscula, 1 minúscula, 1 número) aplica-se a novos cadastros (`signUpSchema`) e alterações de senha (`changePasswordSchema`).
3. **Preservação Visual e Idioma:** Manter toda a UI, esquema de cores (`#222`, `#333`, `#7B68EE`, `#FF6347`) e mensagens ao usuário em **Português (`pt-BR`)**.
4. **Compatibilidade Expo SDK 52:** Atualizações de dependências em `package.json` não devem quebrar o preset `jest-expo@~52.0.6`, `expo@~52.0.42` ou o bundler Metro. Upgrades major incompatíveis com SDK 52 (como `expo@58` ou `zod@4`) ficam documentados como backlog explícito de migração de SDK.
5. **Verificação Obrigatória:** Todos os novos módulos de segurança devem possuir testes unitários em Jest (`npm run test:ci` com exit code 0) e zero novos erros de TypeScript (`npx tsc --noEmit`).

---

## 3. Arquitetura de Defesa em Profundidade (Target Design)

1. **Camada de Roteamento (`src/utils/authProtection.tsx`):**
   - Função pura síncrona `resolveAuthRedirect(state)` avaliada durante o render em `AuthProtection`.
   - `<AuthProtection>` aplicado em `app/(auth)/_layout.tsx`, `app/(republic)/_layout.tsx` e `app/(panel)/_layout.tsx`.
   - Enquanto `loading === true` em rotas protegidas, nunca renderiza `{children}` (evita chamadas autenticadas prematuras e flash de conteúdo).
2. **Camada de Transporte e Sessão (`src/utils/securityConfig.ts`, `src/services/api.ts`, `src/context/AuthContext.tsx`, `src/utils/storage.ts`):**
   - Validação estrita de HTTPS para `API_BASE_URL` fora de `__DEV__` (`assertSecureApiUrl`).
   - Proteção contra vazamento de `Authorization` em URLs absolutas cross-origin (`isSameOriginRequest`).
   - Registro de handler global de sessão expirada (`setUnauthorizedHandler`) conectado ao `AuthContext`, garantindo encerramento completo da fila `failedQueue`, limpeza do storage e redirecionamento seguro em falhas de refresh 401.
   - `logout()` resiliente via `try/finally` (garante limpeza local mesmo offline ou sem Firebase).
   - Storage seguro: `SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY` em nativo; `sessionStorage` para tokens na Web com limpeza também de chaves legadas em `localStorage`.
3. **Camada de Sanitização de Logs (`src/utils/logSanitizer.ts`, `src/utils/logger.ts`, `src/utils/errorHandling.ts`):**
   - `sanitizeForLog` mascara recursivamente chaves sensíveis (`authorization`, `token`, `password`, `email`, `phoneNumber`, etc.) e padrões JWT/Bearer, protegido contra referências circulares.
   - Substituição de `console.*` desprotegidos em pontos críticos de autenticação, notificações e configurações.
4. **Camada de Validação e Anti-Enumeração (`src/validation/authSchemas.ts`, `src/utils/urlSecurity.ts`):**
   - Mensagens genéricas para `forgot-password.tsx` e erros de credenciais no `ErrorHandler`.
   - `encodePathSegment` e `validatePositiveIntId` aplicados nos serviços HTTP para impedir path injection via parâmetros de rota.
5. **Camada de Storage de Arquivos (`src/services/supabase.ts`):**
   - Validação de `userId` (`^[a-zA-Z0-9_-]{1,128}$`, proibindo `'anon'`), validação de esquema de URI, limite de 5 MB e validação estrita de origem + propriedade (`public/${ownerUserId}/`) antes de excluir objetos.
   - Upload real de comprovantes de despesa via Supabase no bucket `receipts` (ou bloqueio de envio de URI local `file://` ao backend).
6. **Camada Nativa e Dependências (`android/`, `env.js`, `package.json`):**
   - Remoção de assinatura debug do build `release`, ativação de ProGuard/R8 e shrinkResources, `allowBackup="false"`, princípio do menor privilégio no `AndroidManifest.xml`, filtro `EXPO_PUBLIC_` em `env.js` e remediação das CVEs compatíveis via `npm audit`.
