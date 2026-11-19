// app/(panel)/finances/expenses/index.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Receipt } from 'lucide-react-native';
import ExpenseFilters, {
  FilterOption,
} from '../../../../components/Finances/ExpenseFilters';
import ExpenseItem from '../../../../components/Finances/ExpenseItem';
import { useAuth } from '../../../../src/context/AuthContext';
import {
  Button,
  Divider,
  Screen,
  ScreenHeader,
  StateView,
  StatusText,
  Surface,
  useTheme,
} from '../../../../src/design-system';
import { ExpenseFilterType, useFinances } from '../../../../src/hooks/useFinances';
import { Expense } from '../../../../src/models/finances.model';

const AVAILABLE_FILTERS: FilterOption[] = [
  { key: 'ALL', label: 'Todas' },
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'APPROVED', label: 'Aprovadas' },
  { key: 'REJECTED', label: 'Rejeitadas' },
  { key: 'REIMBURSED', label: 'Reembolsadas' },
];

interface ExpensesScreenProps {
  hideHeader?: boolean;
}

const ExpensesScreen: React.FC<ExpensesScreenProps> = ({ hideHeader = false }) => {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const {
    expenses,
    loadingExpenses,
    expensesError,
    fetchExpenses,
    applyExpenseFilter,
    expenseFilter,
  } = useFinances({
    initialFilter: 'ALL',
  });

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(panel)/finances');
    }
  }, [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchExpenses();
    } finally {
      setRefreshing(false);
    }
  }, [fetchExpenses]);

  const handleExpensePress = useCallback(
    (expense: Expense) => {
      router.push(`/(panel)/finances/expenses/${expense.id}`);
    },
    [router]
  );

  const handleFilterChange = useCallback(
    (newFilter: ExpenseFilterType) => {
      applyExpenseFilter(newFilter);
    },
    [applyExpenseFilter]
  );

  const navigateToCreateExpense = useCallback(() => {
    router.push('/(panel)/finances/expenses/create');
  }, [router]);

  const getStatusLabel = (filter: ExpenseFilterType): string => {
    const filterOption = AVAILABLE_FILTERS.find((f) => f.key === filter);
    return filterOption ? filterOption.label.toLowerCase() : '';
  };

  const subtitle = useMemo(() => {
    if (loadingExpenses && expenses.length === 0) return 'Carregando...';
    const count = expenses.length;
    return `${count} ${count === 1 ? 'despesa' : 'despesas'}`;
  }, [loadingExpenses, expenses.length]);

  const body = (
    <View style={styles.body}>
      <View style={{ paddingVertical: theme.spacing.sm }}>
        <ExpenseFilters
          filters={AVAILABLE_FILTERS}
          activeFilter={expenseFilter}
          onFilterChange={handleFilterChange}
        />
      </View>
      <Divider />

      {loadingExpenses && expenses.length === 0 ? (
        <StateView kind="loading" title="Carregando despesas..." />
      ) : expensesError && expenses.length === 0 ? (
        <StateView
          kind="error"
          title="Erro ao carregar despesas"
          description={expensesError}
          actionLabel="Tentar novamente"
          onAction={() => void handleRefresh()}
        />
      ) : (
        <FlatList<Expense>
          data={expenses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ExpenseItem
              expense={item}
              onPress={handleExpensePress}
              currentUserId={user?.uid}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: theme.spacing.sm }} />
          )}
          ListHeaderComponent={
            expensesError ? (
              <Surface
                tone="subtle"
                bordered
                padded="sm"
                radiusKey="sm"
                style={{
                  marginBottom: theme.spacing.sm,
                  gap: theme.spacing.xs,
                }}
              >
                <StatusText label={expensesError} tone="danger" showDot />
                <Button
                  label="Tentar novamente"
                  variant="secondary"
                  size="sm"
                  onPress={() => void handleRefresh()}
                />
              </Surface>
            ) : null
          }
          ListEmptyComponent={
            <StateView
              kind="empty"
              icon={
                <Receipt
                  size={32}
                  strokeWidth={1.75}
                  color={theme.colors.inkMuted}
                />
              }
              title={
                expenseFilter !== 'ALL'
                  ? `Nenhuma despesa ${getStatusLabel(expenseFilter)}`
                  : 'Nenhuma despesa cadastrada'
              }
              description="Registre uma despesa para acompanhar aprovações e reembolsos."
              actionLabel="Registrar Despesa"
              onAction={navigateToCreateExpense}
            />
          }
          contentContainerStyle={[
            styles.listContainer,
            {
              padding: theme.spacing.md,
              paddingBottom: theme.spacing.xxl,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              colors={[theme.colors.accent]}
              tintColor={theme.colors.accent}
            />
          }
          removeClippedSubviews={Platform.OS !== 'web'}
        />
      )}
    </View>
  );

  if (hideHeader) {
    return body;
  }

  return (
    <Screen
      width="wide"
      padded={false}
      header={
        <ScreenHeader
          title="Despesas"
          subtitle={subtitle}
          onBack={handleBack}
          rightActions={
            <Button
              label="Nova"
              variant="primary"
              size="sm"
              leftIcon={
                <Plus size={16} strokeWidth={1.75} color={theme.colors.onAccent} />
              }
              onPress={navigateToCreateExpense}
              accessibilityLabel="Registrar nova despesa"
            />
          }
        />
      }
    >
      {body}
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    minHeight: 0,
  },
  listContainer: {
    flexGrow: 1,
  },
});

export default ExpensesScreen;
