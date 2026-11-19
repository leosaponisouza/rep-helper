// app/(panel)/tasks/_layout.tsx
import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { fontFamilies, IconButton, useTheme } from '../../../src/design-system';

export default function TasksLayout() {
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
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Criar Tarefa',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: 'Editar Tarefa',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Detalhes da Tarefa',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
