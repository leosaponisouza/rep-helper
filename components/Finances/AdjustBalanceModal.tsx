// components/Finances/AdjustBalanceModal.tsx
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  AppText,
  BottomSheetModal,
  Button,
  Surface,
  TextField,
  useFeedback,
  useTheme,
} from '../../src/design-system';
import { formatCurrencyBRL } from '../../src/utils/currencyUtils';

interface AdjustBalanceModalProps {
  visible: boolean;
  currentBalance: number;
  onClose: () => void;
  onSubmit: (newBalance: number, description: string) => Promise<boolean>;
}

const formatCentavosInput = (value: number): string => {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe < 0 ? '-' : '';
  const absFormatted = Math.abs(safe).toFixed(2).replace('.', ',');
  return `${sign}${absFormatted}`;
};

const triggerImpactHaptic = () => {
  if (Platform.OS === 'web') return;
  try {
    void Promise.resolve(
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    ).catch(() => {});
  } catch {
    // Ignore haptics errors on unsupported devices
  }
};

const triggerNotificationHaptic = (type: Haptics.NotificationFeedbackType) => {
  if (Platform.OS === 'web') return;
  try {
    void Promise.resolve(Haptics.notificationAsync(type)).catch(() => {});
  } catch {
    // Ignore haptics errors on unsupported devices
  }
};

const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({
  visible,
  currentBalance,
  onClose,
  onSubmit,
}) => {
  const { theme } = useTheme();
  const { toast } = useFeedback();

  const [balance, setBalance] = useState<string>('');
  const [balanceError, setBalanceError] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setBalance(formatCentavosInput(currentBalance));
      setBalanceError(undefined);
      setDescription('');
    }
  }, [visible, currentBalance]);

  const handleChangeBalance = (text: string) => {
    const isNegative = text.trim().startsWith('-');
    const numericDigits = text.replace(/\D/g, '');
    if (!numericDigits) {
      setBalance(isNegative ? '-' : '');
      if (balanceError) setBalanceError(undefined);
      return;
    }

    const cappedDigits = numericDigits.slice(0, 12);
    const floatValue = parseInt(cappedDigits, 10) / 100;
    const formattedValue = floatValue.toFixed(2).replace('.', ',');
    setBalance(`${isNegative ? '-' : ''}${formattedValue}`);
    if (balanceError) setBalanceError(undefined);
  };

  const handleSubmit = async () => {
    triggerImpactHaptic();

    const normalized = balance.replace(',', '.');
    const newBalance = parseFloat(normalized);

    if (!Number.isFinite(newBalance)) {
      const message = 'Por favor, insira um valor válido.';
      setBalanceError(message);
      toast({
        title: 'Valor inválido',
        message,
        tone: 'warning',
      });
      return;
    }

    try {
      setLoading(true);
      const success = await onSubmit(newBalance, description.trim());

      if (success) {
        triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success);
        onClose();
      } else {
        triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      toast({
        title: 'Erro',
        message: 'Não foi possível ajustar o saldo. Tente novamente.',
        tone: 'danger',
      });
      triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Ajustar Saldo"
      dismissable={!loading}
      dismissOnBackdropPress={!loading}
      footer={
        <View style={[styles.footerRow, { gap: theme.spacing.xs }]}>
          <View style={styles.footerButton}>
            <Button
              label="Cancelar"
              variant="secondary"
              fullWidth
              onPress={onClose}
              disabled={loading}
            />
          </View>
          <View style={styles.footerButton}>
            <Button
              label="Confirmar"
              variant="primary"
              fullWidth
              loading={loading}
              onPress={() => void handleSubmit()}
            />
          </View>
        </View>
      }
    >
      <View style={{ gap: theme.spacing.md }}>
        <Surface
          tone="subtle"
          bordered
          padded="sm"
          radiusKey="sm"
          style={{ gap: theme.spacing.xxs }}
        >
          <AppText variant="monoLabel" color="inkSecondary">
            Saldo Atual
          </AppText>
          <AppText
            variant="monoValue"
            color={currentBalance >= 0 ? 'success' : 'danger'}
          >
            {formatCurrencyBRL(currentBalance)}
          </AppText>
        </Surface>

        <TextField
          label="Novo Saldo"
          value={balance}
          onChangeText={handleChangeBalance}
          keyboardType="numeric"
          placeholder="0,00"
          error={balanceError}
          editable={!loading}
          leftIcon={
            <AppText variant="monoValue" color="inkSecondary">
              R$
            </AppText>
          }
        />

        <TextField
          label="Descrição (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Motivo do ajuste"
          maxLength={100}
          editable={!loading}
          helperText="Ajuste o saldo da república para refletir o valor real compartilhado."
        />
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  footerRow: {
    flexDirection: 'row',
  },
  footerButton: {
    flex: 1,
  },
});

export default AdjustBalanceModal;
