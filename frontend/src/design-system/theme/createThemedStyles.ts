import { useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Theme } from './types';
import { useTheme } from './useTheme';

/**
 * Builds and memoizes a themed `StyleSheet` inside a component, recomputing only when `theme` changes.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T
): T {
  const { theme } = useTheme();
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  return useMemo(
    () =>
      StyleSheet.create(
        factoryRef.current(theme) as T & StyleSheet.NamedStyles<any>
      ),
    [theme]
  );
}

/**
 * Creates a reusable hook that returns a theme-memoized `StyleSheet`.
 */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T
): () => T {
  return function useStyles(): T {
    return useThemedStyles(factory);
  };
}
