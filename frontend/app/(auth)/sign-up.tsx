// app/(auth)/sign-up.tsx
import React, { useState, useEffect } from 'react';
import { Keyboard, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  AtSign,
  Lock,
  type LucideIcon,
  Mail,
  Phone,
  User,
  UserPlus,
} from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../src/context/AuthContext';
import { signUpSchema, SignUpFormData } from '../../src/validation/authSchemas';
import { clearAuthData } from '../../src/utils/storage';
import {
  AppText,
  Button,
  Screen,
  ScreenHeader,
  Surface,
  TextField,
  type TextFieldProps,
  useTheme,
  useThemedStyles,
} from '../../src/design-system';

interface SignUpFieldConfig {
  name: keyof SignUpFormData;
  label: string;
  placeholder: string;
  Icon: LucideIcon;
  keyboardType?: TextFieldProps['keyboardType'];
  autoCapitalize?: TextFieldProps['autoCapitalize'];
  autoCorrect?: boolean;
  secureToggle?: boolean;
}

const SIGN_UP_FIELDS: ReadonlyArray<SignUpFieldConfig> = [
  {
    name: 'name',
    label: 'Nome completo',
    placeholder: 'Nome completo',
    Icon: User,
    autoCapitalize: 'words',
  },
  {
    name: 'nickname',
    label: 'Apelido (opcional)',
    placeholder: 'Apelido (opcional)',
    Icon: AtSign,
    autoCapitalize: 'words',
  },
  {
    name: 'phone',
    label: 'Telefone (opcional)',
    placeholder: 'Telefone (opcional)',
    Icon: Phone,
    keyboardType: 'phone-pad',
  },
  {
    name: 'email',
    label: 'Email',
    placeholder: 'seu@email.com',
    Icon: Mail,
    keyboardType: 'email-address',
    autoCapitalize: 'none',
    autoCorrect: false,
  },
  {
    name: 'password',
    label: 'Senha',
    placeholder: 'Mínimo 8 caracteres',
    Icon: Lock,
    secureToggle: true,
    autoCapitalize: 'none',
    autoCorrect: false,
  },
  {
    name: 'confirmPassword',
    label: 'Confirmar senha',
    placeholder: 'Confirmar senha',
    Icon: Lock,
    secureToggle: true,
    autoCapitalize: 'none',
    autoCorrect: false,
  },
];

const SignUpScreen = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles((t) => ({
    screenContent: {
      flexGrow: 1,
      alignItems: 'center',
      paddingVertical: t.spacing.lg,
    },
    container: {
      width: '100%',
      maxWidth: 460,
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
    errorBannerText: {
      flex: 1,
    },
    loginRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: t.spacing.xxs,
    },
  }));

  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { signUp, loading, error, clearError } = useAuth();
  const router = useRouter();

  // Configuração do React Hook Form com Zod
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      nickname: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Limpa qualquer erro residual de outras telas de autenticação (ex.: /sign-in) ao abrir cadastro
  useEffect(() => {
    clearError();
    setLocalError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizar os estados de loading e erro do AuthContext com os locais
  useEffect(() => {
    setLocalLoading(loading);
    if (error) {
      setLocalError(error);
    }
  }, [loading, error]);

  // Limpa o erro quando o usuário interage com os campos
  const handleFieldFocus = () => {
    clearError();
    setLocalError(null);
  };

  const handleSignUp = async (data: SignUpFormData) => {
    try {
      Keyboard.dismiss();

      if (localLoading) {
        return;
      }

      setLocalError(null);
      setLocalLoading(true);

      await clearAuthData();

      await signUp(data.email, data.password, {
        name: data.name,
        nickname: data.nickname || null,
        phoneNumber: data.phone || '',
      });
    } catch (err: any) {
      setLocalError(err?.message || 'Erro ao criar conta');
      setLocalLoading(false);
    }
  };

  return (
    <Screen
      scroll
      keyboardAvoiding
      width="standard"
      header={
        <ScreenHeader
          title="Criar Conta"
          subtitle="Preencha os campos abaixo para criar sua conta"
          onBack={() => router.back()}
        />
      }
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.container}>
        <Surface tone="surface" bordered padded="lg" style={styles.formSurface}>
          {SIGN_UP_FIELDS.map(
            ({
              name,
              label,
              placeholder,
              Icon,
              keyboardType,
              autoCapitalize,
              autoCorrect,
              secureToggle,
            }) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label={label}
                    placeholder={placeholder}
                    value={value ?? ''}
                    onChangeText={onChange}
                    onFocus={handleFieldFocus}
                    onBlur={onBlur}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={autoCorrect}
                    secureToggle={secureToggle}
                    editable={!localLoading}
                    leftIcon={
                      <Icon size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />
                    }
                    error={errors[name]?.message}
                  />
                )}
              />
            )
          )}

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
            label={localLoading ? 'Criando conta...' : 'Criar Conta'}
            variant="primary"
            fullWidth
            loading={localLoading}
            leftIcon={<UserPlus size={18} strokeWidth={1.75} color={theme.colors.onAccent} />}
            onPress={handleSubmit(handleSignUp)}
          />
        </Surface>

        <View style={styles.loginRow}>
          <AppText variant="body" color="inkSecondary">
            Já tem uma conta?
          </AppText>
          <Button
            label="Entrar"
            variant="ghost"
            size="sm"
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </View>
      </View>
    </Screen>
  );
};

export default SignUpScreen;
