import React, { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useMotion } from '../motion/useMotion';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';
import { Divider } from './Divider';
import { IconButton } from './IconButton';

export interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  dismissOnBackdropPress?: boolean;
  testID?: string;
}

const SHEET_ENTER_OFFSET = 24;
const DESKTOP_BREAKPOINT = 768;
const ZERO_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function useSafeInsets(): EdgeInsets {
  try {
    return useSafeAreaInsets();
  } catch {
    return ZERO_INSETS;
  }
}

/**
 * Accessible bottom sheet / centered wide-screen modal with purposeful motion,
 * theme tokens, backdrop dismissal, hardware back handling, and safe keyboard/scroll support.
 */
export function BottomSheetModal({
  visible,
  onClose,
  title,
  children,
  footer,
  dismissOnBackdropPress = true,
  testID,
}: BottomSheetModalProps): React.ReactElement {
  const { theme } = useTheme();
  const { reduceMotion, useNativeDriver, duration } = useMotion();
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeInsets();

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(SHEET_ENTER_OFFSET)).current;

  useEffect(() => {
    if (!visible) {
      opacityAnim.setValue(0);
      translateYAnim.setValue(reduceMotion ? 0 : SHEET_ENTER_OFFSET);
      return;
    }

    opacityAnim.setValue(0);
    translateYAnim.setValue(reduceMotion ? 0 : SHEET_ENTER_OFFSET);

    const opacityTiming = Animated.timing(opacityAnim, {
      toValue: 1,
      duration: duration(theme.motion.duration.normal, { allowReducedFade: true }),
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
        duration: duration(theme.motion.duration.normal),
        easing: theme.motion.easing.standard,
        useNativeDriver,
      }),
    ]);

    enterAnim.start();
    return () => {
      enterAnim.stop();
    };
  }, [
    visible,
    reduceMotion,
    useNativeDriver,
    duration,
    theme.motion.duration.normal,
    theme.motion.easing.standard,
    opacityAnim,
    translateYAnim,
  ]);

  const isWide = viewportWidth >= DESKTOP_BREAKPOINT;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.root,
          isWide
            ? [styles.rootWide, { paddingHorizontal: theme.spacing.md }]
            : styles.rootMobile,
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdropPress ? onClose : undefined}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          testID={testID ? `${testID}-backdrop` : undefined}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: theme.colors.overlay,
                opacity: opacityAnim,
              },
            ]}
          />
        </Pressable>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          enabled={Platform.OS !== 'web'}
          style={styles.keyboardWrapper}
          pointerEvents="box-none"
        >
          <Animated.View
            testID={testID}
            accessibilityViewIsModal={true}
            style={[
              styles.sheet,
              theme.elevation.floating,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.line,
              },
              isWide
                ? {
                    borderRadius: theme.radius.lg,
                    maxWidth: 520,
                    alignSelf: 'center',
                    paddingBottom: theme.spacing.md,
                  }
                : {
                    borderTopLeftRadius: theme.radius.lg,
                    borderTopRightRadius: theme.radius.lg,
                    paddingBottom: Math.max(insets.bottom, theme.spacing.md),
                  },
              { opacity: opacityAnim },
              !reduceMotion ? { transform: [{ translateY: translateYAnim }] } : undefined,
            ]}
          >
            {title ? (
              <>
                <View
                  style={[
                    styles.header,
                    {
                      paddingHorizontal: theme.spacing.md,
                      paddingTop: theme.spacing.md,
                      paddingBottom: theme.spacing.sm,
                      gap: theme.spacing.xs,
                    },
                  ]}
                >
                  <AppText
                    variant="heading"
                    color="ink"
                    style={styles.headerTitle}
                    numberOfLines={2}
                  >
                    {title}
                  </AppText>
                  <IconButton
                    icon={<X size={20} strokeWidth={1.75} color={theme.colors.ink} />}
                    onPress={onClose}
                    accessibilityLabel="Fechar modal"
                    variant="ghost"
                  />
                </View>
                <Divider />
              </>
            ) : null}

            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: theme.spacing.md,
                paddingTop: theme.spacing.md,
                paddingBottom: footer ? theme.spacing.md : theme.spacing.xs,
              }}
            >
              {children}
            </ScrollView>

            {footer ? (
              <>
                <Divider />
                <View
                  style={{
                    paddingHorizontal: theme.spacing.md,
                    paddingTop: theme.spacing.sm,
                  }}
                >
                  {footer}
                </View>
              </>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootMobile: {
    justifyContent: 'flex-end',
  },
  rootWide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardWrapper: {
    width: '100%',
    maxHeight: '85%',
  },
  sheet: {
    width: '100%',
    maxHeight: '100%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
  },
});
