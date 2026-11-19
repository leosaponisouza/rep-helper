import React from 'react';
import {
  AccessibilityRole,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useMotion } from '../motion/useMotion';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';
import { Divider } from './Divider';
import { getPressFeedbackStyle } from './pressableFeedback';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
  strikethrough?: boolean;
  selected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: PressableProps['accessibilityState'];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Editorial list item row with optional leading/trailing slots, strikethrough, selection, and divider.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  showDivider = false,
  strikethrough = false,
  selected,
  disabled = false,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  style,
  testID,
}: ListRowProps): React.ReactElement {
  const { theme } = useTheme();
  const { reduceMotion } = useMotion();

  const rowSpacingStyle: ViewStyle = {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: selected ? theme.colors.accentSoft : 'transparent',
  };

  const content = (
    <>
      {leading ? <View style={styles.slot}>{leading}</View> : null}
      <View style={styles.body}>
        <AppText
          variant="bodyStrong"
          color={strikethrough ? 'inkMuted' : 'ink'}
          strikethrough={strikethrough}
          numberOfLines={2}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="inkSecondary" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ? <View style={styles.slot}>{trailing}</View> : null}
    </>
  );

  const computedLabel = accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title);

  const mergedAccessibilityState: PressableProps['accessibilityState'] = {
    ...accessibilityState,
    ...(selected !== undefined ? { selected } : undefined),
    ...(disabled ? { disabled: true } : undefined),
  };

  return (
    <View>
      {onPress ? (
        <Pressable
          testID={testID}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole={accessibilityRole ?? 'button'}
          accessibilityLabel={computedLabel}
          accessibilityState={mergedAccessibilityState}
          style={({ pressed }) => [
            styles.row,
            rowSpacingStyle,
            disabled ? styles.disabled : undefined,
            getPressFeedbackStyle(pressed, theme, reduceMotion, { disabled, scale: false }),
            style,
          ]}
        >
          {content}
        </Pressable>
      ) : (
        <View
          testID={testID}
          accessibilityLabel={computedLabel}
          style={[styles.row, rowSpacingStyle, style]}
        >
          {content}
        </View>
      )}
      {showDivider ? <Divider /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
