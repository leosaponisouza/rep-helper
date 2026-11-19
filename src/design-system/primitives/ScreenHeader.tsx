import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export type ScreenHeaderVariant = 'editorial' | 'compact';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  variant?: ScreenHeaderVariant;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Unified editorial screen header with optional back action and right action slot.
 */
export function ScreenHeader({
  title,
  subtitle,
  variant = 'editorial',
  onBack,
  rightActions,
  style,
}: ScreenHeaderProps): React.ReactElement {
  const { theme } = useTheme();
  const titleVariant = variant === 'editorial' ? 'title' : 'heading';

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          gap: theme.spacing.xs,
          borderBottomColor: theme.colors.line,
        },
        style,
      ]}
    >
      {onBack ? (
        <IconButton
          icon={<ArrowLeft size={20} strokeWidth={1.75} color={theme.colors.ink} />}
          onPress={onBack}
          accessibilityLabel="Voltar"
          variant="ghost"
        />
      ) : null}

      <View style={styles.titleBlock}>
        <AppText variant={titleVariant} color="ink" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="inkSecondary" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {rightActions ? (
        <View style={[styles.rightSlot, { gap: theme.spacing.xs }]}>{rightActions}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    width: '100%',
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
