// components/Finances/AdjustBalanceModal.tsx
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  AppText,
  BottomSheetModal,
  Button,
  Chip,
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

const getInitialBalanceState = (
  value: number
): { formatted: string; negative: boolean } => {
  const safe = Number.isFinite(value) ? value : 0;
  const cents = Math.round(safe * 100);
  if (cents === 0) {
    return { formatted: '0,00', negative: false };
  }
  return {
    formatted: (Math.abs(cents) / 100).toFixed(2).replace('.', ','),
    negative: cents < 0,
  };
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
  const [isNegative, setIsNegative] = useState<boolean>(false);
  const [balanceError, setBalanceError] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      const initial = getInitialBalanceState(currentBalance);
      setBalance(initial.formatted);
      setIsNegative(initial.negative);
      setBalanceError(undefined);
      setDescription('');
    }
  }, [visible, currentBalance]);

  const handleChangeBalance = (text: string) => {
    const trimmed = text.trim();
    const hasMinus = trimmed.includes('-');
    const hasPlus = trimmed.includes('+');
    const numericDigits = trimmed.replace(/\D/g, '').slice(0, 12);
    const parsedCents = numericDigits ? parseInt(numericDigits, 10) : 0;

    if (!numericDigits || !Number.isFinite(parsedCents) || parsedCents === 0) {
      setBalance('');
      setIsNegative(hasMinus && !hasPlus && trimmed === '-');
      if (balanceError) setBalanceError(undefined);
      return;
    }

    if (hasMinus) {
      setIsNegative(true);
    } else if (hasPlus) {
      setIsNegative(false);
    }

    const formattedValue = (parsedCents / 100).toFixed(2).replace('.', ',');
    setBalance(formattedValue);
    if (balanceError) setBalanceError(undefined);
  };

  const handleSubmit = async () => {
    triggerImpactHaptic();

    const parsedAbs = parseFloat(balance.replace(',', '.'));

    if (!balance || !Number.isFinite(parsedAbs)) {
      const message = 'Por favor, insira um valor válido.';
      setBalanceError(message);
      toast({
        title: 'Valor inválido',
        message,
        tone: 'warning',
      });
      return;
    }

    const parsedCents = Math.round(parsedAbs * 100);
    const newBalance =
      parsedCents === 0 ? 0 : isNegative ? -Math.abs(parsedAbs) : Math.abs(parsedAbs);

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

        <View style={{ gap: theme.spacing.xs }}>
          <View style={[styles.signRow, { gap: theme.spacing.xs }]}>
            <Chip
              label="Positivo (+)"
              selected={!isNegative}
              disabled={loading}
              onPress={() => setIsNegative(false)}
            />
            <Chip
              label="Negativo (-)"
              selected={isNegative}
              disabled={loading}
              onPress={() => setIsNegative(true)}
            />
          </View>

          <TextField
            label="Novo Saldo"
            value={balance}
            onChangeText={handleChangeBalance}
            keyboardType="numeric"
            placeholder="0,00"
            error={balanceError}
            editable={!loading}
            leftIcon={
              <AppText
                variant="monoValue"
                color={isNegative ? 'danger' : 'inkSecondary'}
              >
                {isNegative ? 'R$ -' : 'R$'}
              </AppText>
            }
          />
        </View>

        <TextField
          label="Descrição (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Motivo do ajuste"
          maxLength={100}
          editable={!loading}
          helperText="Ajuste o saldo da caixinha da casa para refletir o valor real em caixa."
        />
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  signRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footerRow: {
    flexDirection: 'row',
  },
  footerButton: {
    flex: 1,
  },
});

export default AdjustBalanceModal;
