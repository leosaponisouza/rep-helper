// app/(republic)/join.tsx
import React, { useState } from 'react';
import { Keyboard, View } from 'react-native';
import { useRouter } from 'expo-router';
import { KeyRound, LogIn } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import * as republicService from '../../src/services/republicService';
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

const JoinRepublicScreen = () => {
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const { login } = useAuth();
  const router = useRouter();

  const styles = useThemedStyles((t) => ({
    screenContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: t.spacing.xl,
    },
    container: {
      width: '100%',
      maxWidth: 440,
    },
    card: {
      gap: t.spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs,
    },
  }));

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);

  const handleJoinRepublic = async () => {
    Keyboard.dismiss();
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      const msg = 'Por favor, insira o código da república';
      setFieldError(msg);
      toast({
        title: 'Erro',
        message: msg,
        tone: 'warning',
      });
      return;
    }

    setLoading(true);
    setFieldError(undefined);

    try {
      const response = await republicService.joinRepublic(trimmedCode);

      // Atualizar contexto de autenticação com os novos dados do usuário
      await login(response.token, response.user);

      toast({
        title: 'Sucesso',
        message: 'Você entrou na república com sucesso!',
        tone: 'success',
      });
      router.replace('/(panel)/home');
    } catch (err: any) {
      const msg = err?.message || 'Não foi possível entrar na república';
      setFieldError(msg);
      toast({
        title: 'Erro',
        message: msg,
        tone: 'danger',
      });
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
          title="Entrar em uma República"
          subtitle="Digite o código fornecido pelo administrador"
          onBack={() => router.back()}
        />
      }
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.container}>
        <Surface tone="surface" bordered padded="lg" style={styles.card}>
          <View style={styles.headerRow}>
            <KeyRound size={20} strokeWidth={1.75} color={theme.colors.accent} />
            <AppText variant="heading" color="ink">
              Código de convite
            </AppText>
          </View>

          <AppText variant="body" color="inkSecondary">
            Digite o código fornecido pelo administrador da república
          </AppText>

          <TextField
            label="Código da República"
            placeholder="Código da República"
            value={code}
            onChangeText={(text) => {
              setCode(text);
              if (fieldError) setFieldError(undefined);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}
            leftIcon={<KeyRound size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />}
            error={fieldError}
          />

          <Button
            label="Entrar na República"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={!code.trim()}
            leftIcon={<LogIn size={18} strokeWidth={1.75} color={theme.colors.onAccent} />}
            onPress={handleJoinRepublic}
          />
        </Surface>
      </View>
    </Screen>
  );
};

export default JoinRepublicScreen;
