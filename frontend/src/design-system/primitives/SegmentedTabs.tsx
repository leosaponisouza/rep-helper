import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useMotion } from '../motion/useMotion';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';
import { getPressFeedbackStyle } from './pressableFeedback';

export interface SegmentedTabOption<T extends string> {
  value: T;
  label: string;
  badge?: number;
}

export interface SegmentedTabsProps<T extends string> {
  options: ReadonlyArray<SegmentedTabOption<T>>;
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Editorial segmented tab control with an animated active indicator respecting Reduce Motion.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedTabsProps<T>): React.ReactElement {
  const { theme } = useTheme();
  const motion = useMotion();
  const [innerWidth, setInnerWidth] = useState(0);
  const hasLaidOutRef = useRef(false);
  const prevIndexRef = useRef<number | null>(null);
  const indicatorX = useRef(new Animated.Value(0)).current;

  const padding = theme.spacing.xxs;
  const count = Math.max(1, options.length);
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const tabWidth = innerWidth > 0 ? innerWidth / count : 0;

  useEffect(() => {
    if (tabWidth <= 0) {
      return;
    }

    const targetX = activeIndex * tabWidth;
    const animDuration = motion.duration(theme.motion.duration.fast);
    const didIndexChange = prevIndexRef.current !== null && prevIndexRef.current !== activeIndex;
    prevIndexRef.current = activeIndex;

    if (!hasLaidOutRef.current || !didIndexChange || animDuration === 0) {
      hasLaidOutRef.current = true;
      indicatorX.setValue(targetX);
      return;
    }

    const animation = Animated.timing(indicatorX, {
      toValue: targetX,
      duration: animDuration,
      easing: theme.motion.easing.standard,
      useNativeDriver: motion.useNativeDriver,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [
    activeIndex,
    tabWidth,
    indicatorX,
    motion,
    theme.motion.duration.fast,
    theme.motion.easing.standard,
  ]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const measured = Math.max(0, event.nativeEvent.layout.width - padding * 2);
    if (measured !== innerWidth) {
      setInnerWidth(measured);
    }
  };

  return (
    <View
      onLayout={handleLayout}
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.subtle,
          borderRadius: theme.radius.md,
          padding,
        },
        style,
      ]}
    >
      {tabWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              top: padding,
              bottom: padding,
              left: padding,
              width: tabWidth,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.sm,
              borderColor: theme.colors.line,
              transform: [{ translateX: indicatorX }],
            },
          ]}
        />
      ) : null}

      {options.map((option) => {
        const isActive = option.value === value;
        const a11yLabel =
          typeof option.badge === 'number'
            ? `${option.label} (${option.badge})`
            : option.label;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityLabel={a11yLabel}
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.tab,
              {
                borderRadius: theme.radius.sm,
                paddingHorizontal: theme.spacing.sm,
                gap: theme.spacing.xxs,
              },
              tabWidth === 0 && isActive
                ? {
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.line,
                  }
                : undefined,
              getPressFeedbackStyle(pressed, theme, motion.reduceMotion, { scale: false }),
            ]}
          >
            <AppText
              variant="bodyStrong"
              color={isActive ? 'ink' : 'inkSecondary'}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
            {typeof option.badge === 'number' ? (
              <AppText variant="monoLabel" color={isActive ? 'accent' : 'inkMuted'}>
                {option.badge}
              </AppText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'relative',
    width: '100%',
  },
  indicator: {
    position: 'absolute',
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
