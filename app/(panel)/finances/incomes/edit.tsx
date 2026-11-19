// app/(panel)/finances/incomes/edit.tsx
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import CreateIncomeScreen from './create';

/**
 * IncomeEditScreen - Validates the income route parameter and delegates editing
 * to CreateIncomeScreen.
 */
export default function IncomeEditScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const isValidId = Boolean(
    params.id && /^\d+$/.test(params.id) && Number(params.id) > 0
  );

  if (!isValidId) {
    return <Redirect href="/(panel)/finances/incomes" />;
  }

  return <CreateIncomeScreen />;
}
