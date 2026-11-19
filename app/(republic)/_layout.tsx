// app/(republic)/_layout.tsx
import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { AuthProtection } from '../../src/utils/authProtection';
import { fontFamilies, IconButton, useTheme } from '../../src/design-system';

export default function RepublicLayout() {
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
          name="choice"
          options={{
            title: 'Escolha de República',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="new"
          options={{
            title: 'Nova República',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="join"
          options={{
            title: 'Entrar em República',
            headerShown: false,
          }}
        />
      </Stack>
    </AuthProtection>
  );
}
