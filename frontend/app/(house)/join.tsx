// app/(house)/join.tsx
import React, { useState } from 'react';
import { Keyboard, View } from 'react-native';
import { useRouter } from 'expo-router';
import { KeyRound, LogIn } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import * as houseService from '../../src/services/houseService';
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

const JoinHouseScreen = () => {
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

  const handleJoinHouse = async () => {
    Keyboard.dismiss();
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      const msg = 'Por favor, insira o código da casa';
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
      const response = await houseService.joinHouse(trimmedCode);
      await login(response.token, response.user, response.refreshToken);

      toast({
        title: 'Sucesso',
        message: 'Você entrou na casa com sucesso!',
        tone: 'success',
      });
      router.replace('/(panel)/home');
    } catch (err: any) {
      const msg = err?.message || 'Não foi possível entrar na casa';
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
          title="Entrar em uma Casa"
          subtitle="Digite o código compartilhado por um morador"
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
            Digite o código de convite da casa para participar
          </AppText>

          <TextField
            label="Código da Casa"
            placeholder="Código da Casa"
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
            label="Entrar na Casa"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={!code.trim()}
            leftIcon={<LogIn size={18} strokeWidth={1.75} color={theme.colors.onAccent} />}
            onPress={() => void handleJoinHouse()}
          />
        </Surface>
      </View>
    </Screen>
  );
};

export default JoinHouseScreen;
