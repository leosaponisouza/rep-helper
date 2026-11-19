import React, { useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { AlertCircle, CheckCircle2, Lock, Save } from 'lucide-react-native';
import {
  AppText,
  Button,
  Screen,
  ScreenHeader,
  Surface,
  TextField,
  useFeedback,
  useTheme,
} from '../../../src/design-system';
import { auth } from '../../../src/utils/firebaseClientConfig';
import { logger } from '../../../src/utils/logger';
import { changePasswordSchema } from '../../../src/validation/authSchemas';

const SECURITY_TIPS: ReadonlyArray<string> = [
  'Use uma combinação de letras, números e símbolos',
  'Evite informações pessoais como datas ou nomes',
  'Não reutilize senhas de outros serviços',
];

const triggerHaptic = (callback: () => Promise<void> | void) => {
  if (Platform.OS === 'web') return;
  try {
    void Promise.resolve(callback()).catch(() => {});
  } catch {
    // Ignore haptics errors on unsupported devices
  }
};

const ChangePasswordScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChangePassword = async () => {
    Keyboard.dismiss();
    triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

    const validation = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      setError(
        firstIssue?.message || 'Dados inválidos. Verifique os campos informados.'
      );
      return;
    }

    try {
      setLoading(true);
      setError('');

      const firebaseUser = auth.currentUser;
      if (!firebaseUser || !firebaseUser.email) {
        throw new Error('Usuário não autenticado');
      }

      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        currentPassword
      );

      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);

      // Limpar campos sensíveis da memória/estado antes de exibir confirmação
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      );
      toast({
        title: 'Senha alterada',
        message: 'Sua senha foi alterada com sucesso.',
        tone: 'success',
      });
      router.back();
    } catch (err: any) {
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      );

      const errorCode = err?.code;
      if (
        errorCode === 'auth/wrong-password' ||
        errorCode === 'auth/invalid-credential'
      ) {
        setError('Senha atual incorreta.');
      } else if (errorCode === 'auth/weak-password') {
        setError('A nova senha não atende aos requisitos mínimos de segurança.');
      } else if (errorCode === 'auth/too-many-requests') {
        setError('Muitas tentativas. Tente novamente mais tarde.');
      } else if (errorCode === 'auth/requires-recent-login') {
        setError('Por favor, faça login novamente antes de alterar sua senha.');
      } else if (errorCode === 'auth/network-request-failed') {
        setError('Falha na conexão. Verifique sua internet e tente novamente.');
      } else if (err?.message === 'Usuário não autenticado') {
        setError(
          'Sessão expirada. Faça login novamente para alterar sua senha.'
        );
      } else {
        setError('Não foi possível alterar a senha. Tente novamente.');
      }

      logger.error('Erro ao alterar senha:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      scroll
      keyboardAvoiding
      header={
        <ScreenHeader
          title="Alterar Senha"
          subtitle="Digite sua senha atual e escolha uma nova senha"
          onBack={() => router.back()}
        />
      }
      contentContainerStyle={{ gap: theme.spacing.lg }}
    >
      <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.md }}>
        <TextField
          label="Senha Atual"
          placeholder="Digite sua senha atual"
          value={currentPassword}
          onChangeText={(text) => {
            setCurrentPassword(text);
            if (error) setError('');
          }}
          secureToggle
          autoCapitalize="none"
          leftIcon={
            <Lock size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
          }
        />

        <TextField
          label="Nova Senha"
          placeholder="Digite sua nova senha"
          value={newPassword}
          onChangeText={(text) => {
            setNewPassword(text);
            if (error) setError('');
          }}
          secureToggle
          autoCapitalize="none"
          helperText="Mínimo de 8 caracteres, com letra maiúscula, minúscula e número"
          leftIcon={
            <Lock size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
          }
        />

        <TextField
          label="Confirmar Nova Senha"
          placeholder="Confirme sua nova senha"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (error) setError('');
          }}
          secureToggle
          autoCapitalize="none"
          leftIcon={
            <Lock size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
          }
        />

        {error ? (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.errorBanner,
              {
                backgroundColor: theme.colors.dangerSoft,
                borderRadius: theme.radius.sm,
                padding: theme.spacing.sm,
                gap: theme.spacing.xs,
              },
            ]}
          >
            <AlertCircle size={18} strokeWidth={1.75} color={theme.colors.danger} />
            <AppText variant="caption" color="danger" style={styles.flexText}>
              {error}
            </AppText>
          </View>
        ) : null}

        <Button
          label="Alterar Senha"
          variant="primary"
          fullWidth
          loading={loading}
          leftIcon={
            <Save size={18} strokeWidth={1.75} color={theme.colors.onAccent} />
          }
          onPress={() => void handleChangePassword()}
        />
      </Surface>

      <Surface tone="subtle" bordered padded="md" style={{ gap: theme.spacing.sm }}>
        <AppText variant="monoLabel" color="inkSecondary">
          Dicas de Segurança
        </AppText>
        <View style={{ gap: theme.spacing.xs }}>
          {SECURITY_TIPS.map((tip) => (
            <View key={tip} style={[styles.tipRow, { gap: theme.spacing.xs }]}>
              <CheckCircle2
                size={16}
                strokeWidth={1.75}
                color={theme.colors.accent}
              />
              <AppText variant="caption" color="inkSecondary" style={styles.flexText}>
                {tip}
              </AppText>
            </View>
          ))}
        </View>
      </Surface>
    </Screen>
  );
};

const styles = StyleSheet.create({
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexText: {
    flex: 1,
  },
});

export default ChangePasswordScreen;
