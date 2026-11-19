import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';
import { BottomSheetModal } from './BottomSheetModal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

/**
 * Accessible confirmation dialog built over BottomSheetModal with pt-BR defaults
 * and subtle native haptic feedback on destructive confirmation.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  testID,
}: ConfirmDialogProps): React.ReactElement {
  const { theme } = useTheme();

  const handleConfirm = () => {
    if (destructive && Platform.OS !== 'web') {
      try {
        Promise.resolve(
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        ).catch(() => {});
      } catch {
        // Ignore haptics errors on unsupported environments.
      }
    }
    onConfirm();
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onCancel}
      title={title}
      dismissOnBackdropPress={!loading}
      testID={testID}
      footer={
        <View style={[styles.actions, { gap: theme.spacing.sm }]}>
          <View style={styles.actionSlot}>
            <Button
              label={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              disabled={loading}
              fullWidth
            />
          </View>
          <View style={styles.actionSlot}>
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={handleConfirm}
              loading={loading}
              fullWidth
            />
          </View>
        </View>
      }
    >
      <AppText variant="body" color="inkSecondary">
        {message}
      </AppText>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    width: '100%',
  },
  actionSlot: {
    flex: 1,
  },
});
