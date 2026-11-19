import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AlertCircle, Trash2, X } from 'lucide-react-native';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Surface } from './Surface';

export interface ConfirmSectionProps {
  title: string;
  deleteLabel: string;
  confirmLabel?: string;
  showConfirm: boolean;
  loading?: boolean;
  onPressDelete: () => void;
  onCancelConfirm: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Inline destructive confirmation section replacing legacy ConfirmDeleteModal.
 */
export function ConfirmSection({
  title,
  deleteLabel,
  confirmLabel = 'Confirmar exclusão',
  showConfirm,
  loading = false,
  onPressDelete,
  onCancelConfirm,
  style,
}: ConfirmSectionProps): React.ReactElement {
  const { theme } = useTheme();

  return (
    <Surface
      tone="surface"
      bordered
      padded="md"
      radiusKey="md"
      style={[
        showConfirm ? { borderColor: theme.colors.danger } : undefined,
        style,
      ]}
    >
      <View style={[styles.content, { gap: theme.spacing.sm }]}>
        <AppText variant="heading" color="ink">
          {title}
        </AppText>

        {showConfirm ? (
          <AppText variant="caption" color="danger">
            Esta ação é permanente e não pode ser desfeita.
          </AppText>
        ) : null}

        <View style={[styles.actions, { gap: theme.spacing.xs }]}>
          <Button
            variant="danger"
            label={showConfirm ? confirmLabel : deleteLabel}
            onPress={onPressDelete}
            loading={loading}
            fullWidth
            leftIcon={
              showConfirm ? (
                <AlertCircle size={18} strokeWidth={1.75} color={theme.colors.onDanger} />
              ) : (
                <Trash2 size={18} strokeWidth={1.75} color={theme.colors.onDanger} />
              )
            }
          />

          {showConfirm ? (
            <Button
              variant="secondary"
              label="Cancelar"
              onPress={onCancelConfirm}
              disabled={loading}
              fullWidth
              leftIcon={<X size={18} strokeWidth={1.75} color={theme.colors.ink} />}
            />
          ) : null}
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
  },
  actions: {
    width: '100%',
  },
});
