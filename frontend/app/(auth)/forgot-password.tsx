// app/(auth)/forgot-password.tsx
import React, { useState } from 'react';
import { Keyboard, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertCircle, CheckCircle2, KeyRound, Lock, Mail, Send } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  forgotPasswordSchema,
  ForgotPasswordFormData,
  strongPasswordSchema,
} from '../../src/validation/authSchemas';
import {
  requestPasswordReset,
  resetPasswordWithCode,
} from '../../src/services/authService';
import { ErrorHandler } from '../../src/utils/errorHandling';
import {
  AppText,
  Button,
  Screen,
  ScreenHeader,
  Surface,
  TextField,
  useFeedback,
  useTheme,
  useThemedStyles,
} from '../../src/design-system';

const GENERIC_RESET_MESSAGE =
  'Se existir uma conta associada a este email, enviaremos um código de 6 dígitos para redefinição.';

const ForgotPasswordScreen = () => {
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const router = useRouter();

  const styles = useThemedStyles((t) => ({
    screenContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingVertical: t.spacing.xl,
    },
    container: {
      width: '100%',
      maxWidth: 440,
      gap: t.spacing.lg,
    },
    formSurface: {
      gap: t.spacing.md,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs,
      backgroundColor: t.colors.dangerSoft,
      borderLeftWidth: 3,
      borderLeftColor: t.colors.danger,
    },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs,
      backgroundColor: t.colors.successSoft,
      borderLeftWidth: 3,
      borderLeftColor: t.colors.success,
    },
    bannerText: {
      flex: 1,
    },
  }));

  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [targetEmail, setTargetEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleRequestCode = async (data: ForgotPasswordFormData) => {
    if (loading) return;

    Keyboard.dismiss();
    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const message = await requestPasswordReset(data.email);
      setTargetEmail(data.email.trim().toLowerCase());
      setInfoMessage(message || GENERIC_RESET_MESSAGE);
      setStep('confirm');
      toast({
        title: 'Solicitação enviada',
        message: message || GENERIC_RESET_MESSAGE,
        tone: 'success',
        duration: 4500,
      });
    } catch (err) {
      const parsed = await ErrorHandler.parseError(err);
      setError(parsed.message || 'Erro ao solicitar código de redefinição.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (loading) return;

    Keyboard.dismiss();
    setError('');

    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Digite o código numérico de 6 dígitos enviado para seu email.');
      return;
    }

    const passwordCheck = strongPasswordSchema.safeParse(newPassword);
    if (!passwordCheck.success) {
      setError(passwordCheck.error.issues[0]?.message || 'Nova senha inválida.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      setLoading(true);
      await resetPasswordWithCode(targetEmail, cleanCode, newPassword);
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: 'Senha redefinida',
        message: 'Sua senha foi redefinida com sucesso. Faça login com a nova senha.',
        tone: 'success',
      });
      router.replace('/(auth)/sign-in');
    } catch (err) {
      const parsed = await ErrorHandler.parseError(err);
      setError(parsed.message || 'Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      scroll
      keyboardAvoiding
      width="standard"
      header={
        <ScreenHeader
          title="Esqueceu sua senha?"
          subtitle="Recuperação de acesso"
          onBack={() => (step === 'confirm' ? setStep('request') : router.back())}
        />
      }
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.container}>
        <AppText variant="body" color="inkSecondary">
          {step === 'request'
            ? 'Digite seu email abaixo para receber um código de 6 dígitos para redefinir sua senha.'
            : `Informe o código de 6 dígitos enviado para ${targetEmail} e defina sua nova senha.`}
        </AppText>

        <Surface tone="surface" bordered padded="lg" style={styles.formSurface}>
          {step === 'request' ? (
            <>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Email"
                    placeholder="seu@email.com"
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      if (error) setError('');
                    }}
                    onFocus={() => {
                      if (error) setError('');
                    }}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    leftIcon={<Mail size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />}
                    error={errors.email?.message}
                  />
                )}
              />

              {error ? (
                <Surface
                  tone="surface"
                  radiusKey="sm"
                  padded="sm"
                  style={styles.errorBanner}
                  accessibilityLiveRegion="polite"
                >
                  <AlertCircle size={18} strokeWidth={1.75} color={theme.colors.danger} />
                  <AppText variant="caption" color="danger" style={styles.bannerText}>
                    {error}
                  </AppText>
                </Surface>
              ) : null}

              <Button
                label="Enviar código"
                variant="primary"
                fullWidth
                loading={loading}
                leftIcon={<Send size={18} strokeWidth={1.75} color={theme.colors.onAccent} />}
                onPress={handleSubmit(handleRequestCode)}
              />
            </>
          ) : (
            <>
              {infoMessage ? (
                <Surface
                  tone="surface"
                  radiusKey="sm"
                  padded="sm"
                  style={styles.successBanner}
                  accessibilityLiveRegion="polite"
                >
                  <CheckCircle2 size={18} strokeWidth={1.75} color={theme.colors.success} />
                  <AppText variant="caption" color="success" style={styles.bannerText}>
                    {infoMessage}
                  </AppText>
                </Surface>
              ) : null}

              <TextField
                label="Código de 6 dígitos"
                placeholder="000000"
                value={code}
                onChangeText={(text) => {
                  setCode(text.replace(/\D/g, '').slice(0, 6));
                  if (error) setError('');
                }}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
                leftIcon={<KeyRound size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />}
              />

              <TextField
                label="Nova senha"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (error) setError('');
                }}
                secureToggle
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                leftIcon={<Lock size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />}
              />

              <TextField
                label="Confirmar nova senha"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (error) setError('');
                }}
                secureToggle
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                leftIcon={<Lock size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />}
              />

              {error ? (
                <Surface
                  tone="surface"
                  radiusKey="sm"
                  padded="sm"
                  style={styles.errorBanner}
                  accessibilityLiveRegion="polite"
                >
                  <AlertCircle size={18} strokeWidth={1.75} color={theme.colors.danger} />
                  <AppText variant="caption" color="danger" style={styles.bannerText}>
                    {error}
                  </AppText>
                </Surface>
              ) : null}

              <Button
                label="Redefinir senha"
                variant="primary"
                fullWidth
                loading={loading}
                onPress={handleConfirmReset}
              />

              <Button
                label="Alterar email / reenviar código"
                variant="ghost"
                size="sm"
                fullWidth
                disabled={loading}
                onPress={() => {
                  setError('');
                  setStep('request');
                }}
              />
            </>
          )}

          <Button
            label="Voltar para o login"
            variant="ghost"
            size="sm"
            fullWidth
            onPress={() => router.replace('/(auth)/sign-in')}
          />
        </Surface>
      </View>
    </Screen>
  );
};

export default ForgotPasswordScreen;
