import { useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme } from './darkTheme';
import { lightTheme } from './lightTheme';
import { ThemeContext, ThemeContextValue } from './ThemeContext';
import { ResolvedTheme, ThemeMode } from './types';

const noopSetPreference = async (_mode: ThemeMode): Promise<void> => {};

/**
 * Returns the active design-system theme and preference controls.
 * Falls back safely to the OS color scheme when called outside `<ThemeProvider>`.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  const systemColorScheme = useColorScheme();

  return useMemo<ThemeContextValue>(() => {
    if (context) {
      return context;
    }
    const resolvedMode: ResolvedTheme =
      systemColorScheme === 'dark' ? 'dark' : 'light';
    return {
      theme: resolvedMode === 'dark' ? darkTheme : lightTheme,
      preference: 'system',
      resolvedMode,
      ready: true,
      setPreference: noopSetPreference,
    };
  }, [context, systemColorScheme]);
}
