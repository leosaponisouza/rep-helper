import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { AppText, useMotion, useTheme } from '../src/design-system';
import notificationApiService from '../src/services/notificationApiService';

interface NotificationBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showPulse?: boolean;
  count?: number;
}

const SIZE_SPECS = {
  small: { minWidth: 18, height: 18, paddingHorizontal: 4, top: -2, right: -2, fontSize: 10, lineHeight: 12 },
  medium: { minWidth: 20, height: 20, paddingHorizontal: 5, top: -4, right: -4, fontSize: 11, lineHeight: 13 },
  large: { minWidth: 24, height: 24, paddingHorizontal: 6, top: -6, right: -6, fontSize: 12, lineHeight: 14 },
} as const;

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  size = 'medium',
  count: controlledCount,
}) => {
  const { theme } = useTheme();
  const motion = useMotion();
  const { user } = useAuth();

  const [fetchedCount, setFetchedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(controlledCount === undefined);
  const previousCountRef = useRef<number>(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isControlled = controlledCount !== undefined;
  const effectiveCount = isControlled ? controlledCount : fetchedCount;

  const fetchUnreadCount = useCallback(async () => {
    if (isControlled || !user?.uid) {
      return;
    }

    try {
      const unreadCount = await notificationApiService.countUnreadNotifications();
      setFetchedCount(unreadCount);
    } catch (error) {
      console.error('Erro ao buscar contagem de notificações não lidas:', error);
    } finally {
      setLoading(false);
    }
  }, [isControlled, user?.uid]);

  useEffect(() => {
    if (isControlled) {
      setLoading(false);
      return;
    }

    let isActive = true;
    if (user?.uid) {
      void fetchUnreadCount();
      const interval = setInterval(() => {
        if (isActive) {
          void fetchUnreadCount();
        }
      }, 30000);

      return () => {
        isActive = false;
        clearInterval(interval);
      };
    }

    setFetchedCount(0);
    setLoading(false);
    return undefined;
  }, [isControlled, user?.uid, fetchUnreadCount]);

  useEffect(() => {
    const prev = previousCountRef.current;
    previousCountRef.current = effectiveCount;

    if (effectiveCount <= 0) {
      scaleAnim.setValue(0.8);
      return;
    }

    if (prev === 0 && motion.shouldAnimate) {
      scaleAnim.setValue(0.8);
      const animation = Animated.timing(scaleAnim, {
        toValue: 1,
        duration: motion.duration(theme.motion.duration.fast),
        easing: theme.motion.easing.standard,
        useNativeDriver: motion.useNativeDriver,
      });
      animation.start();
      return () => animation.stop();
    }

    scaleAnim.setValue(1);
    return undefined;
  }, [effectiveCount, motion, scaleAnim, theme.motion.duration.fast, theme.motion.easing.standard]);

  if (!user || (effectiveCount <= 0 && !loading) || effectiveCount <= 0) {
    return null;
  }

  const spec = SIZE_SPECS[size];

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.badge,
        theme.elevation.floating,
        {
          minWidth: spec.minWidth,
          height: spec.height,
          paddingHorizontal: spec.paddingHorizontal,
          borderRadius: theme.radius.full,
          top: spec.top,
          right: spec.right,
          backgroundColor: theme.colors.danger,
          borderColor: theme.colors.surface,
          transform: motion.shouldAnimate ? [{ scale: scaleAnim }] : undefined,
        },
      ]}
    >
      <AppText
        variant="monoLabel"
        color="onDanger"
        style={{
          fontSize: spec.fontSize,
          lineHeight: spec.lineHeight,
          textAlign: 'center',
        }}
      >
        {effectiveCount > 99 ? '99+' : String(effectiveCount)}
      </AppText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
});

export default NotificationBadge;
