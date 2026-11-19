// app/(panel)/settings/_layout.tsx
import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { fontFamilies, IconButton, useTheme } from '../../../src/design-system';

export default function SettingsLayout() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.bg,
        },
        headerTintColor: theme.colors.ink,
        headerTitleStyle: {
          fontFamily: fontFamilies.sansSemiBold,
          color: theme.colors.ink,
        },
        headerShadowVisible: false,
        headerBackVisible: true,
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.bg,
        },
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <IconButton
              icon={
                <ChevronLeft
                  size={22}
                  strokeWidth={1.75}
                  color={theme.colors.ink}
                />
              }
              onPress={() => router.back()}
              accessibilityLabel="Voltar"
              variant="ghost"
            />
          ) : null,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="appearance" options={{ title: 'Aparência' }} />
      <Stack.Screen name="account" options={{ title: 'Conta' }} />
      <Stack.Screen name="about" options={{ title: 'Sobre' }} />
      <Stack.Screen name="terms-of-use" options={{ title: 'Termos de Uso' }} />
      <Stack.Screen name="privacy-policy" options={{ title: 'Política de Privacidade' }} />
      <Stack.Screen name="software-licenses" options={{ title: 'Licenças de Software' }} />
      <Stack.Screen name="republic" options={{ title: 'República' }} />
      <Stack.Screen name="members" options={{ title: 'Membros' }} />
      <Stack.Screen name="help" options={{ title: 'Ajuda' }} />
      <Stack.Screen name="change-password" options={{ title: 'Alterar Senha' }} />
    </Stack>
  );
}
