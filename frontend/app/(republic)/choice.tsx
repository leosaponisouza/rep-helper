// app/(republic)/choice.tsx
import React, { useState, useEffect } from 'react';
import { Keyboard, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Home, KeyRound, LogIn, PlusCircle, WifiOff } from 'lucide-react-native';
import api from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import * as republicService from '../../src/services/republicService';
import { logger } from '../../src/utils/logger';
import {
  AppText,
  Button,
  Divider,
  Screen,
  Surface,
  TextField,
  useFeedback,
  useTheme,
  useThemedStyles,
} from '../../src/design-system';

const RepublicChoiceScreen = () => {
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const { login, user } = useAuth();
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
      maxWidth: 460,
      gap: t.spacing.lg,
    },
    networkBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs,
      backgroundColor: t.colors.dangerSoft,
      borderLeftWidth: 3,
      borderLeftColor: t.colors.danger,
    },
    networkBannerText: {
      flex: 1,
    },
    heroHeader: {
      alignItems: 'center',
      gap: t.spacing.xs,
    },
    heroIconBadge: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.spacing.xxs,
    },
    centeredText: {
      textAlign: 'center',
    },
    joinCard: {
      gap: t.spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.xs,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
    },
    dividerLine: {
      flex: 1,
    },
  }));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [networkStatus, setNetworkStatus] = useState({ connected: true, checking: true });

  useEffect(() => {
    checkNetworkConnectivity();
  }, []);

  const checkNetworkConnectivity = async () => {
    try {
      await api.get('/api/v1/health');
      setNetworkStatus({ connected: true, checking: false });
    } catch (err) {
      setNetworkStatus({ connected: false, checking: false });
      logger.debug('API connection check failed:', err);
    }
  };

  const handleJoinRepublic = async () => {
    Keyboard.dismiss();
    const trimmedCode = joinCode.trim();
    if (!trimmedCode) {
      const msg = 'Por favor, digite o código da república.';
      setError(msg);
      toast({
        title: 'Erro',
        message: msg,
        tone: 'warning',
      });
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (!user) {
        throw new Error('Usuário não autenticado.');
      }

      const response = await republicService.joinRepublic(trimmedCode);

      await login(response.token, response.user, response.refreshToken);

      toast({
        title: 'Sucesso',
        message: 'Você entrou na república com sucesso!',
        tone: 'success',
      });
      router.replace('/(panel)/home');
    } catch (err: any) {
      const message = err?.message || 'Falha ao entrar na república.';
      setError(message);
      toast({
        title: 'Erro',
        message,
        tone: 'danger',
      });
      logger.error('Error joining republic:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding width="standard" contentContainerStyle={styles.screenContent}>
      <View style={styles.container}>
        {!networkStatus.connected && !networkStatus.checking ? (
          <Surface
            tone="surface"
            radiusKey="sm"
            padded="sm"
            style={styles.networkBanner}
            accessibilityLiveRegion="polite"
          >
            <WifiOff size={18} strokeWidth={1.75} color={theme.colors.danger} />
            <AppText variant="caption" color="danger" style={styles.networkBannerText}>
              Sem conexão com o servidor
            </AppText>
          </Surface>
        ) : null}

        <View style={styles.heroHeader}>
          <Surface tone="subtle" radiusKey="full" style={styles.heroIconBadge}>
            <Home size={28} strokeWidth={1.75} color={theme.colors.accent} />
          </Surface>
          <AppText variant="display" color="ink" style={styles.centeredText}>
            Bem-vindo
          </AppText>
          <AppText variant="body" color="inkSecondary" style={styles.centeredText}>
            Entre com um código ou crie sua república
          </AppText>
        </View>

        <Surface tone="surface" bordered padded="lg" style={styles.joinCard}>
          <View style={styles.sectionHeader}>
            <KeyRound size={20} strokeWidth={1.75} color={theme.colors.accent} />
            <AppText variant="heading" color="ink">
              Entrar em uma República
            </AppText>
          </View>

          <AppText variant="body" color="inkSecondary">
            Insira o código de convite fornecido pelo administrador da república
          </AppText>

          <TextField
            label="Código da República"
            placeholder="Código da República"
            value={joinCode}
            onChangeText={(text) => {
              setJoinCode(text);
              if (error) setError('');
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}
            leftIcon={<KeyRound size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />}
            error={error || undefined}
          />

          <Button
            label="Entrar na República"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={!networkStatus.connected || !joinCode.trim()}
            leftIcon={<LogIn size={18} strokeWidth={1.75} color={theme.colors.onAccent} />}
            onPress={handleJoinRepublic}
          />
        </Surface>

        <View style={styles.dividerRow}>
          <Divider style={styles.dividerLine} />
          <AppText variant="monoLabel" color="inkMuted">
            OU
          </AppText>
          <Divider style={styles.dividerLine} />
        </View>

        <Button
          label="Criar Nova República"
          variant="secondary"
          fullWidth
          leftIcon={<PlusCircle size={18} strokeWidth={1.75} color={theme.colors.ink} />}
          onPress={() => router.push('/(republic)/new')}
        />
      </View>
    </Screen>
  );
};

export default RepublicChoiceScreen;
