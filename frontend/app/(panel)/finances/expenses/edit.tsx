// app/(panel)/finances/expenses/edit.tsx
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import CreateExpenseScreen from './create';

/**
 * ExpenseEditScreen - Validates the expense route parameter and delegates editing
 * to CreateExpenseScreen.
 */
export default function ExpenseEditScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const isValidId = Boolean(
    params.id && /^\d+$/.test(params.id) && Number(params.id) > 0
  );

  if (!isValidId) {
    return <Redirect href="/(panel)/finances/expenses" />;
  }

  return <CreateExpenseScreen />;
}
