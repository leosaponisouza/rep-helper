# Design System "Editorial de Convivência" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir e migrar todo o `rep-helper-frontend` para o Design System **Editorial de Convivência** com suporte nativo a Tema Claro, Escuro e Sistema, acessibilidade WCAG 2.1 AA, movimento com `Reduce Motion`, feedback global sem `Alert.alert`, assets de marca atualizados e guardrails automatizados em Jest.

**Architecture:** Camada centralizada `src/design-system/` composta por tokens puros, `ThemeProvider` persistido em `AsyncStorage` (sincronizando `StatusBar` e `expo-system-ui`), `FeedbackProvider` (`Toast` + `ConfirmDialog` integrados ao `ErrorHandler`), hook `useMotion` e 20 primitivos acessíveis sobre `StyleSheet` + `lucide-react-native` + `@expo-google-fonts/*`. A migração acontece em 5 ondas incrementais deixando `typecheck` e `test:ci` verdes ao fim de cada tarefa.

**Tech Stack:** React Native 0.76.8, Expo SDK 52 (`~52.0.42`), Expo Router `~4.0.19`, TypeScript `~5.3.3` (`strict: true`), `@expo-google-fonts/source-serif-4`, `@expo-google-fonts/ibm-plex-sans`, `@expo-google-fonts/ibm-plex-mono`, `lucide-react-native`, `react-native-svg`, `react-native-safe-area-context`, `expo-system-ui`, `expo-haptics`, Jest (`jest-expo@~52.0.6`).

**Spec:** `docs/superpowers/specs/2026-11-19-design-system-refactoring-design.md`

## Global Constraints

- Compatibilidade obrigatória sem regressões em **Android, iOS e Expo Web (`react-native-web`)**, preservando Expo SDK 52 (`expo@~52.0.42`, `jest-expo@~52.0.6`), `babel.config.js` e `metro.config.js` otimizado para Windows.
- Novas dependências de produção estritamente limitadas a `@expo-google-fonts/source-serif-4`, `@expo-google-fonts/ibm-plex-sans`, `@expo-google-fonts/ibm-plex-mono` e `lucide-react-native`; remover `@expo/vector-icons` e `expo-linear-gradient` na Onda 5.
- Todos os textos visíveis, labels de acessibilidade e opções de tema em **Português (`pt-BR`)**; nunca alterar contratos de API, schemas Zod, modelos ou rotas do Expo Router.
- Nunca executar `expo prebuild --clean` — edições em `android/app/src/main/res/` devem ser cirúrgicas para preservar integralmente o hardening validado por `src/utils/__tests__/envSecurity.test.ts`.
- `npm run typecheck` e `npm run test:ci` com exit code `0` ao final de cada tarefa.

## Review Focus

1. Valor corrompido, desconhecido ou rejeição de leitura em `AsyncStorage` sob `'@rephelper:theme_preference'` deve degradar com segurança para `'system'` sem lançar exceção em `ThemeProvider` -> fixado na Task 2 (`ThemeContext.test.tsx`).
2. Chamadas concorrentes a `confirm(...)` ou fechamento por backdrop/botão Voltar do Android devem resolver toda `Promise<boolean>` pendente (`false` ao descartar) sem deixar promises travadas nem modais sobrepostos -> fixado na Task 5 (`FeedbackContext.test.tsx`).
3. Acionar `ErrorHandler.handleError(..., { showAlert: true })` antes da montagem ou após desmontagem de `FeedbackProvider` não deve lançar erro nem chamar `Alert.alert` -> fixado na Task 5 (`FeedbackContext.test.tsx`).
4. `AppText` nunca pode desabilitar `allowFontScaling`, `IconButton` deve garantir alvo mínimo `44×44`, e `Screen` em viewport Web largo (`1280px`) deve aplicar `maxWidth: 720` (`960` para `width="wide"`) -> fixado na Task 4 (`primitives.test.tsx`).
5. `useMotion()` na Web ou quando `AccessibilityInfo.isReduceMotionEnabled()` rejeita deve degradar com segurança (`reduceMotion: false`, `useNativeDriver: Platform.OS !== 'web'`) e remover o listener no unmount -> fixado na Task 2 (`useMotion.test.ts`).

---

## File Structure Map

- **Criar (`src/design-system/`):**
  - `tokens/{palette,typography,spacing,radius,elevation,motion}.ts`
  - `theme/{types,lightTheme,darkTheme,ThemeContext,useTheme,createThemedStyles}.ts` + `theme/adapters/{calendarTheme,chartTheme}.ts`
  - `motion/useMotion.ts`
  - `feedback/{FeedbackContext,useFeedback}.ts`
  - `primitives/{Screen,ScreenHeader,AppText,Button,IconButton,BrandIcons,TextField,Surface,Divider,ListRow,StatusText,Chip,SegmentedTabs,Avatar,StateView,Skeleton,BottomSheetModal,ConfirmDialog,ConfirmSection,Toast}.tsx`
  - `index.ts`
  - `__tests__/{contrast.test.ts,ThemeContext.test.tsx,useMotion.test.ts,brandConfig.test.ts,primitives.test.tsx,FeedbackContext.test.tsx,appearanceScreen.test.tsx,designSystemGuardrails.test.ts}`
- **Criar (Telas):** `app/(panel)/settings/appearance.tsx`
- **Modificar (Infra/Assets/Nativo):** `package.json`, `app.json`, `app.config.js`, `app/_layout.tsx`, `app/index.tsx`, `src/utils/authProtection.tsx`, `src/utils/errorHandling.ts`, `src/services/notifications.ts`, `src/context/NotificationContext.tsx`, `src/services/calendar/calendarService.ts`, `src/hooks/useCalendarSync.ts`, `android/app/src/main/res/values/{styles,colors}.xml`, `android/app/src/main/res/values-night/colors.xml`, `assets/images/{icon,adaptive-icon,splash-icon,favicon}.png`, `android/app/src/main/res/drawable-{mdpi,hdpi,xhdpi,xxhdpi}/splashscreen_logo.png`.
- **Modificar (Layouts, Telas e Domínio):** todos os `_layout.tsx` e telas em `app/(auth)/*`, `app/(republic)/*`, `app/(panel)/*`, além dos componentes de domínio em `components/`.
- **Reorganizar na Onda 5:** `components/{tasks,events,finances,notifications}/` (absorvendo os arquivos soltos da raiz de `components/`).
- **Remover na Onda 5:** `src/styles/sharedStyles.tsx`, `src/styles/eventStyles.tsx`, `src/utils/animationCompat.tsx`, `components/BackButton.tsx`, `components/Task/TaskEdit/HeaderBar.tsx`, `components/common/ConfirmDeleteModal.tsx`.

---

## Onda 1 — Fundação, Tokens, Tema, Movimento e Assets de Marca

### Task 1: Dependências, Tokens de Design e Validação Matemática WCAG 2.1 AA

**Files:**
- Modify: `package.json`
- Create: `src/design-system/tokens/palette.ts`
- Create: `src/design-system/tokens/typography.ts`
- Create: `src/design-system/tokens/spacing.ts`
- Create: `src/design-system/tokens/radius.ts`
- Create: `src/design-system/tokens/elevation.ts`
- Create: `src/design-system/tokens/motion.ts`
- Create: `src/design-system/theme/types.ts`
- Create: `src/design-system/theme/lightTheme.ts`
- Create: `src/design-system/theme/darkTheme.ts`
- Test: `src/design-system/__tests__/contrast.test.ts`

**Interfaces:**
- Consumes: nenhum módulo anterior.
- Produces:
  - `src/design-system/tokens/palette.ts`: `export const palette` (único arquivo com hex da paleta base e séries editoriais de gráfico).
  - `src/design-system/tokens/typography.ts`:
    ```ts
    export const fontFamilies: {
      serifSemiBold: 'SourceSerif4_600SemiBold';
      sansRegular: 'IBMPlexSans_400Regular';
      sansMedium: 'IBMPlexSans_500Medium';
      sansSemiBold: 'IBMPlexSans_600SemiBold';
      sansBold: 'IBMPlexSans_700Bold';
      monoRegular: 'IBMPlexMono_400Regular';
      monoMedium: 'IBMPlexMono_500Medium';
      monoSemiBold: 'IBMPlexMono_600SemiBold';
    };
    export type TypographyVariant =
      | 'display' | 'title' | 'heading' | 'body' | 'bodyStrong'
      | 'caption' | 'monoLabel' | 'monoValue' | 'monoHero';
    export const typography: Record<TypographyVariant, TextStyle>;
    ```
  - `src/design-system/tokens/spacing.ts`: `export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 } as const; export type SpacingKey = keyof typeof spacing;`
  - `src/design-system/tokens/radius.ts`: `export const radius = { none: 0, sm: 6, md: 10, lg: 16, full: 9999 } as const; export type RadiusKey = keyof typeof radius;`
  - `src/design-system/tokens/elevation.ts`: `export type ElevationKey = 'none' | 'floating'; export const elevation: Record<ElevationKey, ViewStyle>;`
  - `src/design-system/tokens/motion.ts`: `export const motion = { duration: { fast: 140, normal: 180, slow: 240, reducedFade: 80 }, easing: { standard, exit }, pressOpacity: 0.78, pressScale: 0.985 } as const;`
  - `src/design-system/theme/types.ts`: `export type ThemeMode = 'light' | 'dark' | 'system'; export type ResolvedTheme = 'light' | 'dark'; export interface ThemeColors { bg: string; surface: string; subtle: string; ink: string; inkSecondary: string; inkMuted: string; line: string; borderStrong: string; accent: string; onAccent: string; accentSoft: string; success: string; successSoft: string; warning: string; warningSoft: string; danger: string; onDanger: string; dangerSoft: string; overlay: string; chartSeries: readonly [string, string, string, string, string, string]; } export interface Theme { mode: ResolvedTheme; isDark: boolean; colors: ThemeColors; typography: typeof typography; spacing: typeof spacing; radius: typeof radius; elevation: typeof elevation; motion: typeof motion; }`
  - `src/design-system/theme/lightTheme.ts` & `darkTheme.ts`: `export const lightTheme: Theme`, `export const darkTheme: Theme`.

- [ ] **Step 1: Instalar fontes Expo e `lucide-react-native` compatíveis com SDK 52**

Run: `npx expo install @expo-google-fonts/source-serif-4 @expo-google-fonts/ibm-plex-sans @expo-google-fonts/ibm-plex-mono lucide-react-native`  
Expected: `package.json` inclui apenas essas 4 novas dependências sem alterar `babel.config.js` nem `metro.config.js`.

- [ ] **Step 2: Escrever o teste que falha em `src/design-system/__tests__/contrast.test.ts`**

```ts
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';
import { typography } from '../tokens/typography';
import { radius } from '../tokens/radius';
import { spacing } from '../tokens/spacing';

function relativeLuminance(hex: string): number {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('Editorial de Convivência WCAG 2.1 AA contrast and closed token scales', () => {
  const themes = [
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const;

  const textTokens = ['ink', 'inkSecondary', 'inkMuted', 'accent', 'success', 'warning', 'danger'] as const;
  const surfaceTokens = ['bg', 'surface', 'subtle'] as const;

  it.each(themes)('%s theme passes >= 4.5:1 for all text tokens on bg, surface, and subtle', (_name, theme) => {
    for (const bgKey of surfaceTokens) {
      for (const fgKey of textTokens) {
        expect(contrastRatio(theme.colors[fgKey], theme.colors[bgKey])).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrastRatio(theme.colors.onAccent, theme.colors.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.colors.onDanger, theme.colors.danger)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(themes)('%s theme passes >= 3.0:1 for borderStrong on bg, surface, and subtle', (_name, theme) => {
    for (const bgKey of surfaceTokens) {
      expect(contrastRatio(theme.colors.borderStrong, theme.colors[bgKey])).toBeGreaterThanOrEqual(3.0);
    }
  });

  it('exposes closed scales matching spec Section 5', () => {
    expect(Object.keys(typography)).toHaveLength(9);
    expect(Object.values(radius)).toEqual([0, 6, 10, 16, 9999]);
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 20, 24, 32, 40]);
    expect(lightTheme.colors.chartSeries).toHaveLength(6);
    expect(darkTheme.colors.chartSeries).toHaveLength(6);
  });
});
```

- [ ] **Step 3: Executar o teste para confirmar falha inicial**

Run: `npx jest src/design-system/__tests__/contrast.test.ts --watchAll=false`  
Expected: FAIL ("Cannot find module '../theme/lightTheme'").

- [ ] **Step 4: Implementar `src/design-system/tokens/*` e `src/design-system/theme/{types,lightTheme,darkTheme}.ts`**

Criar os 9 arquivos com os valores exatos da Spec Seções 5.1–5.4:
- `palette.ts`: todas as cores brutas Claro (`#F5F2EB`, `#FDFCF9`, `#EBE6DC`, `#1C1B18`, `#524E45`, `#635E54`, `#DCD6C8`, `#837C6E`, `#1F4AA8`, `#FFFFFF`, `#E7EEFA`, `#24633A`, `#E4F2E9`, `#8F5400`, `#F8EED8`, `#B3261E`, `#F9E4E2`, `rgba(28, 27, 24, 0.45)`, séries `['#1F4AA8', '#B35C1E', '#24633A', '#7A3E8F', '#8F5400', '#3F6C7A']`) e Escuro (`#151412`, `#1E1D1A`, `#282622`, `#EDEAE2`, `#B2ACA0`, `#948E82`, `#302D27`, `#787268`, `#7EA4FF`, `#0F1524`, `rgba(126, 164, 255, 0.16)`, `#6ED090`, `rgba(110, 208, 144, 0.15)`, `#F2B84B`, `rgba(242, 184, 75, 0.15)`, `#F27B72`, `rgba(242, 123, 114, 0.15)`, `rgba(0, 0, 0, 0.65)`, séries `['#7EA4FF', '#F09B64', '#6ED090', '#C695E0', '#F2B84B', '#7BC0D4']`).
- `typography.ts`: 9 variantes (`display` 28/34 `-0.3`, `title` 22/28 `-0.2`, `heading` 18/24 `-0.1`, `body` 15/22, `bodyStrong` 15/22, `caption` 13/18, `monoLabel` 12/16 `+0.6` uppercase + `tabular-nums`, `monoValue` 16/22 `-0.2` + `tabular-nums`, `monoHero` 26/32 `-0.4` + `tabular-nums`).
- `elevation.ts`: `none` sem sombra e `floating` usando `Platform.select` para iOS (`shadowColor/shadowOffset/shadowOpacity/shadowRadius`), Android (`elevation: 4`) e Web (`boxShadow` ou fallback compatível com `ViewStyle`).
- `motion.ts`: `duration` (`fast: 140`, `normal: 180`, `slow: 240`, `reducedFade: 80`), `easing` (`standard: Easing.out(Easing.cubic)`, `exit: Easing.in(Easing.cubic)`), `pressOpacity: 0.78`, `pressScale: 0.985`.

- [ ] **Step 5: Verificar testes e tipagem**

Run: `npx jest src/design-system/__tests__/contrast.test.ts --watchAll=false && npm run typecheck`  
Expected: PASS (all contrast assertions green, 0 TypeScript errors).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/design-system/tokens src/design-system/theme/types.ts src/design-system/theme/lightTheme.ts src/design-system/theme/darkTheme.ts src/design-system/__tests__/contrast.test.ts
git commit -m "feat(design-system): add typography/icon deps, Editorial tokens, and WCAG AA contrast tests"
```

---

### Task 2: `ThemeProvider`, `createThemedStyles`, Adaptadores de Terceiros e `useMotion`

**Files:**
- Create: `src/design-system/theme/ThemeContext.tsx`
- Create: `src/design-system/theme/useTheme.ts`
- Create: `src/design-system/theme/createThemedStyles.ts`
- Create: `src/design-system/theme/adapters/calendarTheme.ts`
- Create: `src/design-system/theme/adapters/chartTheme.ts`
- Create: `src/design-system/motion/useMotion.ts`
- Test: `src/design-system/__tests__/ThemeContext.test.tsx`
- Test: `src/design-system/__tests__/useMotion.test.ts`

**Interfaces:**
- Consumes: `lightTheme`, `darkTheme`, `Theme`, `ThemeMode`, `ResolvedTheme` (Task 1); `AsyncStorage`; `expo-system-ui`; `react-native` (`useColorScheme`, `StatusBar`, `AccessibilityInfo`, `Platform`, `StyleSheet`).
- Produces:
  - `src/design-system/theme/ThemeContext.tsx`:
    ```ts
    export const THEME_STORAGE_KEY = '@rephelper:theme_preference';
    export interface ThemeContextValue {
      theme: Theme;
      preference: ThemeMode;
      resolvedMode: ResolvedTheme;
      ready: boolean;
      setPreference: (mode: ThemeMode) => Promise<void>;
    }
    export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement;
    ```
  - `src/design-system/theme/useTheme.ts`: `export function useTheme(): ThemeContextValue;`
  - `src/design-system/theme/createThemedStyles.ts`:
    ```ts
    export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
      factory: (theme: Theme) => T
    ): () => T;
    export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
      factory: (theme: Theme) => T
    ): T;
    ```
  - `src/design-system/theme/adapters/calendarTheme.ts`: `export function createCalendarTheme(theme: Theme): Record<string, string | number>;`
  - `src/design-system/theme/adapters/chartTheme.ts`:
    ```ts
    export function hexToRgba(hex: string, opacity: number): string;
    export function createChartConfig(theme: Theme): {
      backgroundColor: string;
      backgroundGradientFrom: string;
      backgroundGradientTo: string;
      decimalPlaces: number;
      color: (opacity?: number) => string;
      labelColor: (opacity?: number) => string;
      propsForDots: { r: string; strokeWidth: string; stroke: string };
      propsForBackgroundLines: { stroke: string };
      propsForLabels: { fontSize: number; fontFamily: string };
    };
    ```
  - `src/design-system/motion/useMotion.ts`:
    ```ts
    export interface MotionConfig {
      reduceMotion: boolean;
      shouldAnimate: boolean;
      useNativeDriver: boolean;
      duration: (ms: number, opts?: { allowReducedFade?: boolean }) => number;
    }
    export function useMotion(): MotionConfig;
    ```

- [ ] **Step 1: Escrever os testes que falham em `ThemeContext.test.tsx` e `useMotion.test.ts`**

`src/design-system/__tests__/ThemeContext.test.tsx`:
```ts
describe('ThemeProvider and adapters', () => {
  it('loads saved "dark" preference from @rephelper:theme_preference and syncs SystemUI', async () => {
    // AsyncStorage.getItem -> 'dark'
    expect(latest.resolvedMode).toBe('dark');
    expect(latest.theme).toEqual(darkTheme);
    expect(SystemUI.setBackgroundColorAsync).toHaveBeenCalledWith('#151412');
  });

  it('falls back safely to "system" when stored preference is invalid ("sepia") or getItem rejects', async () => {
    // Review Focus #1: neither corrupted value nor rejected storage throws
    expect(latest.preference).toBe('system');
  });

  it('persists new preference on setPreference("light") and updates resolvedMode immediately', async () => {
    await act(async () => { await latest.setPreference('light'); });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@rephelper:theme_preference', 'light');
    expect(latest.resolvedMode).toBe('light');
  });

  it('builds dynamic calendar and chart configs without legacy hexes (#222, #333, #7B68EE)', () => {
    const cal = createCalendarTheme(lightTheme);
    const chart = createChartConfig(darkTheme);
    expect(cal.calendarBackground).toBe('#FDFCF9');
    expect(cal.selectedDayBackgroundColor).toBe('#1F4AA8');
    expect(chart.backgroundColor).toBe('#1E1D1A');
    expect(JSON.stringify({ cal, chart })).not.toMatch(/#222|#333|#7B68EE/i);
  });
});
```

`src/design-system/__tests__/useMotion.test.ts`:
```ts
describe('useMotion', () => {
  it('respects Reduce Motion = true, listens for changes, and cleans up subscription on unmount', async () => {
    // AccessibilityInfo.isReduceMotionEnabled -> true
    expect(latest.reduceMotion).toBe(true);
    expect(latest.shouldAnimate).toBe(false);
    expect(latest.duration(180)).toBe(0);
    expect(latest.duration(180, { allowReducedFade: true })).toBe(80);
    // unmount -> expect(removeMock).toHaveBeenCalledTimes(1)
  });

  it('degrades to reduceMotion=false on rejection and sets useNativeDriver=false on web', async () => {
    // Review Focus #5: isReduceMotionEnabled rejects & Platform.OS = 'web'
    expect(latest.reduceMotion).toBe(false);
    expect(latest.useNativeDriver).toBe(false);
  });
});
```

- [ ] **Step 2: Executar os testes para confirmar falha inicial**

Run: `npx jest src/design-system/__tests__/ThemeContext.test.tsx src/design-system/__tests__/useMotion.test.ts --watchAll=false`  
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Implementar `ThemeContext.tsx`, `useTheme.ts`, `createThemedStyles.ts`, `adapters/*` e `useMotion.ts`**

- `ThemeContext.tsx`: valida valores lidos do `AsyncStorage` contra `['light', 'dark', 'system']`; envolve `getItem`/`setItem` e `SystemUI.setBackgroundColorAsync` (somente se `Platform.OS !== 'web'`) em `try/catch`; renderiza o único `<StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.bg} />`.
- `createThemedStyles`: memoiza `StyleSheet.create(factory(theme))` com `useMemo(..., [theme])`.
- `useMotion.ts`: usa `Platform.OS !== 'web'` para `useNativeDriver`, lê `AccessibilityInfo.isReduceMotionEnabled().catch(() => false)` e limpa subscription no `useEffect`.

- [ ] **Step 4: Verificar testes e tipagem**

Run: `npx jest src/design-system/__tests__/ThemeContext.test.tsx src/design-system/__tests__/useMotion.test.ts --watchAll=false && npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/theme src/design-system/motion src/design-system/__tests__/ThemeContext.test.tsx src/design-system/__tests__/useMotion.test.ts
git commit -m "feat(design-system): add ThemeProvider, themed styles, chart/calendar adapters, and useMotion"
```

---

### Task 3: Root Layout (Fontes + Tema), Configuração Expo/Android `DayNight` e Assets Binários de Marca

**Files:**
- Modify: `app/_layout.tsx:1-52`
- Modify: `app.json:1-36`
- Modify: `app.config.js:14-29`
- Modify: `android/app/src/main/res/values/styles.xml:1-19`
- Modify: `android/app/src/main/res/values/colors.xml:1-6`
- Modify: `android/app/src/main/res/values-night/colors.xml:1`
- Modify: `assets/images/icon.png`, `assets/images/adaptive-icon.png`, `assets/images/splash-icon.png`, `assets/images/favicon.png`
- Modify: `android/app/src/main/res/drawable-mdpi/splashscreen_logo.png`, `drawable-hdpi/splashscreen_logo.png`, `drawable-xhdpi/splashscreen_logo.png`, `drawable-xxhdpi/splashscreen_logo.png`
- Test: `src/design-system/__tests__/brandConfig.test.ts`

**Interfaces:**
- Consumes: `ThemeProvider`, `useTheme` (Task 2); 8 exports de fontes `@expo-google-fonts/{source-serif-4,ibm-plex-sans,ibm-plex-mono}` (Task 1).
- Produces: `RootLayout` em `app/_layout.tsx` segurando `SplashScreen` até `(fontsLoaded || fontError) && themeReady` e envolvendo a árvore em `SafeAreaProvider > ThemeProvider > AuthProvider > NotificationProvider`.

- [ ] **Step 1: Escrever o teste que falha em `src/design-system/__tests__/brandConfig.test.ts`**

```ts
import fs from 'fs';
import path from 'path';

describe('Expo, Android DayNight, and Editorial brand assets alignment', () => {
  const root = path.resolve(__dirname, '../../..');

  it('aligns app.json and app.config.js on automatic theme, #F5F2EB splash, and valid assets/images paths', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    const appConfig = fs.readFileSync(path.join(root, 'app.config.js'), 'utf8');

    expect(appJson.expo.userInterfaceStyle).toBe('automatic');
    expect(appJson.expo.splash.backgroundColor).toBe('#F5F2EB');
    expect(appJson.expo.android.adaptiveIcon.backgroundColor).toBe('#F5F2EB');
    for (const relPath of [
      appJson.expo.icon,
      appJson.expo.splash.image,
      appJson.expo.android.adaptiveIcon.foregroundImage,
      appJson.expo.web.favicon,
    ]) {
      expect(relPath).toMatch(/^\.\/assets\/images\/.+\.png$/);
      expect(fs.existsSync(path.join(root, relPath))).toBe(true);
    }

    expect(appConfig).toContain('userInterfaceStyle: "automatic"');
    expect(appConfig).toContain('backgroundColor: "#F5F2EB"');
  });

  it('configures Android native DayNight theme and light/dark splash colors surgically', () => {
    const stylesXml = fs.readFileSync(path.join(root, 'android/app/src/main/res/values/styles.xml'), 'utf8');
    const lightColors = fs.readFileSync(path.join(root, 'android/app/src/main/res/values/colors.xml'), 'utf8');
    const darkColors = fs.readFileSync(path.join(root, 'android/app/src/main/res/values-night/colors.xml'), 'utf8');

    expect(stylesXml).toContain('Theme.AppCompat.DayNight.NoActionBar');
    expect(stylesXml).not.toContain('Theme.AppCompat.Light.NoActionBar');
    expect(lightColors).toContain('#F5F2EB');
    expect(lightColors).toContain('#1F4AA8');
    expect(darkColors).toContain('#151412');
    expect(darkColors).toContain('#7EA4FF');
  });

  it('contains non-empty regenerated PNG brand and Android splash logo assets', () => {
    const pngPaths = [
      'assets/images/icon.png',
      'assets/images/adaptive-icon.png',
      'assets/images/splash-icon.png',
      'assets/images/favicon.png',
      'android/app/src/main/res/drawable-mdpi/splashscreen_logo.png',
      'android/app/src/main/res/drawable-hdpi/splashscreen_logo.png',
      'android/app/src/main/res/drawable-xhdpi/splashscreen_logo.png',
      'android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png',
    ];
    for (const rel of pngPaths) {
      const buf = fs.readFileSync(path.join(root, rel));
      expect(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
      expect(buf.length).toBeGreaterThan(200);
    }
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar falha inicial**

Run: `npx jest src/design-system/__tests__/brandConfig.test.ts --watchAll=false`  
Expected: FAIL (`app.json` tem `userInterfaceStyle: "dark"` e `./assets/*.png`, `styles.xml` tem `Theme.AppCompat.Light.NoActionBar`).

- [ ] **Step 3: Atualizar `app/_layout.tsx`, `app.json`, `app.config.js` e XMLs nativos do Android**

- `app/_layout.tsx`: carregar via `useFonts` as 8 fontes da Spec Seção 5.1; montar `ThemeProvider` dentro de `SafeAreaProvider`; remover `<StatusBar>` e `backgroundColor: '#333'` hardcoded (delegados a um wrapper interno que usa `useTheme()` e chama `SplashScreen.hideAsync()` somente quando `(fontsLoaded || Boolean(fontError)) && ready`).
- `app.json` & `app.config.js`: `userInterfaceStyle: "automatic"`, `splash.backgroundColor: "#F5F2EB"`, `adaptiveIcon.backgroundColor: "#F5F2EB"`, caminhos `./assets/images/{icon,splash-icon,adaptive-icon,favicon}.png` preservando `scheme: "rephelper"`.
- `android/app/src/main/res/values/styles.xml`: trocar `parent="Theme.AppCompat.Light.NoActionBar"` por `parent="Theme.AppCompat.DayNight.NoActionBar"` e remover `android:statusBarColor` / `@android:color/black` fixos que travam dark mode.
- `android/app/src/main/res/values/colors.xml`: `splashscreen_background` e `iconBackground` = `#F5F2EB`, `colorPrimary` = `#1F4AA8`, `colorPrimaryDark` = `#F5F2EB`.
- `android/app/src/main/res/values-night/colors.xml`: `splashscreen_background` e `iconBackground` = `#151412`, `colorPrimary` = `#7EA4FF`, `colorPrimaryDark` = `#151412`.

- [ ] **Step 4: Regenerar os 8 PNGs de marca na paleta Editorial (`#1F4AA8` / `#F5F2EB`)**

Gerar programaticamente (via script Node temporário usando zlib/PNG encoder puro ou canvas/sharp sem adicionar dependência de produção) o monograma editorial geométrico **"RH"** (cobalto `#1F4AA8` com borda fina sobre papel `#F5F2EB` em `icon.png` `1024×1024` e `favicon.png` `48×48`; monograma em fundo transparente para `adaptive-icon.png` `1024×1024`, `splash-icon.png` `512×512` e `drawable-{mdpi:192,hdpi:288,xhdpi:384,xxhdpi:576}/splashscreen_logo.png`). Remover o script temporário após gerar os arquivos.

- [ ] **Step 5: Verificar testes (incluindo `envSecurity.test.ts`) e tipagem**

Run: `npx jest src/design-system/__tests__/brandConfig.test.ts src/utils/__tests__/envSecurity.test.ts --watchAll=false && npm run typecheck`  
Expected: PASS (0 falhas; hardening Android intacto).

- [ ] **Step 6: Commit**

```bash
git add app/_layout.tsx app.json app.config.js android/app/src/main/res assets/images src/design-system/__tests__/brandConfig.test.ts
git commit -m "feat(design-system): load editorial fonts in root layout, enable Android DayNight, and refresh brand assets"
```

---

## Onda 2 — Primitivos de UI, `FeedbackProvider`, Shell de Navegação e Tela de Aparência

### Task 4: Biblioteca de Primitivos de UI Acessíveis + Barrel `src/design-system/index.ts`

**Files:**
- Create: `src/design-system/primitives/AppText.tsx`
- Create: `src/design-system/primitives/Divider.tsx`
- Create: `src/design-system/primitives/Surface.tsx`
- Create: `src/design-system/primitives/Button.tsx`
- Create: `src/design-system/primitives/IconButton.tsx`
- Create: `src/design-system/primitives/BrandIcons.tsx`
- Create: `src/design-system/primitives/TextField.tsx`
- Create: `src/design-system/primitives/StatusText.tsx`
- Create: `src/design-system/primitives/Chip.tsx`
- Create: `src/design-system/primitives/Avatar.tsx`
- Create: `src/design-system/primitives/ListRow.tsx`
- Create: `src/design-system/primitives/SegmentedTabs.tsx`
- Create: `src/design-system/primitives/ScreenHeader.tsx`
- Create: `src/design-system/primitives/Screen.tsx`
- Create: `src/design-system/primitives/StateView.tsx`
- Create: `src/design-system/primitives/Skeleton.tsx`
- Create: `src/design-system/primitives/ConfirmSection.tsx`
- Create: `src/design-system/index.ts`
- Test: `src/design-system/__tests__/primitives.test.tsx`

**Interfaces:**
- Consumes: `useTheme`, `useThemedStyles`, `useMotion`, `TypographyVariant`, `ThemeColors`, `lucide-react-native`, `react-native-svg`, `react-native-safe-area-context`.
- Produces (todos re-exportados em `src/design-system/index.ts`):
  - `AppText({ variant?: TypographyVariant; color?: keyof Pick<ThemeColors, 'ink'|'inkSecondary'|'inkMuted'|'accent'|'onAccent'|'success'|'warning'|'danger'|'onDanger'>; strikethrough?: boolean; ...TextProps })`
  - `Divider({ orientation?: 'horizontal' | 'vertical'; inset?: number; style?: StyleProp<ViewStyle> })`
  - `Surface({ tone?: 'bg' | 'surface' | 'subtle'; bordered?: boolean; padded?: boolean | SpacingKey; radiusKey?: RadiusKey; style?: StyleProp<ViewStyle>; children })`
  - `Button({ label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'md' | 'sm'; loading?: boolean; disabled?: boolean; leftIcon?: React.ReactNode; fullWidth?: boolean; accessibilityLabel?: string })`
  - `IconButton({ icon: React.ReactNode; onPress: () => void; accessibilityLabel: string; variant?: 'ghost' | 'subtle' | 'danger'; disabled?: boolean; size?: number })` *(minWidth: 44, minHeight: 44, hitSlop: 8)*
  - `GoogleIcon({ size?: number; monochrome?: boolean })` e `InstagramIcon({ size?: number; color?: string })` em `BrandIcons.tsx`
  - `TextField({ label?: string; value: string; onChangeText: (text: string) => void; error?: string; helperText?: string; leftIcon?: React.ReactNode; rightAccessory?: React.ReactNode; secureToggle?: boolean; multiline?: boolean; ...TextInputProps })`
  - `StatusText({ label: string; tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'; showDot?: boolean; icon?: React.ReactNode })`
  - `Chip({ label: string; selected?: boolean; onPress?: () => void; leftIcon?: React.ReactNode })`
  - `Avatar({ uri?: string | null; name?: string | null; size?: 'sm' | 'md' | 'lg' })`
  - `ListRow({ title: string; subtitle?: string; leading?: React.ReactNode; trailing?: React.ReactNode; onPress?: () => void; showDivider?: boolean; strikethrough?: boolean; accessibilityLabel?: string })`
  - `SegmentedTabs<T extends string>({ options: ReadonlyArray<{ value: T; label: string; badge?: number }>; value: T; onChange: (value: T) => void })`
  - `ScreenHeader({ title: string; subtitle?: string; variant?: 'editorial' | 'compact'; onBack?: () => void; rightActions?: React.ReactNode })`
  - `Screen({ children; scroll?: boolean; width?: 'standard' | 'wide' | 'full'; padded?: boolean; keyboardAvoiding?: boolean; refreshControl?: React.ReactElement; header?: React.ReactNode; edges?: Edge[] })` *(usa `SafeAreaView` de `react-native-safe-area-context`; centraliza em `maxWidth: 720` para `'standard'` e `960` para `'wide'` quando largura `>= 768`)*
  - `StateView({ kind: 'loading' | 'empty' | 'error'; title?: string; description?: string; actionLabel?: string; onAction?: () => void; icon?: React.ReactNode })`
  - `Skeleton({ width?: DimensionValue; height: number; radiusKey?: RadiusKey; style?: StyleProp<ViewStyle> })`
  - `ConfirmSection({ title: string; deleteLabel: string; confirmLabel?: string; showConfirm: boolean; loading?: boolean; onPressDelete: () => void; onCancelConfirm: () => void })`

- [ ] **Step 1: Escrever o teste que falha em `src/design-system/__tests__/primitives.test.tsx`**

```ts
describe('Design System core primitives', () => {
  it('AppText applies variant fontFamily, keeps allowFontScaling enabled, and supports strikethrough', () => {
    // Review Focus #4
    expect(titleStyle.fontFamily).toBe('SourceSerif4_600SemiBold');
    expect(monoStyle.fontFamily).toBe('IBMPlexMono_600SemiBold');
    expect(textNode.props.allowFontScaling).not.toBe(false);
    expect(strikeStyle.textDecorationLine).toBe('line-through');
  });

  it('Button and IconButton enforce accessibility props and >= 44px touch targets', () => {
    // Review Focus #4
    expect(btn.props.accessibilityRole).toBe('button');
    expect(btnLoading.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(btnStyle.minHeight).toBeGreaterThanOrEqual(44);
    expect(iconBtn.props.accessibilityLabel).toBe('Voltar');
    expect(iconBtnStyle.minWidth).toBeGreaterThanOrEqual(44);
    expect(iconBtnStyle.minHeight).toBeGreaterThanOrEqual(44);
  });

  it('TextField renders inline danger error and toggles secureTextEntry via secureToggle', () => {
    expect(input.props.secureTextEntry).toBe(true);
    // press toggle -> expect(input.props.secureTextEntry).toBe(false)
    expect(errorNode.props.children).toBe('Senha obrigatória');
  });

  it('Screen constrains content maxWidth to 720 (standard) and 960 (wide) at viewport width 1280', () => {
    // Review Focus #4
    expect(standardStyle.maxWidth).toBe(720);
    expect(wideStyle.maxWidth).toBe(960);
  });

  it('StateView triggers onAction in error state and BrandIcons render SVG marks', () => {
    // press retry button -> expect(onAction).toHaveBeenCalledTimes(1)
    // render GoogleIcon & InstagramIcon -> Svg nodes present
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar falha inicial**

Run: `npx jest src/design-system/__tests__/primitives.test.tsx --watchAll=false`  
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Implementar os 17 primitivos e `src/design-system/index.ts`**

Seguir todas as regras da Spec Seção 5:
- Usar `Pressable` (nunca `TouchableOpacity`) com feedback `motion.pressOpacity` / `motion.pressScale` (sem scale quando `reduceMotion === true`).
- Usar `borderStrong` em bordas interativas (`TextField`, botão `secondary`, checkbox) e `line` em divisórias e `Surface`.
- Em `SegmentedTabs` e `Skeleton`, respeitar `useMotion()` (`duration(ms)` e estático quando `reduceMotion`).
- `BrandIcons.tsx` isola as cores oficiais do Google (se `!monochrome`) com comentário `/* brand-exception */` ou modo `monochrome` em `theme.colors.ink`.

- [ ] **Step 4: Verificar testes e tipagem**

Run: `npx jest src/design-system/__tests__/primitives.test.tsx --watchAll=false && npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/primitives src/design-system/index.ts src/design-system/__tests__/primitives.test.tsx
git commit -m "feat(design-system): implement core accessible UI primitives and barrel exports"
```

---

### Task 5: Sobreposições (`BottomSheetModal`, `ConfirmDialog`, `Toast`), `FeedbackProvider` e Integração com `ErrorHandler` + `NotificationContext`

**Files:**
- Create: `src/design-system/primitives/BottomSheetModal.tsx`
- Create: `src/design-system/primitives/ConfirmDialog.tsx`
- Create: `src/design-system/primitives/Toast.tsx`
- Create: `src/design-system/feedback/FeedbackContext.tsx`
- Create: `src/design-system/feedback/useFeedback.ts`
- Modify: `src/design-system/index.ts`
- Modify: `app/_layout.tsx`
- Modify: `src/utils/errorHandling.ts`
- Modify: `src/context/NotificationContext.tsx`
- Modify: `components/NotificationToast.tsx`
- Test: `src/design-system/__tests__/FeedbackContext.test.tsx`

**Interfaces:**
- Consumes: `useTheme`, `useMotion`, `AppText`, `Button`, `IconButton`, `Surface`, `Divider` (Tasks 2, 4); `expo-haptics`.
- Produces:
  - `BottomSheetModal({ visible: boolean; onClose: () => void; title?: string; children: React.ReactNode; footer?: React.ReactNode })`
  - `ConfirmDialog({ visible: boolean; title: string; message: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; onConfirm: () => void; onCancel: () => void })`
  - `Toast({ title: string; message?: string; tone?: ToastTone; onDismiss: () => void; onPress?: () => void })`
  - `FeedbackContext.tsx` & `useFeedback.ts`:
    ```ts
    export type ToastTone = 'info' | 'success' | 'warning' | 'danger';
    export interface ToastOptions { title: string; message?: string; tone?: ToastTone; duration?: number; onPress?: () => void; }
    export interface ConfirmOptions { title: string; message: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; }
    export interface FeedbackContextValue {
      toast: (options: ToastOptions) => string;
      dismissToast: (id: string) => void;
      confirm: (options: ConfirmOptions) => Promise<boolean>;
    }
    export function FeedbackProvider({ children }: { children: React.ReactNode }): React.ReactElement;
    export function useFeedback(): FeedbackContextValue;
    ```
  - `src/utils/errorHandling.ts`:
    ```ts
    export type ErrorToastHandler = (payload: { title: string; message: string; tone: 'info' | 'warning' | 'danger' }) => void;
    static registerToastHandler(handler: ErrorToastHandler | null): void;
    ```

- [ ] **Step 1: Escrever o teste que falha em `src/design-system/__tests__/FeedbackContext.test.tsx`**

```ts
describe('FeedbackProvider and ErrorHandler integration', () => {
  it('renders editorial Toast on toast() and auto-dismisses after duration', () => {
    // toast({ title: 'Salvo', message: 'Despesa registrada', tone: 'success', duration: 2000 })
    expect(renderedText).toContain('Despesa registrada');
    // advanceTimersByTime(2000) -> toast unmounted
  });

  it('resolves confirm() to true on confirm, false on cancel/backdrop, and handles concurrent calls deterministically', async () => {
    // Review Focus #2
    const p1 = feedback.confirm({ title: 'Excluir', message: 'Continuar?', destructive: true });
    const p2 = feedback.confirm({ title: 'Sair', message: 'Encerrar sessão?' });
    // trigger backdrop/cancel on first, confirm on second
    expect(await p1).toBe(false);
    expect(await p2).toBe(true);
  });

  it('routes ErrorHandler showAlert to registered toast handler and never calls Alert.alert before mount or after unmount', async () => {
    // Review Focus #3: Alert.alert spy
    await ErrorHandler.handleError(new Error('Falha pré-mount'), { showAlert: true });
    expect(alertSpy).not.toHaveBeenCalled();
    // mount FeedbackProvider -> handleError({ showAlert: true }) -> toast rendered, alertSpy not called
    // unmount FeedbackProvider -> handleError({ showAlert: true }) -> does not throw, alertSpy not called
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar falha inicial**

Run: `npx jest src/design-system/__tests__/FeedbackContext.test.tsx --watchAll=false`  
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Implementar `BottomSheetModal`, `ConfirmDialog`, `Toast`, `FeedbackContext`, `useFeedback` e integrar `ErrorHandler` + `NotificationContext`**

- `BottomSheetModal.tsx`: fundo `theme.colors.overlay`, sheet `theme.colors.surface` com `radius.lg`, `elevation.floating`, animação `translateY` + `opacity` respeitando `useMotion()`, fechável via backdrop e `onRequestClose`.
- `FeedbackContext.tsx`: mantém fila determinística para `confirm()` (cada entrada resolve `Promise<boolean>`, fechamento resolve `false`) e pilha de até 3 `Toast`s no topo respeitando `useSafeAreaInsets().top`; no `useEffect`, registra `ErrorHandler.registerToastHandler(...)` e limpa com `null` no unmount.
- `src/utils/errorHandling.ts`: remover import e qualquer chamada a `Alert.alert`; rotear `showAlert: true` para `toastHandler` registrado (ou no-op seguro se `null`).
- `app/_layout.tsx`: montar `<FeedbackProvider>` dentro de `<ThemeProvider>` envolvendo `<AuthProvider>` e `<NotificationProvider>`.
- `components/NotificationToast.tsx` & `src/context/NotificationContext.tsx`: remover `LinearGradient`, `pulseAnim`, spring elástico e cores hardcoded; delegar renderização visual ao `Toast` do design system (ou encaminhar `showNotification` para `useFeedback().toast` garantindo pilha visual única).

- [ ] **Step 4: Verificar testes (incluindo `AuthContext.test.tsx`) e tipagem**

Run: `npx jest src/design-system/__tests__/FeedbackContext.test.tsx src/context/__tests__/AuthContext.test.tsx --watchAll=false && npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/primitives/BottomSheetModal.tsx src/design-system/primitives/ConfirmDialog.tsx src/design-system/primitives/Toast.tsx src/design-system/feedback src/design-system/index.ts app/_layout.tsx src/utils/errorHandling.ts src/context/NotificationContext.tsx components/NotificationToast.tsx src/design-system/__tests__/FeedbackContext.test.tsx
git commit -m "feat(design-system): add FeedbackProvider (Toast + ConfirmDialog) and decouple ErrorHandler from Alert.alert"
```

---

### Task 6: Shell de Navegação (`_layout.tsx`, `app/index.tsx`) e Tela de Aparência (`settings/appearance.tsx`)

**Files:**
- Modify: `app/index.tsx:1-105`
- Modify: `src/utils/authProtection.tsx:74-86`
- Modify: `src/services/notifications.ts:12-20`
- Modify: `app/(auth)/_layout.tsx:1-61`
- Modify: `app/(republic)/_layout.tsx:1-50`
- Modify: `app/(panel)/_layout.tsx:1-87`
- Modify: `app/(panel)/tasks/_layout.tsx:1-49`
- Modify: `app/(panel)/events/_layout.tsx:1-28`
- Modify: `app/(panel)/finances/_layout.tsx:1-85`
- Modify: `app/(panel)/settings/_layout.tsx:1-36`
- Create: `app/(panel)/settings/appearance.tsx`
- Modify: `app/(panel)/settings/index.tsx` (adicionar entrada "Aparência" na seção Aplicativo — migração visual completa na Task 8)
- Test: `src/design-system/__tests__/appearanceScreen.test.tsx`

**Interfaces:**
- Consumes: `palette` (Task 1); `useTheme` (Task 2); `Screen`, `ScreenHeader`, `Surface`, `ListRow`, `AppText`, `StatusText`, `Divider`, `StateView`, `lucide-react-native` (Task 4).
- Produces:
  - Rota `/(panel)/settings/appearance` (`AppearanceScreen`) alternando `'light' | 'dark' | 'system'` com prévia ao vivo.
  - Todos os 7 sub-layouts temáticos dinamicamente via `useTheme()`, com `settings/_layout.tsx` em `headerShown: false` e `tabBar` usando ícones `lucide-react-native` (`Home`, `CheckSquare`, `Calendar`, `Wallet`, `Settings`).

- [ ] **Step 1: Escrever o teste que falha em `src/design-system/__tests__/appearanceScreen.test.tsx`**

```ts
describe('AppearanceScreen', () => {
  it('renders Claro, Escuro, and Seguir padrão do sistema and persists theme switch immediately', async () => {
    // render AppearanceScreen inside ThemeProvider
    // press option 'Escuro' -> expect(AsyncStorage.setItem).toHaveBeenCalledWith('@rephelper:theme_preference', 'dark')
    // expect option 'Escuro' accessibilityState.selected === true
    // press option 'Claro' -> expect(AsyncStorage.setItem).toHaveBeenCalledWith('@rephelper:theme_preference', 'light')
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar falha inicial**

Run: `npx jest src/design-system/__tests__/appearanceScreen.test.tsx --watchAll=false`  
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Implementar `appearance.tsx` e migrar todos os `_layout.tsx` + `app/index.tsx`**

- `app/(panel)/settings/appearance.tsx`: usa `Screen` + `ScreenHeader` (`title="Aparência"`), bloco `Surface` com 3 `ListRow` selecionáveis (`Claro`, `Escuro`, `Seguir padrão do sistema`) com ícone Lucide (`Sun`, `Moon`, `Smartphone`) e `Check` no item ativo, além de um card compacto de prévia ao vivo (Caixa + item de tarefa) usando os próprios primitivos.
- `app/(panel)/_layout.tsx`: `tabBarStyle` em `theme.colors.surface`, `borderTopColor: theme.colors.line`, `tabBarActiveTintColor: theme.colors.accent`, `tabBarInactiveTintColor: theme.colors.inkMuted`, `tabBarLabelStyle` com `IBMPlexSans_500Medium` e `tabBarAllowFontScaling` respeitado com `maxFontSizeMultiplier={1.3}` (via `tabBarLabel` ou `tabBarLabelStyle`); ícones `lucide-react-native` (`strokeWidth={1.75}`).
- `app/(auth)/_layout.tsx`, `app/(republic)/_layout.tsx` (corrigindo `headerLeft` clicável ou `headerShown: false`), `tasks/_layout.tsx`, `events/_layout.tsx`, `finances/_layout.tsx`, `settings/_layout.tsx` (`headerShown: false`, registrando `<Stack.Screen name="appearance" />`): `contentStyle: { backgroundColor: theme.colors.bg }`, zero hex hardcoded, zero `@expo/vector-icons`.
- `app/index.tsx` e `src/utils/authProtection.tsx`: usar `Screen` + `StateView` (`loading` / `error`) — preservando intacta a lógica síncrona de `resolveAuthRedirect` testada por `authProtection.test.ts`.
- `src/services/notifications.ts`: substituir `lightColor: '#FF231F7C'` por `palette.light.accent`.

- [ ] **Step 4: Verificar testes e tipagem**

Run: `npx jest src/design-system/__tests__/appearanceScreen.test.tsx src/utils/__tests__/authProtection.test.ts --watchAll=false && npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/index.tsx src/utils/authProtection.tsx src/services/notifications.ts "app/(auth)/_layout.tsx" "app/(republic)/_layout.tsx" "app/(panel)/_layout.tsx" "app/(panel)/tasks/_layout.tsx" "app/(panel)/events/_layout.tsx" "app/(panel)/finances/_layout.tsx" "app/(panel)/settings/_layout.tsx" "app/(panel)/settings/appearance.tsx" "app/(panel)/settings/index.tsx" src/design-system/__tests__/appearanceScreen.test.tsx
git commit -m "feat(design-system): theme all navigation layouts, auth gate, and add Settings > Appearance screen"
```

---

## Onda 3 — Migração: Autenticação, República, Home, Notificações e Configurações

### Task 7: Migração de Autenticação (`app/(auth)/*`) e Onboarding de República (`app/(republic)/*`)

**Files:**
- Modify: `app/(auth)/sign-in.tsx`
- Modify: `app/(auth)/sign-up.tsx`
- Modify: `app/(auth)/forgot-password.tsx`
- Modify: `app/(republic)/choice.tsx`
- Modify: `app/(republic)/new.tsx`
- Modify: `app/(republic)/join.tsx`

**Interfaces:**
- Consumes: `Screen`, `ScreenHeader`, `Surface`, `AppText`, `TextField`, `Button`, `Divider`, `GoogleIcon`, `useTheme`, `useThemedStyles`, `useFeedback` (Tasks 2, 4, 5); `lucide-react-native`.
- Produces: 6 telas totalmente migradas sem hexes hardcoded, sem `Alert.alert`, sem `SafeAreaView` do `react-native`, sem `<StatusBar>` e sem `@expo/vector-icons`.

- [ ] **Step 1: Migrar `app/(auth)/{sign-in,sign-up,forgot-password}.tsx`**

- Preservar integralmente `react-hook-form` + `zodResolver` (`loginSchema`, `signUpSchema`), anti-enumeração em `forgot-password.tsx` e validação de `isGoogleAuthConfigured`.
- Em `sign-in.tsx`: título `display` em `Source Serif 4`, campos em `TextField` (com `secureToggle` para senha), botão **"Entrar"** como único CTA `primary` sólido e botão **"Continuar com Google"** na variante `secondary` com `<GoogleIcon />` (cumprindo regra de no máximo 1 CTA sólido por tela).
- Trocar todos os `Alert.alert` em `forgot-password.tsx` por `useFeedback().toast(...)`.

- [ ] **Step 2: Migrar `app/(republic)/{choice,new,join}.tsx`**

- Usar `Screen`, `ScreenHeader` (substituindo `BackButton` em `join.tsx`), `Surface`, `TextField`, `Button` e `useFeedback()` no lugar de todos os `Alert.alert`, mantendo os `await login(...)` de segurança preservados.

- [ ] **Step 3: Verificar ausência de padrões legados no escopo + testes e tipagem**

Run: `npm run typecheck && npm run test:ci` e verificar via grep que `app/(auth)` e `app/(republic)` não contêm `#[0-9a-fA-F]{3,8}`, `Alert.alert`, `<StatusBar`, `@expo/vector-icons` ou `SafeAreaView` de `react-native`.  
Expected: 0 ocorrências legadas, `typecheck` e `test:ci` PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)" "app/(republic)"
git commit -m "refactor(ui): migrate auth and republic onboarding screens to Editorial design system"
```

---

### Task 8: Migração de `home.tsx`, `quick-actions.tsx`, Notificações e Todas as Telas de `settings/`

**Files:**
- Modify: `app/(panel)/home.tsx`
- Modify: `app/(panel)/quick-actions.tsx`
- Modify: `components/NotificationBadge.tsx`
- Modify: `components/NotificationCenter.tsx`
- Modify: `app/(panel)/settings/index.tsx`
- Modify: `app/(panel)/settings/account.tsx`
- Modify: `app/(panel)/settings/change-password.tsx`
- Modify: `app/(panel)/settings/republic.tsx`
- Modify: `app/(panel)/settings/members.tsx`
- Modify: `app/(panel)/settings/about.tsx`
- Modify: `app/(panel)/settings/help.tsx`
- Modify: `app/(panel)/settings/privacy-policy.tsx`
- Modify: `app/(panel)/settings/software-licenses.tsx`
- Modify: `app/(panel)/settings/terms-of-use.tsx`

**Interfaces:**
- Consumes: `Screen`, `ScreenHeader`, `Surface`, `AppText`, `Button`, `IconButton`, `TextField`, `ListRow`, `Divider`, `StatusText`, `Avatar`, `StateView`, `BottomSheetModal`, `InstagramIcon`, `useTheme`, `useFeedback` (Tasks 2, 4, 5).
- Produces: Home, Quick Actions, Notification Center/Badge e todas as 11 telas de Settings (`index`, `appearance` + 9 subtelas) padronizadas com `ScreenHeader` e zero `Alert.alert`.

- [ ] **Step 1: Migrar `home.tsx`, `quick-actions.tsx`, `NotificationBadge.tsx` e `NotificationCenter.tsx`**

- `home.tsx`: remover a animação `useNativeDriver: false` de `headerHeight` (Spec Seção 5.3); estruturar com `Screen` (`scroll`, `width="wide"`), cabeçalho editorial (`monoLabel` data + `display` nome da república/saudação + `Avatar` + `IconButton` de notificações com `NotificationBadge`), bloco `Surface` de resumo financeiro (`monoHero` para saldo + `StatusText`), listas de tarefas e próximos eventos em linhas limpas com `Divider`, e `formatCurrency` importado de `src/utils/currencyUtils.ts`.
- `NotificationCenter.tsx`: remover imports de `animationCompat`, `LinearGradient` e `sharedStyles`; usar `BottomSheetModal`, `ListRow`, `Divider`, `StateView` e `useMotion()`.
- `quick-actions.tsx`: remover `BackButton` e `sharedStyles`; usar `Screen`, `ScreenHeader` e `ListRow`.

- [ ] **Step 2: Migrar todas as telas de `app/(panel)/settings/*`**

- Todas as subtelas (`account`, `change-password`, `republic`, `members`, `about`, `help`, `privacy-policy`, `software-licenses`, `terms-of-use`) usam `Screen` + `ScreenHeader` (eliminando os `<Stack.Screen options>` com `#333` e títulos duplicados no corpo).
- `about.tsx`: exibe o novo `assets/images/icon.png` sobre `Surface` + `InstagramIcon` de `BrandIcons.tsx`.
- `account.tsx`, `change-password.tsx`, `republic.tsx`, `members.tsx`: substituir todos os `Alert.alert` por `useFeedback().toast(...)` / `useFeedback().confirm(...)`, preservando limpeza de senhas em `change-password.tsx` e validações de upload Supabase em `account.tsx`.
- `settings/index.tsx`: seções agrupadas em `Surface` com `ListRow` + `Divider`, incluindo **Aparência** (`/(panel)/settings/appearance`) e ação destrutiva **"Sair da Conta"** confirmada via `useFeedback().confirm({ destructive: true })`.

- [ ] **Step 3: Verificar ausência de padrões legados no escopo + testes e tipagem**

Run: `npm run typecheck && npm run test:ci` e validar zero ocorrências de hex hardcoded, `Alert.alert`, `LinearGradient`, `animationCompat`, `@expo/vector-icons`, `<StatusBar` e `SafeAreaView` do `react-native` em `home.tsx`, `quick-actions.tsx`, `Notification*` e `app/(panel)/settings/`.  
Expected: 0 ocorrências legadas, `typecheck` e `test:ci` PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(panel)/home.tsx" "app/(panel)/quick-actions.tsx" "app/(panel)/settings" components/NotificationBadge.tsx components/NotificationCenter.tsx
git commit -m "refactor(ui): migrate home, notifications, and all settings screens to Editorial design system"
```

---

## Onda 4 — Migração: Tarefas, Eventos e Finanças

### Task 9: Migração do Módulo de Tarefas (`app/(panel)/tasks/*` e `components/Task*`)

**Files:**
- Modify: `app/(panel)/tasks/index.tsx`
- Modify: `app/(panel)/tasks/tasks-list.tsx`
- Modify: `app/(panel)/tasks/create.tsx`
- Modify: `app/(panel)/tasks/edit.tsx`
- Modify: `app/(panel)/tasks/[id].tsx`
- Modify: `components/TaskItem.tsx`
- Modify: `components/TaskFilter.tsx`
- Modify: `components/Task/TaskDetails/TaskActionButtons.tsx`
- Modify: `components/Task/TaskDetails/TaskAssignedUsersCard.tsx`
- Modify: `components/Task/TaskDetails/TaskRecurrenceCard.tsx`
- Modify: `components/Task/TaskEdit/CategorySection.tsx`
- Modify: `components/Task/TaskEdit/DateTimePickerSection.tsx`
- Modify: `components/Task/TaskEdit/RecurrenceSection.tsx`
- Modify: `components/Task/TaskEdit/TitleDescriptionInputs.tsx`
- Modify: `components/Task/TaskEdit/UserAssignmentSection.tsx`
- Modify: `components/Task/TaskEdit/index.tsx`

**Interfaces:**
- Consumes: `Screen`, `ScreenHeader`, `Surface`, `AppText`, `Button`, `TextField`, `Chip`, `Divider`, `ListRow`, `StatusText`, `Avatar`, `StateView`, `BottomSheetModal`, `ConfirmSection`, `useTheme`, `useMotion`, `useFeedback` (Tasks 2, 4, 5); `expo-haptics` (com guarda `Platform.OS !== 'web'`).
- Produces: módulo de tarefas sem `LinearGradient`, sem `Alert.alert`, sem `BackButton`/`HeaderBar`/`ConfirmDeleteModal`.

- [ ] **Step 1: Migrar componentes de tarefa (`TaskItem`, `TaskFilter`, `TaskDetails/*`, `TaskEdit/*`)**

- `TaskItem.tsx`: estilo editorial em linha separada por `Divider`; checkbox quadrado (`radius.sm`, borda `borderStrong`/`accent`); ao concluir, aplica `strikethrough` + transição curta `useMotion().duration(160)` + feedback tátil (`Haptics.selectionAsync()` fora da Web) e status via `StatusText` (`hoje`, `atrasado`, `feito`).
- `TaskFilter.tsx`: usar `Chip` + `TextField` de busca + `BottomSheetModal`.
- `TaskDetails/TaskActionButtons.tsx`: trocar `Alert.alert` por `useFeedback().confirm(...)` / `toast(...)`.
- `TaskEdit/*`: remover export/uso de `HeaderBar` (substituído por `ScreenHeader` em `create.tsx` e `edit.tsx`), usar `TextField`, `Chip`, `Surface`, `Divider` e `Avatar`.

- [ ] **Step 2: Migrar as 5 telas em `app/(panel)/tasks/*`**

- `tasks-list.tsx`: remover `LinearGradient`, `Alert.alert` e estilos hardcoded; usar `Screen`, `ScreenHeader`, `StateView`, `Divider` e `Button` / `IconButton`.
- `create.tsx`, `edit.tsx`, `[id].tsx`: substituir `BackButton`, `HeaderBar`, `ConfirmDeleteModal` (por `ConfirmSection`) e todos os `Alert.alert` por `useFeedback()`.

- [ ] **Step 3: Verificar ausência de padrões legados no módulo de Tarefas + testes e tipagem**

Run: `npm run typecheck && npm run test:ci` e checar zero hex hardcoded / `Alert.alert` / `LinearGradient` / `@expo/vector-icons` / `SafeAreaView` do RN em `app/(panel)/tasks/` e `components/Task*`.  
Expected: 0 ocorrências legadas, `typecheck` e `test:ci` PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(panel)/tasks" components/TaskItem.tsx components/TaskFilter.tsx components/Task
git commit -m "refactor(ui): migrate tasks screens and components to Editorial design system"
```

---

### Task 10: Migração do Módulo de Eventos e Sincronização de Calendário

**Files:**
- Modify: `app/(panel)/events/index.tsx`
- Modify: `app/(panel)/events/create.tsx`
- Modify: `app/(panel)/events/edit/[id].tsx`
- Modify: `app/(panel)/events/[id].tsx`
- Modify: `app/(panel)/events/invitations/[id].tsx`
- Modify: `components/Event/Calendar.tsx`
- Modify: `components/Event/CalendarSkeleton.tsx`
- Modify: `components/Event/EventItem.tsx`
- Modify: `components/Event/InviteUsersSection.tsx`
- Modify: `components/Event/EventDetails/EventAttendanceGroups.tsx`
- Modify: `components/Event/EventDetails/EventParticipationActions.tsx`
- Modify: `components/CalendarPicker.tsx`
- Modify: `components/SyncCalendarButton.tsx`
- Modify: `src/services/calendar/calendarService.ts`
- Modify: `src/hooks/useCalendarSync.ts`

**Interfaces:**
- Consumes: `createCalendarTheme` (Task 2); `Screen`, `ScreenHeader`, `Surface`, `AppText`, `Button`, `Chip`, `Divider`, `ListRow`, `StatusText`, `Avatar`, `StateView`, `Skeleton`, `BottomSheetModal`, `ConfirmSection`, `GoogleIcon`, `useTheme`, `useMotion`, `useFeedback` (Tasks 2, 4, 5).
- Produces:
  - `CalendarService.addEventToCalendar(event)` retornando `{ eventId: string | null; calendarSource: string | null; errorCode?: 'permission_denied' | 'no_calendar' | 'sync_failed' }` (zero `Alert.alert` na camada de serviço).
  - `useCalendarSync()` comunicando feedback via `useFeedback().toast(...)` e `useFeedback().confirm(...)`.

- [ ] **Step 1: Remover `Alert.alert` de `calendarService.ts` e `useCalendarSync.ts`**

- `src/services/calendar/calendarService.ts`: remover import de `Alert`; retornar `errorCode` tipado nos fluxos de permissão negada, calendário ausente e erro inesperado; usar `logger.error` em vez de `console.error`.
- `src/hooks/useCalendarSync.ts`: remover `Alert.alert`; usar `useFeedback()` (`toast` para permissão/sucesso/erro, `confirm` para oferecer abrir o `CalendarPicker`).

- [ ] **Step 2: Migrar `Calendar.tsx`, `CalendarSkeleton.tsx`, `CalendarPicker.tsx`, `SyncCalendarButton.tsx` e `components/Event/*`**

- `Calendar.tsx`: substituir `Dimensions.get('window')` de nível de módulo por `useWindowDimensions()`, aplicar `createCalendarTheme(theme)` com `key={theme.mode}` no `RNCalendar` (forçando re-render limpo na troca Claro/Escuro do `react-native-calendars`) e usar `useMotion()` na transição de eventos do dia.
- `CalendarSkeleton.tsx`: remover `LinearGradient`; usar `Skeleton` e `Surface`.
- `CalendarPicker.tsx`: usar `BottomSheetModal`, `ListRow` e `GoogleIcon` (em vez de `Ionicons name="logo-google"`).
- `EventItem.tsx`, `InviteUsersSection.tsx`, `EventDetails/*`, `SyncCalendarButton.tsx`: remover imports de `sharedStyles`/`eventStyles`, usar primitivos editoriais.

- [ ] **Step 3: Migrar as 5 telas em `app/(panel)/events/*`**

- Remover `LinearGradient` (`events/index.tsx`), `BackButton`, `sharedStyles`, `eventStyles`, `ConfirmDeleteModal` (substituído por `ConfirmSection`) e todos os `Alert.alert` (substituídos por `useFeedback()`).

- [ ] **Step 4: Verificar ausência de padrões legados no módulo de Eventos + testes e tipagem**

Run: `npm run typecheck && npm run test:ci` e checar zero hex hardcoded / `Alert.alert` / `LinearGradient` / `sharedStyles` / `eventStyles` / `@expo/vector-icons` / `SafeAreaView` do RN em `app/(panel)/events/`, `components/Event/`, `CalendarPicker.tsx`, `SyncCalendarButton.tsx`, `useCalendarSync.ts` e `calendarService.ts`.  
Expected: 0 ocorrências legadas, `typecheck` e `test:ci` PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(panel)/events" components/Event components/CalendarPicker.tsx components/SyncCalendarButton.tsx src/services/calendar/calendarService.ts src/hooks/useCalendarSync.ts
git commit -m "refactor(ui): migrate events, calendar theme/sync, and remove Alert.alert from calendar flow"
```

---

### Task 11: Migração do Módulo Financeiro (`app/(panel)/finances/*` e `components/Finances/*`)

**Files:**
- Modify: `app/(panel)/finances/index.tsx`
- Modify: `app/(panel)/finances/expenses/index.tsx`
- Modify: `app/(panel)/finances/expenses/create.tsx`
- Modify: `app/(panel)/finances/expenses/edit.tsx`
- Modify: `app/(panel)/finances/expenses/[id].tsx`
- Modify: `app/(panel)/finances/incomes/index.tsx`
- Modify: `app/(panel)/finances/incomes/create.tsx`
- Modify: `app/(panel)/finances/incomes/edit.tsx`
- Modify: `app/(panel)/finances/incomes/[id].tsx`
- Modify: `components/Finances/AdjustBalanceModal.tsx`
- Modify: `components/Finances/CategoryChart.tsx`
- Modify: `components/Finances/ExpenseFilters.tsx`
- Modify: `components/Finances/ExpenseItem.tsx`
- Modify: `components/Finances/FinanceItem.tsx`
- Modify: `components/Finances/FinancialSummary.tsx`
- Modify: `components/Finances/IncomeItem.tsx`
- Modify: `components/Finances/MonthlyChart.tsx`
- Modify: `components/Finances/PendingActions.tsx`
- Modify: `components/Finances/RecentTransactions.tsx`
- Modify: `components/Finances/ExpenseDetails/ExpenseReceiptModal.tsx`
- Modify: `components/Finances/ExpenseDetails/ExpenseTimeline.tsx`

**Interfaces:**
- Consumes: `createChartConfig`, `hexToRgba` (Task 2); `Screen`, `ScreenHeader`, `Surface`, `AppText` (`monoHero`/`monoValue`), `Button`, `TextField`, `Chip`, `SegmentedTabs`, `Divider`, `ListRow`, `StatusText`, `StateView`, `BottomSheetModal`, `ConfirmSection`, `useTheme`, `useFeedback` (Tasks 2, 4, 5).
- Produces: módulo financeiro completo preservando o export puro `buildExpenseTimelineSteps` em `ExpenseTimeline.tsx` (testado por `src/utils/__tests__/screenDecomposition.test.ts`).

- [ ] **Step 1: Migrar `MonthlyChart.tsx`, `CategoryChart.tsx`, `FinancialSummary.tsx` e demais `components/Finances/*`**

- `MonthlyChart.tsx`: usar `useWindowDimensions()` (limitado ao `maxWidth` do container Web), `createChartConfig(theme)` e séries usando `hexToRgba(theme.colors.danger, opacity)` e `hexToRgba(theme.colors.success, opacity)`.
- `CategoryChart.tsx`: substituir o array hardcoded `categoryColors` por `theme.colors.chartSeries` e usar `AppText` (`monoValue`) + `formatCurrency` de `src/utils/currencyUtils.ts`.
- `FinancialSummary.tsx`, `ExpenseItem.tsx`, `IncomeItem.tsx`, `FinanceItem.tsx`, `RecentTransactions.tsx`, `PendingActions.tsx`, `ExpenseFilters.tsx`, `AdjustBalanceModal.tsx`, `ExpenseDetails/*`: substituir `Alert.alert` por `useFeedback()`, usar `Surface`, `ListRow`, `Divider`, `StatusText`, `BottomSheetModal` e `monoValue`/`monoHero` para valores monetários.

- [ ] **Step 2: Migrar as 9 telas em `app/(panel)/finances/*`**

- `finances/index.tsx`: remover `LinearGradient`, usar `SegmentedTabs` para alternar `Resumo / Despesas / Receitas`, e `useFeedback()` para avisos de permissão/ação.
- `expenses/*` e `incomes/*`: substituir `BackButton`, `ConfirmDeleteModal` (por `ConfirmSection`) e todos os `Alert.alert` por `useFeedback()`, preservando o upload seguro de comprovantes via Supabase em `expenses/create.tsx`.

- [ ] **Step 3: Verificar ausência de padrões legados no módulo Financeiro + testes e tipagem**

Run: `npx jest src/utils/__tests__/screenDecomposition.test.ts --watchAll=false && npm run typecheck && npm run test:ci` e checar zero hex hardcoded / `Alert.alert` / `LinearGradient` / `@expo/vector-icons` / `SafeAreaView` do RN em `app/(panel)/finances/` e `components/Finances/`.  
Expected: 0 ocorrências legadas, todos os testes PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(panel)/finances" components/Finances
git commit -m "refactor(ui): migrate finances screens, charts, and components to Editorial design system"
```

---

## Onda 5 — Reorganização Final, Limpeza de Legado e Guardrails Automatizados

### Task 12: Reorganizar `components/`, Remover Arquivos/Dependências Legadas e Ativar `designSystemGuardrails.test.ts`

**Files:**
- Move: `components/TaskItem.tsx`, `components/TaskFilter.tsx`, `components/Task/*` → `components/tasks/`
- Move: `components/Event/*`, `components/CalendarPicker.tsx`, `components/SyncCalendarButton.tsx` → `components/events/`
- Move: `components/Finances/*` → `components/finances/`
- Move: `components/NotificationBadge.tsx`, `components/NotificationCenter.tsx`, `components/NotificationToast.tsx` → `components/notifications/`
- Modify: imports correspondentes em `app/`, `src/context/NotificationContext.tsx` e `src/utils/__tests__/screenDecomposition.test.ts`
- Delete: `src/styles/sharedStyles.tsx`, `src/styles/eventStyles.tsx`, `src/utils/animationCompat.tsx`, `components/BackButton.tsx`, `components/Task/TaskEdit/HeaderBar.tsx`, `components/common/ConfirmDeleteModal.tsx`
- Modify: `package.json` (remover `@expo/vector-icons` e `expo-linear-gradient`)
- Test: `src/design-system/__tests__/designSystemGuardrails.test.ts`

**Interfaces:**
- Consumes: toda a árvore migrada das Tasks 1–11.
- Produces: estrutura limpa `components/{tasks,events,finances,notifications}/` (zero arquivos soltos na raiz de `components/`) e suíte permanente `designSystemGuardrails.test.ts`.

- [ ] **Step 1: Escrever o teste de guardrails em `src/design-system/__tests__/designSystemGuardrails.test.ts`**

```ts
import fs from 'fs';
import path from 'path';

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('Design System architecture guardrails', () => {
  const root = path.resolve(__dirname, '../../..');
  const appAndComponents = [
    ...collectSourceFiles(path.join(root, 'app')),
    ...collectSourceFiles(path.join(root, 'components')),
  ];
  const allSrc = [...appAndComponents, ...collectSourceFiles(path.join(root, 'src'))];
  const rel = (p: string) => path.relative(root, p).replace(/\\/g, '/');

  it('has zero hardcoded hex colors outside palette.ts and BrandIcons.tsx', () => {
    const offenders = allSrc.filter((f) => {
      const r = rel(f);
      if (r === 'src/design-system/tokens/palette.ts' || r === 'src/design-system/primitives/BrandIcons.tsx') {
        return false;
      }
      return /#[0-9a-fA-F]{3,8}\b/.test(fs.readFileSync(f, 'utf8'));
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  it('has zero hardcoded rgba() outside src/design-system/tokens and src/design-system/theme', () => {
    const offenders = allSrc.filter((f) => {
      const r = rel(f);
      if (r.startsWith('src/design-system/tokens/') || r.startsWith('src/design-system/theme/')) return false;
      return /rgba\s*\(/.test(fs.readFileSync(f, 'utf8'));
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  it('never imports SafeAreaView from react-native', () => {
    const offenders = allSrc.filter((f) => {
      const content = fs.readFileSync(f, 'utf8');
      return /import\s*\{[^}]*\bSafeAreaView\b[^}]*\}\s*from\s*['"]react-native['"]/.test(content);
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  it('centralizes <StatusBar> strictly inside ThemeContext.tsx', () => {
    const offenders = allSrc.filter((f) => {
      const r = rel(f);
      if (r === 'src/design-system/theme/ThemeContext.tsx') return false;
      return /<StatusBar\b/.test(fs.readFileSync(f, 'utf8'));
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  it('has zero Alert.alert calls across app/, components/, and src/', () => {
    const offenders = allSrc.filter((f) => /\bAlert\.alert\s*\(/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('bans legacy style/icon/gradient/animation imports and removes legacy files', () => {
    const bannedImport = /(sharedStyles|eventStyles|animationCompat|@expo\/vector-icons|expo-linear-gradient)/;
    const offenders = allSrc.filter((f) => bannedImport.test(fs.readFileSync(f, 'utf8')));
    expect(offenders.map(rel)).toEqual([]);

    for (const removed of [
      'src/styles/sharedStyles.tsx',
      'src/styles/eventStyles.tsx',
      'src/utils/animationCompat.tsx',
      'components/BackButton.tsx',
      'components/Task/TaskEdit/HeaderBar.tsx',
      'components/tasks/TaskEdit/HeaderBar.tsx',
      'components/common/ConfirmDeleteModal.tsx',
    ]) {
      expect(fs.existsSync(path.join(root, removed))).toBe(false);
    }

    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@expo/vector-icons']).toBeUndefined();
    expect(pkg.dependencies['expo-linear-gradient']).toBeUndefined();

    const rootComponentFiles = fs
      .readdirSync(path.join(root, 'components'), { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name);
    expect(rootComponentFiles).toEqual([]);
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar que detecta arquivos/pastas legados antes da limpeza**

Run: `npx jest src/design-system/__tests__/designSystemGuardrails.test.ts --watchAll=false`  
Expected: FAIL (arquivos legados e arquivos soltos na raiz de `components/` ainda existem).

- [ ] **Step 3: Reorganizar `components/`, excluir arquivos legados e desinstalar `@expo/vector-icons` e `expo-linear-gradient`**

- Mover componentes de domínio para `components/{tasks,events,finances,notifications}/` (em `git mv` atento a maiúsculas/minúsculas no Windows via renomeação em 2 etapas `Task` -> `tasks_tmp` -> `tasks`, `Event` -> `events_tmp` -> `events`, `Finances` -> `finances_tmp` -> `finances`!) e atualizar todos os imports (incluindo `src/utils/__tests__/screenDecomposition.test.ts`).
- Excluir `src/styles/sharedStyles.tsx`, `src/styles/eventStyles.tsx`, `src/utils/animationCompat.tsx`, `components/BackButton.tsx`, `components/Task/TaskEdit/HeaderBar.tsx` (ou `components/tasks/TaskEdit/HeaderBar.tsx`) e `components/common/ConfirmDeleteModal.tsx`.
- Remover `@expo/vector-icons` e `expo-linear-gradient`: `npm uninstall @expo/vector-icons expo-linear-gradient` (se alguma dependência transitiva em `node_modules` ainda resolver sem quebrar o Metro/Jest, confirmar rodando a suíte completa).

- [ ] **Step 4: Verificação final completa (guardrails + toda a suíte + TypeScript)**

Run: `npm run typecheck && npm run test:ci`  
Expected: PASS com exit code `0` em todos os testes (incluindo `contrast.test.ts`, `ThemeContext.test.tsx`, `useMotion.test.ts`, `brandConfig.test.ts`, `primitives.test.tsx`, `FeedbackContext.test.tsx`, `appearanceScreen.test.tsx`, `designSystemGuardrails.test.ts`, `envSecurity.test.ts`, `screenDecomposition.test.ts` e `AuthContext.test.tsx`).

- [ ] **Step 5: Commit**

```bash
git add -A app components src package.json package-lock.json
git commit -m "refactor(design-system): reorganize domain components, remove legacy styles/deps, and enable guardrails"
```
