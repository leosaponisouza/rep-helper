// app/(panel)/finances/_layout.tsx
import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { fontFamilies, IconButton, useTheme } from '../../../src/design-system';

export default function FinancesLayout() {
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
        name="expenses/index"
        options={{
          title: 'Despesas',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="expenses/create"
        options={{
          title: 'Nova Despesa',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="expenses/edit"
        options={{
          title: 'Editar Despesa',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="expenses/[id]"
        options={{
          title: 'Detalhes da Despesa',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="incomes/index"
        options={{
          title: 'Receitas',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="incomes/create"
        options={{
          title: 'Nova Receita',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="incomes/edit"
        options={{
          title: 'Editar Receita',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="incomes/[id]"
        options={{
          title: 'Detalhes da Receita',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
