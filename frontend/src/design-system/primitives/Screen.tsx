import React, { useContext } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import {
  Edge,
  SafeAreaInsetsContext,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';

export type ScreenWidth = 'standard' | 'wide' | 'full';

export interface ScreenProps {
  children?: React.ReactNode;
  scroll?: boolean;
  width?: ScreenWidth;
  padded?: boolean;
  keyboardAvoiding?: boolean;
  refreshControl?: React.ReactElement;
  header?: React.ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const DESKTOP_BREAKPOINT = 768;

const MAX_WIDTH_MAP: Record<Exclude<ScreenWidth, 'full'>, number> = {
  standard: 720,
  wide: 960,
};

/**
 * Root screen container using SafeAreaView from react-native-safe-area-context,
 * theme background, optional scrolling/keyboard avoidance, and centered desktop maxWidth.
 */
export function Screen({
  children,
  scroll = false,
  width = 'standard',
  padded = true,
  keyboardAvoiding = false,
  refreshControl,
  header,
  edges,
  style,
  contentContainerStyle,
  testID,
}: ScreenProps): React.ReactElement {
  const { theme } = useTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const safeAreaInsets = useContext(SafeAreaInsetsContext);

  const widthConstraintStyle: ViewStyle | undefined =
    width !== 'full' && viewportWidth >= DESKTOP_BREAKPOINT
      ? {
          maxWidth: MAX_WIDTH_MAP[width],
          width: '100%',
          alignSelf: 'center',
        }
      : undefined;

  const paddedStyle: ViewStyle | undefined = padded
    ? { padding: theme.spacing.md }
    : undefined;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        widthConstraintStyle,
        paddedStyle,
        contentContainerStyle,
      ]}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        widthConstraintStyle,
        paddedStyle,
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  const wrappedBody = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      enabled={Platform.OS !== 'web'}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  const content = (
    <>
      {header ? (
        <View style={[styles.headerWrapper, widthConstraintStyle]}>{header}</View>
      ) : null}
      {wrappedBody}
    </>
  );

  const containerStyle = [
    styles.safeArea,
    { backgroundColor: theme.colors.bg },
    style,
  ];

  // SafeAreaView.web reads SafeAreaInsetsContext directly; fall back gracefully if unmounted in isolated Web tests.
  if (Platform.OS === 'web' && safeAreaInsets == null) {
    return (
      <View testID={testID} style={containerStyle}>
        {content}
      </View>
    );
  }

  return (
    <SafeAreaView testID={testID} edges={edges} style={containerStyle}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerWrapper: {
    width: '100%',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
  },
});
