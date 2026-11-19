import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  type LucideIcon,
  X,
} from 'lucide-react-native';
import { useMotion } from '../motion/useMotion';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { getPressFeedbackStyle } from './pressableFeedback';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastProps {
  title: string;
  message?: string;
  tone?: ToastTone;
  onDismiss: () => void;
  onPress?: () => void;
  testID?: string;
}

interface ToastToneSpec {
  colorKey: 'accent' | 'success' | 'warning' | 'danger';
  softKey: 'accentSoft' | 'successSoft' | 'warningSoft' | 'dangerSoft';
  Icon: LucideIcon;
}

const TOAST_TONE_SPECS: Record<ToastTone, ToastToneSpec> = {
  info: { colorKey: 'accent', softKey: 'accentSoft', Icon: Info },
  success: { colorKey: 'success', softKey: 'successSoft', Icon: CheckCircle2 },
  warning: { colorKey: 'warning', softKey: 'warningSoft', Icon: AlertTriangle },
  danger: { colorKey: 'danger', softKey: 'dangerSoft', Icon: AlertCircle },
};

const TOAST_ENTER_OFFSET = -12;

/**
 * Editorial notification toast without gradients, pulse animations, or elastic springs.
 */
export function Toast({
  title,
  message,
  tone = 'info',
  onDismiss,
  onPress,
  testID,
}: ToastProps): React.ReactElement {
  const { theme } = useTheme();
  const { reduceMotion, useNativeDriver, duration } = useMotion();

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(TOAST_ENTER_OFFSET)).current;

  useEffect(() => {
    opacityAnim.setValue(0);
    translateYAnim.setValue(reduceMotion ? 0 : TOAST_ENTER_OFFSET);

    const opacityTiming = Animated.timing(opacityAnim, {
      toValue: 1,
      duration: duration(theme.motion.duration.fast, { allowReducedFade: true }),
      easing: theme.motion.easing.standard,
      useNativeDriver,
    });

    if (reduceMotion) {
      opacityTiming.start();
      return () => {
        opacityTiming.stop();
      };
    }

    const enterAnim = Animated.parallel([
      opacityTiming,
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: duration(theme.motion.duration.fast),
        easing: theme.motion.easing.standard,
        useNativeDriver,
      }),
    ]);

    enterAnim.start();
    return () => {
      enterAnim.stop();
    };
  }, [
    reduceMotion,
    useNativeDriver,
    duration,
    theme.motion.duration.fast,
    theme.motion.easing.standard,
    opacityAnim,
    translateYAnim,
  ]);

  const spec = TOAST_TONE_SPECS[tone] ?? TOAST_TONE_SPECS.info;
  const accentColor = theme.colors[spec.colorKey];
  const softColor = theme.colors[spec.softKey];
  const ToneIcon = spec.Icon;

  const bodyContent = (
    <>
      <View
        style={[
          styles.iconBadge,
          {
            backgroundColor: softColor,
            borderRadius: theme.radius.full,
          },
        ]}
      >
        <ToneIcon size={18} strokeWidth={1.75} color={accentColor} />
      </View>
      <View style={styles.textColumn}>
        <AppText variant="bodyStrong" color="ink" numberOfLines={2}>
          {title}
        </AppText>
        {message ? (
          <AppText variant="caption" color="inkSecondary" numberOfLines={3}>
            {message}
          </AppText>
        ) : null}
      </View>
    </>
  );

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        theme.elevation.floating,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.line,
          borderLeftColor: accentColor,
          borderRadius: theme.radius.md,
          opacity: opacityAnim,
        },
        !reduceMotion ? { transform: [{ translateY: translateYAnim }] } : undefined,
      ]}
    >
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={title}
          style={({ pressed }) => [
            styles.body,
            {
              paddingVertical: theme.spacing.sm,
              paddingLeft: theme.spacing.sm,
              gap: theme.spacing.sm,
            },
            getPressFeedbackStyle(pressed, theme, reduceMotion),
          ]}
        >
          {bodyContent}
        </Pressable>
      ) : (
        <View
          style={[
            styles.body,
            {
              paddingVertical: theme.spacing.sm,
              paddingLeft: theme.spacing.sm,
              gap: theme.spacing.sm,
            },
          ]}
        >
          {bodyContent}
        </View>
      )}

      <View style={{ paddingRight: theme.spacing.xxs }}>
        <IconButton
          icon={<X size={16} strokeWidth={1.75} color={theme.colors.inkMuted} />}
          onPress={onDismiss}
          accessibilityLabel="Fechar notificação"
          variant="ghost"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 4,
    width: '100%',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
});
