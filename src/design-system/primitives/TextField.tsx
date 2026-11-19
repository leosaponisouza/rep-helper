import React, { useState } from 'react';
import {
  NativeSyntheticEvent,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputFocusEventData,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface TextFieldProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightAccessory?: React.ReactNode;
  secureToggle?: boolean;
  multiline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Editorial accessible text input with resting borderStrong, accent focus ring,
 * inline danger validation, and optional password visibility toggle.
 */
export function TextField({
  label,
  value,
  onChangeText,
  error,
  helperText,
  leftIcon,
  rightAccessory,
  secureToggle = false,
  multiline = false,
  containerStyle,
  style,
  editable = true,
  onFocus,
  onBlur,
  secureTextEntry,
  placeholderTextColor,
  accessibilityLabel,
  ...rest
}: TextFieldProps): React.ReactElement {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);

  const hasError = Boolean(error && error.trim().length > 0);

  const borderColor = hasError
    ? theme.colors.danger
    : isFocused
      ? theme.colors.accent
      : theme.colors.borderStrong;

  const handleFocus = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  const resolvedSecureTextEntry = secureToggle ? isPasswordHidden : secureTextEntry;

  return (
    <View style={[styles.wrapper, { gap: theme.spacing.xxs }, containerStyle]}>
      {label ? (
        <AppText variant="bodyStrong" color="ink">
          {label}
        </AppText>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: editable ? theme.colors.surface : theme.colors.subtle,
            borderColor,
            borderRadius: theme.radius.sm,
            paddingLeft: theme.spacing.sm,
            paddingRight: secureToggle || rightAccessory ? theme.spacing.xxs : theme.spacing.sm,
            gap: theme.spacing.xs,
          },
          multiline
            ? [styles.multilineContainer, { paddingVertical: theme.spacing.sm }]
            : styles.singleLineContainer,
        ]}
      >
        {leftIcon ? <View style={styles.accessorySlot}>{leftIcon}</View> : null}

        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          multiline={multiline}
          secureTextEntry={resolvedSecureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={placeholderTextColor ?? theme.colors.inkMuted}
          accessibilityLabel={accessibilityLabel ?? label}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[
            theme.typography.body,
            styles.input,
            {
              color: editable ? theme.colors.ink : theme.colors.inkMuted,
            },
            multiline ? styles.multilineInput : undefined,
            style,
          ]}
        />

        {rightAccessory ? (
          <View style={styles.accessorySlot}>{rightAccessory}</View>
        ) : null}

        {secureToggle ? (
          <IconButton
            icon={
              isPasswordHidden ? (
                <Eye size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />
              ) : (
                <EyeOff size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />
              )
            }
            onPress={() => setIsPasswordHidden((prev) => !prev)}
            accessibilityLabel={isPasswordHidden ? 'Mostrar senha' : 'Ocultar senha'}
            disabled={!editable}
            variant="ghost"
          />
        ) : null}
      </View>

      {hasError ? (
        <View style={[styles.messageRow, { gap: theme.spacing.xxs }]}>
          <AlertCircle size={16} strokeWidth={1.75} color={theme.colors.danger} />
          <AppText
            variant="caption"
            color="danger"
            accessibilityLiveRegion="polite"
            style={styles.messageText}
          >
            {error}
          </AppText>
        </View>
      ) : helperText ? (
        <AppText variant="caption" color="inkMuted">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    width: '100%',
  },
  singleLineContainer: {
    minHeight: 48,
    alignItems: 'center',
  },
  multilineContainer: {
    minHeight: 100,
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  multilineInput: {
    minHeight: 76,
  },
  accessorySlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageText: {
    flex: 1,
  },
});
