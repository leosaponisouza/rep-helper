import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AlertCircle, Inbox } from 'lucide-react-native';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';
import { Button } from './Button';

export type StateViewKind = 'loading' | 'empty' | 'error';

export interface StateViewProps {
  kind: StateViewKind;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_TITLES: Record<StateViewKind, string> = {
  loading: 'Carregando...',
  empty: 'Nada por aqui',
  error: 'Não foi possível carregar',
};

/**
 * Unified loading, empty, and error state view with optional retry/primary action.
 */
export function StateView({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  icon,
  style,
}: StateViewProps): React.ReactElement {
  const { theme } = useTheme();
  const resolvedTitle = title ?? DEFAULT_TITLES[kind];

  const renderVisual = (): React.ReactNode => {
    if (kind === 'loading') {
      return <ActivityIndicator size="large" color={theme.colors.accent} />;
    }
    if (icon) {
      return icon;
    }
    if (kind === 'error') {
      return <AlertCircle size={32} strokeWidth={1.75} color={theme.colors.danger} />;
    }
    return <Inbox size={32} strokeWidth={1.75} color={theme.colors.inkMuted} />;
  };

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          padding: theme.spacing.xl,
          gap: theme.spacing.sm,
        },
        style,
      ]}
    >
      <View style={styles.visualSlot}>{renderVisual()}</View>

      <AppText variant="heading" color="ink" style={styles.centeredText}>
        {resolvedTitle}
      </AppText>

      {description ? (
        <AppText variant="body" color="inkSecondary" style={styles.centeredText}>
          {description}
        </AppText>
      ) : null}

      {onAction ? (
        <View style={{ marginTop: theme.spacing.xs }}>
          <Button
            label={actionLabel ?? 'Tentar novamente'}
            onPress={onAction}
            variant="secondary"
            size="md"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
});
