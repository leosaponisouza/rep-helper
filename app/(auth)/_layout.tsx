// app/(auth)/_layout.tsx
import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { AuthProtection } from '../../src/utils/authProtection';
import { fontFamilies, IconButton, useTheme } from '../../src/design-system';

export default function AuthLayout() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <AuthProtection>
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
        <Stack.Screen
          name="sign-in"
          options={{
            title: 'Login',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="sign-up"
          options={{
            title: 'Cadastro',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{
            title: 'Recuperar Senha',
            headerShown: false,
          }}
        />
      </Stack>
    </AuthProtection>
  );
}
