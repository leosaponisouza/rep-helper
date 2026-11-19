// app/(auth)/forgot-password.tsx
import React, { useState } from 'react';
import { Keyboard, View } from 'react-native';
import { Auth, sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { AlertCircle, CheckCircle2, Mail, Send } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { auth } from '../../src/utils/firebaseClientConfig';
import {
  forgotPasswordSchema,
  ForgotPasswordFormData,
} from '../../src/validation/authSchemas';
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
  'Se existir uma conta associada a este email, enviaremos um link de redefinição de senha.';

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Configuração do React Hook Form com Zod
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

  const showGenericResetConfirmation = () => {
    setSuccess(true);
    toast({
      title: 'Sucesso',
      message: GENERIC_RESET_MESSAGE,
      tone: 'success',
      duration: 5000,
    });
    router.replace('/(auth)/sign-in');
  };

  const handleResetPassword = async (data: ForgotPasswordFormData) => {
    if (loading) return;

    Keyboard.dismiss();
    setLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth as Auth, data.email);
      showGenericResetConfirmation();
    } catch (err: any) {
      if (err?.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else if (err?.code === 'auth/user-not-found') {
        showGenericResetConfirmation();
      } else {
        setError('Erro ao enviar email de redefinição. Tente novamente.');
      }
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
          onBack={() => router.back()}
        />
      }
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.container}>
        <AppText variant="body" color="inkSecondary">
          Digite seu email abaixo para receber um link de redefinição de senha.
        </AppText>

        <Surface tone="surface" bordered padded="lg" style={styles.formSurface}>
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

          {success ? (
            <Surface
              tone="surface"
              radiusKey="sm"
              padded="sm"
              style={styles.successBanner}
              accessibilityLiveRegion="polite"
            >
              <CheckCircle2 size={18} strokeWidth={1.75} color={theme.colors.success} />
              <AppText variant="caption" color="success" style={styles.bannerText}>
                {GENERIC_RESET_MESSAGE}
              </AppText>
            </Surface>
          ) : null}

          <Button
            label="Enviar email"
            variant="primary"
            fullWidth
            loading={loading}
            leftIcon={<Send size={18} strokeWidth={1.75} color={theme.colors.onAccent} />}
            onPress={handleSubmit(handleResetPassword)}
          />

          <Button
            label="Voltar para o login"
            variant="ghost"
            size="sm"
            fullWidth
            onPress={() => router.back()}
          />
        </Surface>
      </View>
    </Screen>
  );
};

export default ForgotPasswordScreen;
