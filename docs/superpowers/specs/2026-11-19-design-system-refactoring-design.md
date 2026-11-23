# Design Spec: Design System & Refresh Visual "Editorial de Convivência" (`rep-helper-frontend`)

**Data:** 2026-11-19  
**Linguagem Visual:** Editorial de Convivência (Tema Claro + Escuro + Seguir Sistema)  
**Abordagem Técnica:** Design System Tipado Nativo (`StyleSheet` + `ThemeProvider` + `FeedbackProvider` + `createThemedStyles`) + Fontes Expo + `lucide-react-native`

---

## 1. Intent & Why

O `rep-helper-frontend` (React Native / Expo Router em TypeScript) está em sua primeira versão (`v1`) e passou recentemente por refatorações estruturais de qualidade de código e hardening de segurança, mas sua camada de interface cresceu sem um design system unificado.

### Diagnóstico do Estado Atual
Auditoria realizada nos **85 arquivos de UI** (`app/`, `components/`, `src/styles/`):
- **Tokens e estilos fragmentados:** **1.617 cores hex** e **178 `rgba()`** hardcoded espalhadas pelas telas, com **16 tamanhos de fonte** distintos (`8` a `38`), **22 raios de borda** distintos (`1` a `75`) e **50 blocos `Platform.select` de sombra** duplicados.
- **Baixa adoção da camada compartilhada:** `src/styles/sharedStyles.tsx` é importado por apenas **10 arquivos** (e `src/styles/eventStyles.tsx` por **3**), mistura tokens com estilos de tela e hardcodes acima do próprio objeto `colors`.
- **Ausência de biblioteca de primitivos:** `components/` concentra componentes de domínio e 8 arquivos soltos na raiz; botões, inputs, headers, modais, badges, estados de loading/vazio/erro e listas são duplicados tela a tela.
- **Feedback inconsistente e incompatível com Web:** **169 chamadas `Alert.alert`** espalhadas em **31 arquivos** (incluindo `src/utils/errorHandling.ts`), onde botões de confirmação não funcionam corretamente em `react-native-web` e o visual foge do tema.
- **Inconsistências estruturais, nativas e de acessibilidade:** **29 arquivos** importam `SafeAreaView` diretamente do `react-native` (sem efeito no Android), **49 `<StatusBar>`** competem com cores conflitantes (`#222` vs `#333`), **5 famílias de ícones** se misturam (`Ionicons`, `MaterialCommunityIcons`, `FontAwesome5`, `MaterialIcons`, `Feather`), apenas **15 ocorrências** de `accessibilityLabel` existem para **229 `TouchableOpacity`**, `android/app/src/main/res/values/styles.xml` fixa `Theme.AppCompat.Light.NoActionBar` (travando pickers/diálogos nativos no claro) e todos os PNGs de marca em `assets/images/` são quadrados roxos `#7B68EE`.
- **Movimento e decoração sem propósito:** `src/utils/animationCompat.tsx` implementa shims quebrados com `useNativeDriver: false`; `app/(panel)/home.tsx` anima `headerHeight` na thread JS; `components/NotificationToast.tsx` aplica `LinearGradient`, spring elástico e `pulseAnim`; 6 arquivos usam `LinearGradient` decorativo.

### Motivação
Construir um **design system consistente** que eleve a **qualidade de código da camada de UI**, aproveitando que o app está na `v1` (sem restrição de regressão visual e podendo adotar novas dependências compatíveis) para entregar uma identidade visual autoral, acessível e funcional em **Tema Claro e Escuro** em Android, iOS e Web.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- Estabelecer a linguagem visual **Editorial de Convivência** cobrindo 4 pilares: tipografia adequada ao contexto, regras explícitas de cor/tema (Claro + Escuro + Sistema), movimento com finalidade (`Reduce Motion`) e composição limpa por camadas tonais e divisórias de `1px`.
- Garantir contraste mínimo **WCAG 2.1 AA** (`>= 4.5:1` para textos normais e `>= 3.0:1` para bordas/componentes interativos) matematicamente validado por testes automatizados em ambos os temas.
- Criar `src/design-system/` como única fonte de verdade para tokens, tema dinâmico, feedback global (`Toast` + `ConfirmDialog`), adaptadores de bibliotecas de terceiros (`react-native-calendars` e `react-native-chart-kit`), movimento e **primitivos de UI acessíveis**.
- Permitir ao usuário alternar entre **Claro**, **Escuro** e **Seguir o sistema** em **Configurações > Aparência**, com aplicação imediata e persistência local em `AsyncStorage`.
- Substituir **todos os 169 `Alert.alert`** (31 arquivos + `src/utils/errorHandling.ts`) por `useFeedback()` (`toast` para avisos/sucesso/erro e `confirm` via `ConfirmDialog`/`BottomSheetModal` para confirmações) + validação inline em `TextField`, garantindo paridade total no Expo Web.
- Unificar iconografia em `lucide-react-native` (com `BrandIcons.tsx` em `react-native-svg` para marcas de terceiros: Google e Instagram), centralizar `StatusBar` e `SafeAreaView` (`react-native-safe-area-context`), unificar headers de `settings/` em `ScreenHeader` e embutir acessibilidade (`accessibilityRole`, `accessibilityLabel`, área mínima de toque `44×44`, `allowFontScaling`) nos primitivos.
- Atualizar os assets binários de marca (`assets/images/*.png` e `android/app/src/main/res/drawable-*/splashscreen_logo.png`) e os XMLs nativos de tema/splash do Android (`DayNight`) cirurgicamente sem regenerar `android/`.
- Migrar todos os layouts, telas e componentes em **ondas incrementais**, eliminando `src/styles/sharedStyles.tsx`, `src/styles/eventStyles.tsx`, `src/utils/animationCompat.tsx`, `components/BackButton.tsx`, `components/Task/TaskEdit/HeaderBar.tsx` e `components/common/ConfirmDeleteModal.tsx`.
- Proteger a arquitetura com **testes Jest de guardrail** impedindo reintrodução de cores hardcoded, `Alert.alert`, `SafeAreaView` legado, `@expo/vector-icons` e `LinearGradient`.

### Non-Goals
- Alterar contratos de API REST, regras de negócio, schemas Zod, modelos de dados, rotas do Expo Router ou a separação `UI -> Hooks -> Services`.
- Sincronizar a preferência de tema no backend (na `v1`, persistência local via `AsyncStorage` é suficiente; sincronização remota fica fora de escopo).
- Implementar reordenação de cards do Dashboard (`[UC16]` item 2) ou sidebar dedicada de desktop (`[RI002]`) — na Web, o primitivo `Screen` centraliza o conteúdo em largura confortável (`maxWidth`), mantendo a estrutura atual de navegação (`Tabs` + `Stack`).
- Atualizar versão major do Expo SDK 52 ou introduzir compiladores/bundlers CSS (NativeWind/Tamagui).
- Executar `expo prebuild --clean` (que sobrescreveria o hardening de segurança nativo validado em `src/utils/__tests__/envSecurity.test.ts`).

### Anti-Goals
- Recorrer a ornamentos ou clichês visuais sem função (gradientes decorativos, sombras pesadas em todo card, pílulas translúcidas para qualquer texto, animações contínuas ou elásticas).
- Desabilitar `allowFontScaling` globalmente ou ignorar `AccessibilityInfo.isReduceMotionEnabled()`.
- Quebrar compatibilidade com **Android, iOS, Expo Web (`react-native-web`)**, `metro.config.js` otimizado para Windows, `jest-expo` ou os testes de segurança nativos (`envSecurity.test.ts`).
- Criar abstrações excessivas que dificultem a leitura direta dos estilos ou atrasem manutenção futura.

---

## 3. Constraints

- **Stack e Compatibilidade:** Expo `~52.0.42`, React Native `0.76.8`, React `18.3.1`, Expo Router `~4.0.19`, TypeScript `~5.3.3` (`strict: true`), Jest (`jest-expo@~52.0.6`).
- **Plataformas:** Android, iOS e Expo Web (`react-native-web`) devem funcionar sem regressões.
- **Novas Dependências de Produção (escopo fechado):**
  - `@expo-google-fonts/source-serif-4`
  - `@expo-google-fonts/ibm-plex-sans`
  - `@expo-google-fonts/ibm-plex-mono`
  - `lucide-react-native` *(reutiliza `react-native-svg@15.8.0` já presente no projeto)*
  - Nenhuma dependência que exija alteração em `babel.config.js` ou plugins customizados no `metro.config.js`.
- **Dependências a remover na Onda 5:** `@expo/vector-icons` e `expo-linear-gradient` (após migração de todos os arquivos e verificação de que nenhuma dependência transitiva exige import direto).
- **Idioma:** Todos os textos visíveis, rótulos de acessibilidade e opções de tema em **Português (`pt-BR`)**.
- **Configuração Expo e Android Nativo:**
  - Alinhar `app.json` (corrigindo também os caminhos quebrados `./assets/*.png` para `./assets/images/*.png`) e `app.config.js` para `userInterfaceStyle: "automatic"` e `splash.backgroundColor: "#F5F2EB"`.
  - Editar cirurgicamente `android/app/src/main/res/values/styles.xml` (`Theme.AppCompat.DayNight.NoActionBar`), `values/colors.xml` (`#F5F2EB` / `#1F4AA8`) e `values-night/colors.xml` (`#151412` / `#7EA4FF`), preservando integralmente `AndroidManifest.xml`, `build.gradle` e `gradle.properties` testados por `envSecurity.test.ts`.
- **Verificação Obrigatória:** `npm run typecheck` e `npm run test:ci` com exit code `0` ao final de cada onda.

---

## 4. Approaches Considered

1. **Abordagem A — Design System Tipado Nativo (`StyleSheet` + `ThemeProvider` + `createThemedStyles`) + Fontes Expo + `lucide-react-native` *(Escolhida)*:**
   - *Trade-offs:* zero risco no `metro.config.js` (otimizado para Windows), `babel.config.js` e `jest-expo`; tipagem `strict` total; compatível diretamente com adaptadores programáticos de `react-native-calendars` e `react-native-chart-kit`; longevidade sem lock-in. Exige escrever e testar ~19 primitivos/provedores sob medida.
2. **Abordagem B — `@shopify/restyle` + Fontes Expo + `lucide-react-native` *(Descartada)*:**
   - *Trade-offs:* garante tokens via props tipadas em compile-time (`<Box padding="md" />`), mas introduz DSL própria (`createBox`/`createVariant`) e ainda exige `useTheme()` tradicional em componentes de terceiros e `Animated`.
3. **Abordagem C — `NativeWind v4` + CSS Variables *(Descartada)*:**
   - *Trade-offs:* agilidade de escrita com utilitários Tailwind, mas exige alterar `metro.config.js`, `babel.config.js` e `jest-expo` (maior risco no ambiente Windows + SDK 52) e oferece menos rigor de tipagem estática do que tokens TypeScript.
4. **Bibliotecas opinativas — Tamagui, Gluestack, React Native Paper *(Descartadas)*:**
   - *Trade-offs:* alto peso de configuração/runtime e linguagem visual opinativa que conflita com a estética editorial proposta.

---

## 5. Especificação da Linguagem Visual: "Editorial de Convivência"

### 5.1 Tipografia (Personalidade + Eficiência + Desempenho)
Selecionada pelo equilíbrio entre acolhimento editorial (identidade de vida em república) e alta legibilidade em uso diário frequente (finanças, tarefas, formulários e textos em `pt-BR` com acentuação clara):

- **Famílias e pesos carregados** *(conjunto enxuto de 8 arquivos de fonte para preservar tempo de boot)*:
  - **Títulos expressivos:** `SourceSerif4_600SemiBold` *(reservado exclusivamente para nome da república, título principal de tela e títulos de destaque — nunca em botões, inputs ou listas densas)*.
  - **Interface e leitura:** `IBMPlexSans_400Regular`, `IBMPlexSans_500Medium`, `IBMPlexSans_600SemiBold`, `IBMPlexSans_700Bold`.
  - **Dados numéricos e metadados tabulares:** `IBMPlexMono_400Regular`, `IBMPlexMono_500Medium`, `IBMPlexMono_600SemiBold` *(sempre com `fontVariant: ['tabular-nums']` para alinhamento perfeito de `R$`, datas curtas e códigos de convite)*.
- **Carregamento e fallback:** Carregadas via `useFonts` em `app/_layout.tsx` antes de `SplashScreen.hideAsync()`. Em caso de erro de carregamento de fonte ou ambiente de teste, degradam com segurança para `serif` / `System` / `monospace`.
- **Escala tipográfica fechada (9 variantes semânticas, eliminando os 16 `fontSize` soltos):**

| Variante | Família / Peso | Size / LineHeight | Tracking | Uso principal |
|---|---|---|---|---|
| `display` | `SourceSerif4_600SemiBold` | `28 / 34` | `-0.3` | Título hero (Auth, boas-vindas, nome da república) |
| `title` | `SourceSerif4_600SemiBold` | `22 / 28` | `-0.2` | Cabeçalho principal de telas (`ScreenHeader`) |
| `heading` | `IBMPlexSans_600SemiBold` | `18 / 24` | `-0.1` | Títulos de seção, cabeçalhos compactos, títulos de modal |
| `body` | `IBMPlexSans_400Regular` | `15 / 22` | `0` | Texto padrão, descrições, inputs |
| `bodyStrong` | `IBMPlexSans_600SemiBold` | `15 / 22` | `0` | Títulos de linha, labels de botão, ênfase inline |
| `caption` | `IBMPlexSans_400Regular` / `500` | `13 / 18` | `0` | Metadados, subtítulos, mensagens auxiliares/erro |
| `monoLabel` | `IBMPlexMono_500Medium` | `12 / 16` | `+0.6` | Rótulos de seção em caixa-alta (`ESCALA`, `CAIXA`, datas curtas) |
| `monoValue` | `IBMPlexMono_600SemiBold` | `16 / 22` | `-0.2` | Valores em `R$`, contadores em listas |
| `monoHero` | `IBMPlexMono_600SemiBold` | `26 / 32` | `-0.4` | Saldo principal do caixa da república |

- **Acessibilidade tipográfica:** `allowFontScaling` permanece ativo (`true`) em todo `AppText`; apenas elementos estruturais de altura fixa (ex.: labels da tab bar) aplicam `maxFontSizeMultiplier={1.3}` para evitar corte.

### 5.2 Cores, Temas e Regras de Uso (Claro + Escuro)
Paleta matematicamente validada para **WCAG 2.1 AA**: todos os pares de texto sobre `bg`, `surface` e `subtle` atingem **`>= 4.5:1`** (entre `4.64:1` e `16.79:1`), e **`borderStrong`** atinge **`>= 3.0:1`** em todas as 3 superfícies (`3.33:1`–`4.03:1` no claro; `3.17:1`–`3.86:1` no escuro):

| Token Semântico | Tema Claro (`light`) | Tema Escuro (`dark`) | Papel e Regra de Uso |
|---|---|---|---|
| `bg` | `#F5F2EB` | `#151412` | Fundo principal de todas as telas (neutro quente de papel / carvão quente) |
| `surface` | `#FDFCF9` | `#1E1D1A` | Camada de conteúdo: bloco de resumo, formulário, tab bar, cabeçalho, modal |
| `subtle` | `#EBE6DC` | `#282622` | Superfície secundária: fundo de segmented control, chips inativos, avatar neutro |
| `ink` | `#1C1B18` | `#EDEAE2` | Texto principal e ícones ativos de leitura (`> 12.5:1`) |
| `inkSecondary` | `#524E45` | `#B2ACA0` | Texto secundário, subtítulos, descrições (`>= 6.6:1`) |
| `inkMuted` | `#635E54` | `#948E82` | Metadados, placeholders, rótulos `monoLabel`, ícones inativos (`>= 4.64:1`) |
| `line` | `#DCD6C8` | `#302D27` | Divisórias decorativas de `1px` em listas, cabeçalhos e bordas de `Surface` |
| `borderStrong` | `#837C6E` | `#787268` | Bordas de controles interativos (`TextField`, botão `secondary`, checkbox; `>= 3.17:1`) |
| `accent` | `#1F4AA8` | `#7EA4FF` | **Cor única de ação:** CTA primário, foco de input, aba ativa, link (`>= 6.2:1`) |
| `onAccent` | `#FFFFFF` | `#0F1524` | Texto/ícone sobre fundo `accent` (`8.07:1` claro / `7.49:1` escuro) |
| `accentSoft` | `#E7EEFA` | `rgba(126, 164, 255, 0.16)` | Fundo discreto para seleção ativa (chip selecionado, dia de hoje no calendário) |
| `success` | `#24633A` | `#6ED090` | Receitas, mensalidade paga, tarefa concluída, presença confirmada (`>= 5.78:1`) |
| `successSoft` | `#E4F2E9` | `rgba(110, 208, 144, 0.15)` | Realce pontual em resumo ou confirmação |
| `warning` | `#8F5400` | `#F2B84B` | Pendências, aprovações aguardando, prazos próximos (`>= 4.91:1`) |
| `warningSoft` | `#F8EED8` | `rgba(242, 184, 75, 0.15)` | Realce pontual de pendência |
| `danger` | `#B3261E` | `#F27B72` | Despesas, tarefas atrasadas, erros de validação, ações destrutivas (`>= 5.26:1`) |
| `onDanger` | `#FFFFFF` | `#151412` | Texto/ícone sobre botão destrutivo (`6.54:1` claro / `6.88:1` escuro) |
| `dangerSoft` | `#F9E4E2` | `rgba(242, 123, 114, 0.15)` | Alerta de erro inline / fundo de aviso destrutivo |
| `overlay` | `rgba(28, 27, 24, 0.45)` | `rgba(0, 0, 0, 0.65)` | Backdrop de modais e sheets |

- **Paleta editorial para gráficos (`chartSeries`, 6 cores distintas e harmonizadas):**
  - Claro: `['#1F4AA8', '#B35C1E', '#24633A', '#7A3E8F', '#8F5400', '#3F6C7A']`
  - Escuro: `['#7EA4FF', '#F09B64', '#6ED090', '#C695E0', '#F2B84B', '#7BC0D4']`
- **Regras explícitas de uso de cor (disciplina 80 / 15 / 5):**
  1. **80% neutros (`bg`/`surface`/`subtle`), 15% tipografia (`ink*`), 5% `accent` e semânticas.**
  2. **No máximo 1 botão primário sólido (`accent`) por tela ou modal;** demais ações (incluindo login com Google em `sign-in.tsx`) usam variante `secondary` (contorno `borderStrong`), `ghost` ou `danger`.
  3. **Status sem pílulas por padrão:** estados operacionais (ex.: `pago`, `hoje`, `atrasado`, `pendente`) são comunicados com `StatusText` (texto em `monoLabel` na cor semântica, opcionalmente acompanhado de um ponto de `6px` ou ícone discreto). Tarefas concluídas usam `textDecorationLine: 'line-through'` e cor `inkMuted`.
  4. **Nenhuma tela define cor literal** — toda cor vem de `useTheme().colors` ou `createThemedStyles`.

### 5.3 Movimento com Finalidade
Todo movimento existe apenas para esclarecer mudança de estado, dar feedback de ação ou orientar continuidade espacial:

- **Tokens de movimento (`src/design-system/tokens/motion.ts`):**
  - `duration`: `fast: 140`, `normal: 180`, `slow: 240` (ms).
  - `easing`: `standard = Easing.out(Easing.cubic)`, `exit = Easing.in(Easing.cubic)`.
  - `pressOpacity: 0.78`, `pressScale: 0.985`.
- **Respeito obrigatório a `Reduce Motion` (`src/design-system/motion/useMotion.ts`):**
  - Consulta `AccessibilityInfo.isReduceMotionEnabled()` na montagem e assina `AccessibilityInfo.addEventListener('reduceMotionChanged', ...)`.
  - Quando `reduceMotion === true`: deslocamentos (`translateY`/`translateX`/`scale`) são desligados, `duration(ms)` retorna `0` (ou fade mínimo de `80ms` apenas para suavizar entrada/saída de modal/toast) e animações de `Skeleton` ficam estáticas.
- **Onde o movimento É aplicado:**
  - Feedback de toque sutil em `Button`, `IconButton` e `ListRow` (`Pressable` com feedback visual limpo, substituindo `TouchableOpacity` espalhados).
  - Conclusão de tarefa (transição curta `160ms` de checkbox + opacidade/risco) e confirmação de envio de formulário (estado `loading` no botão + `toast` de confirmação via `useFeedback()`).
  - Entrada e saída de `BottomSheetModal`, `ConfirmDialog` e `Toast` (`translateY` + `opacity`, `180ms`, `useNativeDriver: true`).
  - Indicador de aba ativa em `SegmentedTabs` e expansão controlada de filtros/seções.
  - Feedback tátil opcional (`expo-haptics`, já instalado) apenas em ações de confirmação crítica (concluir tarefa, confirmar pagamento/exclusão), com no-op seguro na Web.
- **Onde o movimento é REMOVIDO:**
  - Remoção da animação JS de `headerHeight` em `app/(panel)/home.tsx` (`useNativeDriver: false`).
  - Remoção de `pulseAnim` contínuo e spring elástico em `components/NotificationToast.tsx`.
  - Remoção completa de `src/utils/animationCompat.tsx`.

### 5.4 Fundos, Composição, Espaçamento, Iconografia e Assets de Marca
- **Profundidade sem clichês:**
  - Hierarquia criada por **camadas tonais** (`bg` → `surface` → `subtle`) e **divisórias nítidas de `1px`** (`line`).
  - Listas de itens (tarefas, despesas, receitas, membros, configurações) usam **linhas contínuas separadas por `Divider` (`1px`)** sobre `surface` ou `bg`, eliminando a repetição de cards com sombra pesada por item.
  - Contêineres com borda `1px` (`Surface`) ficam reservados a blocos de resumo (ex.: Caixa da Casa), seções agrupadas de formulário e alertas.
  - **Remoção de `LinearGradient`** nos 6 arquivos que o usam hoje como fundo decorativo.
- **Escala de espaçamento (`spacing` — grid de 4pt/8pt):** `xxs: 4`, `xs: 8`, `sm: 12`, `md: 16`, `lg: 20`, `xl: 24`, `xxl: 32`, `xxxl: 40`.
- **Escala de raios (`radius` — 5 valores fixos substituindo 22 soltos):** `none: 0`, `sm: 6` (inputs, botões, checkboxes), `md: 10` (blocos/cards de resumo, segmented control), `lg: 16` (modais/bottom sheets), `full: 9999` (avatares, indicadores circulares).
- **Elevação (`elevation` — apenas 2 níveis):** `none` (padrão) e `floating` (sombra sutil multi-plataforma usada exclusivamente em `BottomSheetModal`, `ConfirmDialog`, `Toast`, menus flutuantes e FAB).
- **Iconografia unificada:**
  - `lucide-react-native` com `strokeWidth={1.75}` e tamanhos fixos `sm: 16`, `md: 20`, `lg: 24` para toda a UI.
  - `src/design-system/primitives/BrandIcons.tsx` (`react-native-svg`) para marcas de terceiros não fornecidas pelo Lucide: `GoogleIcon` (monocromático em `ink` ou 4 cores oficiais isoladas como exceção documentada dentro de `BrandIcons.tsx`, exibido em botão `secondary` em `sign-in.tsx` e em `CalendarPicker.tsx`) e `InstagramIcon` (em `ink`, usado em `settings/about.tsx`).
- **Assets binários de marca (atualizados na nova identidade):**
  - Regenerar `assets/images/icon.png` (`1024×1024`), `assets/images/adaptive-icon.png` (`1024×1024`), `assets/images/splash-icon.png`, `assets/images/favicon.png` e `android/app/src/main/res/drawable-{mdpi,hdpi,xhdpi,xxhdpi}/splashscreen_logo.png` trocando o roxo `#7B68EE` pelo monograma editorial **"RH"** em azul-cobalto `#1F4AA8` sobre fundo papel `#F5F2EB` (e variante invertida/transparente no foreground do splash para funcionar nos modos Claro e Escuro).
  - Corrigir os caminhos em `app.json` (`./assets/*.png` → `./assets/images/*.png`).
- **Layout Web/Desktop:** O primitivo `Screen` centraliza o conteúdo em `maxWidth: 720` (ou `960` quando `width="wide"` em dashboards) em telas largas (`>= 768px`), mantendo margens laterais consistentes (`16px` no mobile).

---

## 6. Arquitetura e Fronteiras de Módulo

### 6.1 Estrutura de `src/design-system/`
```text
src/design-system/
├── index.ts                      # Barrel público único
├── tokens/
│   ├── palette.ts                # Paleta bruta (único arquivo autorizado a conter hex)
│   ├── typography.ts             # Font families, variantes semânticas e line-heights
│   ├── spacing.ts                # Grid 4pt/8pt
│   ├── radius.ts                 # Raios fechados (0, 6, 10, 16, 9999)
│   ├── elevation.ts              # none / floating (iOS, Android e Web)
│   └── motion.ts                 # Durações, easings e fatores de toque
├── theme/
│   ├── types.ts                  # Tipos Theme, ThemeMode ('light' | 'dark' | 'system'), ResolvedTheme
│   ├── lightTheme.ts             # Mapeamento semântico Claro
│   ├── darkTheme.ts              # Mapeamento semântico Escuro
│   ├── ThemeContext.tsx          # Provider + persistência AsyncStorage + sync StatusBar & SystemUI
│   ├── useTheme.ts               # Hook de consumo do tema e controle de preferência
│   ├── createThemedStyles.ts     # Factory memoizada por tema: useThemedStyles(makeStyles)
│   └── adapters/
│       ├── calendarTheme.ts      # Tema dinâmico para react-native-calendars
│       └── chartTheme.ts         # chartConfig e chartSeries dinâmicos para react-native-chart-kit
├── feedback/
│   ├── FeedbackContext.tsx       # Provider global: fila de Toast + ConfirmDialog imperativo (Promise<boolean>)
│   └── useFeedback.ts            # Hook { toast, confirm } (substitui Alert.alert em todas as telas)
├── motion/
│   └── useMotion.ts              # Hook de Reduce Motion + helpers de timing seguro
├── primitives/
│   ├── Screen.tsx                # SafeAreaView (safe-area-context) + Scroll opcional + maxWidth Web + KeyboardAvoiding
│   ├── ScreenHeader.tsx          # Cabeçalho unificado (título serif/sans, botão voltar >=44x44, ações à direita)
│   ├── AppText.tsx               # Texto tipado por variante semântica + cor do tema + allowFontScaling
│   ├── Button.tsx                # Variantes: primary | secondary | ghost | danger; tamanhos md | sm; loading; ícone
│   ├── IconButton.tsx            # Botão de ícone acessível com alvo mínimo 44x44 e hitSlop
│   ├── BrandIcons.tsx            # Ícones SVG de terceiros (GoogleIcon, InstagramIcon)
│   ├── TextField.tsx             # Label + input + foco em accent + erro inline + senha/clear + multiline
│   ├── Surface.tsx               # Contêiner tonal (bg | surface | subtle) com borda 1px opcional
│   ├── Divider.tsx               # Linha 1px (horizontal/vertical, inset opcional)
│   ├── ListRow.tsx               # Linha de lista editorial (leading, título, subtítulo, trailing, onPress, divider)
│   ├── StatusText.tsx            # Indicador semântico editorial (neutral | accent | success | warning | danger)
│   ├── Chip.tsx                  # Filtro/seleção (inativo em subtle, ativo em accentSoft + borda accent)
│   ├── SegmentedTabs.tsx         # Alternância de abas internas com indicador animado (respeitando Reduce Motion)
│   ├── Avatar.tsx                # Foto com fallback de iniciais sobre subtle/accentSoft
│   ├── StateView.tsx             # Estados unificados: loading | empty | error (com ação de tentar novamente)
│   ├── Skeleton.tsx              # Placeholder tonal com pulso opcional (!reduceMotion)
│   ├── BottomSheetModal.tsx      # Modal acessível sobre overlay + surface + animação segura
│   ├── ConfirmDialog.tsx         # Diálogo de confirmação acessível (título, mensagem, confirmar/cancelar, variante danger)
│   ├── ConfirmSection.tsx        # Seção inline destrutiva (substitui ConfirmDeleteModal.tsx em telas de detalhe)
│   └── Toast.tsx                 # Notificação editorial sem gradiente, respeitando safe area e Reduce Motion
└── __tests__/
    ├── contrast.test.ts          # Valida WCAG 2.1 AA (>= 4.5:1 texto e >= 3.0:1 borderStrong) em Claro e Escuro
    ├── ThemeContext.test.tsx     # Persistência AsyncStorage, modo 'system', alternância imediata
    ├── FeedbackContext.test.tsx  # toast(), confirm() resolvendo true/false, integração com ErrorHandler
    ├── useMotion.test.ts         # Respeito a AccessibilityInfo.isReduceMotionEnabled()
    ├── primitives.test.tsx       # Renderização, estados e props de acessibilidade dos primitivos
    └── designSystemGuardrails.test.ts # Ativado na Onda 5: bloqueia legados, hex soltos e Alert.alert
```

### 6.2 Integração no Root Layout, `ErrorHandler` e Tela de Aparência
- **`app/_layout.tsx`:** Carrega as 8 fontes Google (`useFonts`) junto com a inicialização atual; envolve a árvore com `ThemeProvider` e `FeedbackProvider` (dentro de `SafeAreaProvider`), mantendo `SplashScreen` até fontes + preferência inicial de tema estarem prontas.
- **`ThemeProvider`:**
  - Chave `AsyncStorage`: `'@rephelper:theme_preference'` com valores `'light' | 'dark' | 'system'` (padrão `'system'`).
  - Renderiza o único `<StatusBar>` global sincronizado (`dark-content` no claro, `light-content` no escuro, fundo `theme.colors.bg`) e atualiza `SystemUI.setBackgroundColorAsync(theme.colors.bg)` (guardado para plataformas nativas).
- **`FeedbackProvider` & `src/utils/errorHandling.ts`:**
  - `useFeedback()` expõe:
    - `toast({ title, message?, tone?: 'info' | 'success' | 'warning' | 'danger', duration? })` — usado para confirmações de formulário, avisos informativos e erros de operação.
    - `confirm({ title, message, confirmLabel?, cancelLabel?, destructive? }): Promise<boolean>` — renderiza `ConfirmDialog` sobre `BottomSheetModal`, funcionando de forma idêntica em Android, iOS e Web.
  - `ErrorHandler` ganha `registerToastHandler(handler)` (mesmo padrão de `setUnauthorizedHandler` em `api.ts`), registrado automaticamente na montagem de `FeedbackProvider` — eliminando `Alert.alert` dentro de `src/utils/errorHandling.ts`.
- **Configuração pelo Usuário (`app/(panel)/settings/appearance.tsx`):**
  - Item **"Aparência"** adicionado na seção "Aplicativo" de `app/(panel)/settings/index.tsx` e registrado em `app/(panel)/settings/_layout.tsx`.
  - Permite selecionar entre **Claro**, **Escuro** e **Seguir padrão do sistema**, com prévia visual instantânea (usando os próprios primitivos do app) e aplicação imediata sem reiniciar.
- **Unificação de Headers em `app/(panel)/settings/_layout.tsx`:**
  - Passa a usar `headerShown: false` (alinhado aos outros 5 stacks do app), e todas as subtelas de configurações (incluindo `appearance.tsx`) passam a usar `ScreenHeader`, eliminando os títulos duplicados presentes hoje em 5 telas (`about`, `help`, `privacy-policy`, `software-licenses`, `terms-of-use`) e alinhando a largura `maxWidth: 720` na Web.

### 6.3 Reorganização de `components/`
- Primitivos agnósticos de domínio vivem exclusivamente em `src/design-system/primitives/` (importados via `@/src/design-system`).
- `components/` passa a conter **apenas componentes de domínio ou compostos específicos do RepHelper**, eliminando os arquivos soltos da raiz:
  - `components/tasks/` ← `TaskItem.tsx`, `TaskFilter.tsx` + `Task/TaskDetails/` + `Task/TaskEdit/` *(removendo `HeaderBar.tsx` após migração para `ScreenHeader`)*.
  - `components/events/` ← `Event/*` + `CalendarPicker.tsx` + `SyncCalendarButton.tsx`.
  - `components/finances/` ← `Finances/*`.
  - `components/notifications/` ← `NotificationBadge.tsx`, `NotificationCenter.tsx`, `NotificationToast.tsx` *(este último delegando visualmente a `Toast` do design system)*.
  - Removidos na limpeza final: `components/BackButton.tsx`, `components/common/ConfirmDeleteModal.tsx` (substituído por `ConfirmSection`), `src/styles/sharedStyles.tsx`, `src/styles/eventStyles.tsx`, `src/utils/animationCompat.tsx`.

---

## 7. Ondas de Migração (Estratégia Incremental)

Cada onda produz o app compilando (`npm run typecheck`) e passando em todos os testes (`npm run test:ci`):

1. **Onda 1 — Fundação, Tokens, Tema, Movimento e Assets de Marca:**
   - Instalar fontes (`@expo-google-fonts/*`) e `lucide-react-native`.
   - Criar `tokens/`, `theme/` (incluindo adaptadores `calendarTheme` e `chartTheme`) e `motion/useMotion.ts`.
   - Integrar fontes e `ThemeProvider` em `app/_layout.tsx`; alinhar `app.json` (incluindo caminhos `./assets/images/*.png`) e `app.config.js`; aplicar edição cirúrgica de tema `DayNight` e cores Claro/Escuro em `android/app/src/main/res/values*/`.
   - Regenerar os assets binários (`assets/images/icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png` e `android/app/src/main/res/drawable-*/splashscreen_logo.png`) na identidade `#1F4AA8` / `#F5F2EB`.
   - Entregar testes unitários de contraste WCAG AA (`>= 4.5:1` texto e `>= 3.0:1` `borderStrong`), `ThemeContext` e `useMotion` + confirmar `envSecurity.test.ts` verde.
2. **Onda 2 — Primitivos de UI, `FeedbackProvider`, Shell de Navegação e Tela de Aparência:**
   - Implementar e testar todos os primitivos em `src/design-system/primitives/` (incluindo `BrandIcons`, `ConfirmDialog`, `ConfirmSection`, `Toast`) e `src/design-system/feedback/`.
   - Conectar `FeedbackProvider` em `app/_layout.tsx` e migrar `src/utils/errorHandling.ts` de `Alert.alert` para o handler registrado de `Toast`.
   - Migrar todos os `_layout.tsx` (`(auth)`, `(republic)`, `(panel)`, `tasks`, `events`, `finances`, `settings` — este último com `headerShown: false`), `app/index.tsx` e os componentes de notificação (`NotificationToast`, `NotificationBadge`, `NotificationCenter`).
   - Criar `app/(panel)/settings/appearance.tsx` e conectar em `settings/index.tsx`.
3. **Onda 3 — Migração: Autenticação, República, Home e Configurações (+ substituição de `Alert.alert`):**
   - Migrar `app/(auth)/*` (com botão Google em variante `secondary` + `GoogleIcon`), `app/(republic)/*`, `app/(panel)/home.tsx` (removendo animação JS de header), `app/(panel)/quick-actions.tsx` e todas as telas em `app/(panel)/settings/*` (usando `ScreenHeader` e `InstagramIcon` em `about.tsx`), substituindo todos os `Alert.alert` desse grupo por `useFeedback()`.
4. **Onda 4 — Migração: Tarefas, Eventos e Finanças (+ substituição de `Alert.alert`):**
   - Migrar `app/(panel)/tasks/*` e componentes de tarefas; `app/(panel)/events/*` e componentes de eventos (incluindo `Calendar.tsx` com `useWindowDimensions` e `calendarTheme`, e `CalendarPicker.tsx` com `GoogleIcon`); `app/(panel)/finances/*` e componentes financeiros (incluindo `MonthlyChart` e `CategoryChart` com `chartTheme`), substituindo todos os `Alert.alert` desse grupo por `useFeedback()`.
5. **Onda 5 — Reorganização Final, Limpeza de Dependências e Guardrails Automatizados:**
   - Consolidar pastas em `components/` (`tasks/`, `events/`, `finances/`, `notifications/`), remover `sharedStyles.tsx`, `eventStyles.tsx`, `animationCompat.tsx`, `BackButton.tsx`, `HeaderBar.tsx` e `ConfirmDeleteModal.tsx`.
   - Remover `@expo/vector-icons` e `expo-linear-gradient` de `package.json`.
   - Ativar `src/design-system/__tests__/designSystemGuardrails.test.ts` garantindo:
     - Zero hex hardcoded em `app/` e `components/` (exceto `tokens/palette.ts` e cores de marca isoladas em `BrandIcons.tsx`).
     - Zero `rgba()` hardcoded fora de `src/design-system/tokens/` e `src/design-system/theme/`.
     - Zero import de `SafeAreaView` vindo de `'react-native'`.
     - Zero `<StatusBar>` fora de `ThemeContext.tsx`.
     - Zero `Alert.alert` em `app/`, `components/` e `src/utils/errorHandling.ts`.
     - Zero import de `sharedStyles`, `eventStyles`, `animationCompat`, `@expo/vector-icons` ou `expo-linear-gradient`.

---

## 8. Decisões Propostas pelo Arquiteto vs. Deixadas ao Implementador

### Decisões técnicas tomadas nesta especificação (para conferência na revisão)
1. **Ajuste de contraste em `borderStrong`:** ajustado para `#837C6E` (Claro) e `#787268` (Escuro) para cumprir matematicamente WCAG 2.1 AA `>= 3.0:1` em todas as 3 superfícies (`bg`, `surface`, `subtle`), validado em `contrast.test.ts`.
2. **Edição cirúrgica dos XMLs nativos Android (`DayNight`):** atualização manual de `android/app/src/main/res/values/styles.xml`, `values/colors.xml` e `values-night/colors.xml` sem rodar `expo prebuild --clean`, garantindo que pickers nativos e splash acompanhem Claro/Escuro sem quebrar o hardening validado por `envSecurity.test.ts`.
3. **Headers de `settings/` unificados em `ScreenHeader`:** `app/(panel)/settings/_layout.tsx` passa para `headerShown: false` (igual aos outros 5 stacks), eliminando títulos duplicados em 5 subtelas e garantindo tipografia editorial e alinhamento `maxWidth: 720` na Web.
4. **Ícones de marca (`Google`, `Instagram`) e remoção de libs legadas:** encapsulados em `BrandIcons.tsx` (`react-native-svg`), com botão Google em `sign-in.tsx` na variante `secondary` (respeitando no máximo 1 CTA sólido por tela), permitindo banir e remover `@expo/vector-icons` e `expo-linear-gradient` na Onda 5.
5. **Persistência local de tema e escopo Web:** preferência salva em `AsyncStorage` (`@rephelper:theme_preference`, padrão `'system'`) sem alteração de API backend; desktop Web centralizado via `maxWidth: 720` (`960` em dashboards) mantendo a navegação atual.
6. **Cor de destaque fixa na v1:** `#1F4AA8` / `#7EA4FF` fixa nesta versão (arquitetura pronta para cor por república no futuro).

### Deixado ao implementador (no plano detalhado e execução)
- Assinaturas auxiliares internas e props opcionais adicionais dos primitivos além das variantes e comportamentos especificados.
- Configuração exata de mocks Jest para `@expo-google-fonts/*`, `lucide-react-native` e `expo-system-ui`.
- Script/processo exato para gerar os PNGs de marca em `assets/images/` e `android/app/src/main/res/drawable-*/`.
- Decomposição auxiliar de telas extensas (`settings/republic.tsx`, `finances/expenses/create.tsx`) quando facilitar a migração dentro das Ondas 3 e 4.
