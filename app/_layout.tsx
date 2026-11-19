// app/_layout.tsx
import 'react-native-url-polyfill/auto';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { useFonts } from 'expo-font';
import { SourceSerif4_600SemiBold } from '@expo-google-fonts/source-serif-4';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { NotificationProvider } from '../src/context/NotificationContext';
import { ThemeProvider } from '../src/design-system/theme/ThemeContext';
import { useTheme } from '../src/design-system/theme/useTheme';
import {
  configureNotifications,
  registerForPushNotificationsAsync,
} from '../src/services/notifications';
import { logger } from '../src/utils/logger';

// Manter splash screen visível enquanto inicializamos fontes e tema
Promise.resolve(SplashScreen.preventAutoHideAsync()).catch(() => {});

function RootLayoutShell({ fontsReady }: { fontsReady: boolean }) {
  const { theme, ready: themeReady } = useTheme();
  const hasHiddenSplashRef = useRef(false);

  useEffect(() => {
    if (fontsReady && themeReady && !hasHiddenSplashRef.current) {
      hasHiddenSplashRef.current = true;
      Promise.resolve(SplashScreen.hideAsync()).catch(() => {});
    }
  }, [fontsReady, themeReady]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SourceSerif4_600SemiBold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    if (fontError) {
      logger.warn('Falha ao carregar fontes customizadas; usando fallback do sistema:', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    configureNotifications();

    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          logger.debug('Token de notificação registrado');
        }
      })
      .catch((error) => {
        logger.warn('Falha ao registrar notificações push:', error);
      });
  }, []);

  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <RootLayoutShell fontsReady={fontsReady} />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
