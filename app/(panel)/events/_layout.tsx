// app/(panel)/events/_layout.tsx
import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { fontFamilies, IconButton, useTheme } from '../../../src/design-system';

export default function EventsLayout() {
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
      <Stack.Screen name="create" />
      <Stack.Screen name="edit/[id]" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="invitations/[id]" />
    </Stack>
  );
}
