import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, StatusBar, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { darkTheme } from './darkTheme';
import { lightTheme } from './lightTheme';
import { ResolvedTheme, Theme, ThemeMode } from './types';

export const THEME_STORAGE_KEY = '@alpendre:theme_preference';

export interface ThemeContextValue {
  theme: Theme;
  preference: ThemeMode;
  resolvedMode: ResolvedTheme;
  ready: boolean;
  setPreference: (mode: ThemeMode) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function isValidThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function parseThemeMode(raw: string | null): ThemeMode {
  return isValidThemeMode(raw) ? raw : 'system';
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const systemColorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);
  const hasUserSelectedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isMounted && !hasUserSelectedRef.current) {
          setPreferenceState(parseThemeMode(stored));
        }
      } catch {
        if (isMounted && !hasUserSelectedRef.current) {
          setPreferenceState('system');
        }
      } finally {
        if (isMounted) {
          setReady(true);
        }
      }
    };

    loadPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  const setPreference = useCallback(async (mode: ThemeMode): Promise<void> => {
    const nextMode: ThemeMode = isValidThemeMode(mode) ? mode : 'system';
    hasUserSelectedRef.current = true;
    setPreferenceState(nextMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch {
      // Keep in-memory preference updated even if local persistence fails.
    }
  }, []);

  const resolvedMode: ResolvedTheme =
    preference === 'system'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;

  const theme = resolvedMode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    if (!ready || Platform.OS === 'web') {
      return;
    }
    try {
      Promise.resolve(SystemUI.setBackgroundColorAsync(theme.colors.bg)).catch(
        () => {}
      );
    } catch {
      // Ignore native root background sync errors on unsupported environments.
    }
  }, [ready, theme.colors.bg]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      preference,
      resolvedMode,
      ready,
      setPreference,
    }),
    [theme, preference, resolvedMode, ready, setPreference]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.bg}
      />
      {children}
    </ThemeContext.Provider>
  );
}
