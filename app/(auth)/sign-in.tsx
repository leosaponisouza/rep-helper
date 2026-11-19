import React, { useState, useEffect } from 'react';
import { Keyboard, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertCircle, Lock, Mail } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Google from 'expo-auth-session/providers/google';
import { Auth, AuthCredential, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../src/utils/firebaseClientConfig';
import { useAuth } from '../../src/context/AuthContext';
import { ErrorHandler } from '../../src/utils/errorHandling';
import { loginSchema, LoginFormData } from '../../src/validation/authSchemas';
import { clearAuthData } from '../../src/utils/storage';
import { logger } from '../../src/utils/logger';
import {
  AppText,
  Button,
  Divider,
  GoogleIcon,
  Screen,
  Surface,
  TextField,
  useTheme,
  useThemedStyles,
} from '../../src/design-system';

const LoginScreen = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles((t) => ({
    screenContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: t.spacing.xl,
    },
    container: {
      width: '100%',
      maxWidth: 420,
      gap: t.spacing.lg,
    },
    brandHeader: {
      alignItems: 'center',
      gap: t.spacing.xxs,
    },
    centeredText: {
      textAlign: 'center',
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
    errorBannerText: {
      flex: 1,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
      marginVertical: t.spacing.xxs,
    },
    dividerLine: {
      flex: 1,
    },
    linksContainer: {
      alignItems: 'center',
      gap: t.spacing.xs,
    },
    signupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: t.spacing.xxs,
    },
  }));

  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { loginWithCredentials, loading, error, clearError, loginWithFirebaseToken } = useAuth();
  const router = useRouter();

  // Configuração do React Hook Form com Zod
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Configuração do Google Auth para funcionar em Expo Go e builds nativas
  const [, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID || 'android-client-id-placeholder',
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID || 'ios-client-id-placeholder',
    webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID || 'web-client-id-placeholder',
  });

  const activeGoogleClientId =
    Platform.OS === 'web'
      ? process.env.EXPO_PUBLIC_WEB_CLIENT_ID
      : Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_IOS_CLIENT_ID
        : process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID;

  const isGoogleAuthConfigured = Boolean(
    activeGoogleClientId &&
      activeGoogleClientId.trim().length > 0 &&
      !activeGoogleClientId.trim().endsWith('-placeholder')
  );

  // Sincronizar os estados de loading e erro do AuthContext com os locais
  useEffect(() => {
    setLocalLoading(loading);
    if (error) {
      setLocalError(error);
    }
  }, [loading, error]);

  // Efeito para lidar com a resposta do Google
  useEffect(() => {
    if (response?.type === 'success') {
      const accessToken = response.authentication?.accessToken;
      const idToken = response.authentication?.idToken;

      if (idToken) {
        void signInWithGoogleCredential(GoogleAuthProvider.credential(idToken), 'ID Token');
      } else if (accessToken) {
        void signInWithGoogleCredential(
          GoogleAuthProvider.credential(null, accessToken),
          'Access Token'
        );
      } else {
        setLocalError('Falha ao obter token do Google');
      }
    }
  }, [response]);

  const handleLogin = async (data: LoginFormData) => {
    Keyboard.dismiss();

    if (localLoading) {
      return;
    }

    setLocalError(null);
    setLocalLoading(true);

    try {
      await clearAuthData();
      await loginWithCredentials(data.email, data.password);
    } catch (err: any) {
      setLocalError(err?.message || 'Erro ao fazer login');
      setLocalLoading(false);
    }
  };

  // Limpa o erro quando o usuário interage com os campos
  const handleFieldFocus = () => {
    clearError();
    setLocalError(null);
  };

  const signInWithGoogleCredential = async (
    credential: AuthCredential,
    tokenKind: 'ID Token' | 'Access Token'
  ) => {
    try {
      setGoogleLoading(true);
      setLocalError(null);

      const userCredential = await signInWithCredential(auth as Auth, credential);
      const firebaseToken = await userCredential.user.getIdToken();

      await loginWithFirebaseToken(firebaseToken);
    } catch (err) {
      logger.error(`Erro no login com Google (${tokenKind}):`, err);
      const parsedError = await ErrorHandler.parseError(err);
      setLocalError(parsedError.message);
      ErrorHandler.logError(parsedError);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isGoogleAuthConfigured) {
      setLocalError('Login com Google não configurado neste ambiente.');
      return;
    }
    try {
      setGoogleLoading(true);
      await promptAsync();
    } catch {
      setLocalError('Erro ao iniciar login com Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding width="standard" contentContainerStyle={styles.screenContent}>
      <View style={styles.container}>
        <View style={styles.brandHeader}>
          <AppText variant="monoLabel" color="accent">
            REPHELPER
          </AppText>
          <AppText variant="display" color="ink" style={styles.centeredText}>
            RepHelper
          </AppText>
          <AppText variant="body" color="inkSecondary" style={styles.centeredText}>
            Gerenciamento de repúblicas
          </AppText>
        </View>

        <Surface tone="surface" bordered padded="lg" style={styles.formSurface}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Email"
                placeholder="seu@email.com"
                value={value}
                onChangeText={onChange}
                onFocus={handleFieldFocus}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                editable={!localLoading && !googleLoading}
                leftIcon={<Mail size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Senha"
                placeholder="Sua senha"
                value={value}
                onChangeText={onChange}
                onFocus={handleFieldFocus}
                onBlur={onBlur}
                secureToggle
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                editable={!localLoading && !googleLoading}
                leftIcon={<Lock size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />}
                error={errors.password?.message}
              />
            )}
          />

          {localError ? (
            <Surface
              tone="surface"
              radiusKey="sm"
              padded="sm"
              style={styles.errorBanner}
              accessibilityLiveRegion="polite"
            >
              <AlertCircle size={18} strokeWidth={1.75} color={theme.colors.danger} />
              <AppText variant="caption" color="danger" style={styles.errorBannerText}>
                {localError}
              </AppText>
            </Surface>
          ) : null}

          <Button
            label={localLoading ? 'Autenticando...' : 'Entrar'}
            variant="primary"
            fullWidth
            loading={localLoading}
            disabled={googleLoading}
            onPress={handleSubmit(handleLogin)}
          />

          <View style={styles.dividerRow}>
            <Divider style={styles.dividerLine} />
            <AppText variant="monoLabel" color="inkMuted">
              OU
            </AppText>
            <Divider style={styles.dividerLine} />
          </View>

          <Button
            label="Continuar com Google"
            variant="secondary"
            fullWidth
            loading={googleLoading}
            disabled={localLoading || !isGoogleAuthConfigured}
            leftIcon={<GoogleIcon size={20} />}
            onPress={handleGoogleSignIn}
          />
        </Surface>

        <View style={styles.linksContainer}>
          <Button
            label="Esqueceu sua senha?"
            variant="ghost"
            size="sm"
            onPress={() => router.push('/(auth)/forgot-password')}
          />

          <View style={styles.signupRow}>
            <AppText variant="body" color="inkSecondary">
              Não tem uma conta?
            </AppText>
            <Button
              label="Cadastre-se"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(auth)/sign-up')}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
};

export default LoginScreen;
