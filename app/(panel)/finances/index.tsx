// app/(panel)/finances/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react-native';
import AdjustBalanceModal from '../../../components/Finances/AdjustBalanceModal';
import CategoryChart from '../../../components/Finances/CategoryChart';
import FinancialSummary from '../../../components/Finances/FinancialSummary';
import MonthlyChart from '../../../components/Finances/MonthlyChart';
import PendingActions from '../../../components/Finances/PendingActions';
import RecentTransactions from '../../../components/Finances/RecentTransactions';
import { useAuth } from '../../../src/context/AuthContext';
import {
  BottomSheetModal,
  Button,
  Divider,
  ListRow,
  Screen,
  ScreenHeader,
  SegmentedTabs,
  Surface,
  useFeedback,
  useTheme,
  type SegmentedTabOption,
} from '../../../src/design-system';
import { useFinances } from '../../../src/hooks/useFinances';
import { PendingAction, Transaction } from '../../../src/models/finances.model';
import { ErrorHandler } from '../../../src/utils/errorHandling';
import { logger } from '../../../src/utils/logger';
import ExpensesScreen from './expenses/index';
import IncomesScreen from './incomes/index';

type TabType = 'dashboard' | 'expenses' | 'incomes';

const FinancesDashboardScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showNewSheet, setShowNewSheet] = useState(false);
  const [showAdjustBalanceModal, setShowAdjustBalanceModal] = useState(false);

  useEffect(() => {
    if (params.tab && ['dashboard', 'expenses', 'incomes'].includes(params.tab)) {
      setActiveTab(params.tab as TabType);
    }
  }, [params.tab]);

  const {
    dashboardSummary,
    monthlyData,
    categoryExpenses,
    pendingActions,
    recentTransactions,
    loadingDashboard,
    dashboardError,
    refreshFinancialData,
    adjustBalance,
  } = useFinances();

  const safePendingActions = Array.isArray(pendingActions) ? pendingActions : [];
  const isAdmin = Boolean(user?.isAdmin);

  const tabOptions = useMemo<ReadonlyArray<SegmentedTabOption<TabType>>>(
    () => [
      { value: 'dashboard', label: 'Resumo' },
      {
        value: 'expenses',
        label: 'Despesas',
        badge: safePendingActions.length > 0 ? safePendingActions.length : undefined,
      },
      { value: 'incomes', label: 'Receitas' },
    ],
    [safePendingActions.length]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshFinancialData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshFinancialData]);

  const handleTabChange = useCallback(
    (tab: TabType) => {
      setActiveTab(tab);
      router.setParams({ tab });
    },
    [router]
  );

  const navigateToExpenseDetails = useCallback(
    (id: number) => {
      router.push(`/(panel)/finances/expenses/${id}`);
    },
    [router]
  );

  const navigateToIncomeDetails = useCallback(
    (id: number) => {
      router.push(`/(panel)/finances/incomes/${id}`);
    },
    [router]
  );

  const navigateToCreateExpense = useCallback(() => {
    router.push('/(panel)/finances/expenses/create');
  }, [router]);

  const navigateToCreateIncome = useCallback(() => {
    router.push('/(panel)/finances/incomes/create');
  }, [router]);

  const navigateToExpensesList = useCallback(() => {
    handleTabChange('expenses');
  }, [handleTabChange]);

  const navigateToIncomesList = useCallback(() => {
    handleTabChange('incomes');
  }, [handleTabChange]);

  const handleTransactionPress = useCallback(
    (item: Transaction) => {
      if (item.type === 'EXPENSE') {
        navigateToExpenseDetails(item.id);
      } else {
        navigateToIncomeDetails(item.id);
      }
    },
    [navigateToExpenseDetails, navigateToIncomeDetails]
  );

  const handlePendingActionPress = useCallback(
    (action: PendingAction) => {
      navigateToExpenseDetails(action.id);
    },
    [navigateToExpenseDetails]
  );

  const handleAdjustBalance = useCallback(() => {
    if (isAdmin) {
      setShowAdjustBalanceModal(true);
    } else {
      toast({
        title: 'Permissão necessária',
        message: 'Apenas administradores podem ajustar o saldo da república.',
        tone: 'warning',
      });
    }
  }, [isAdmin, toast]);

  const handleAdjustBalanceSubmit = useCallback(
    async (newBalance: number, description: string): Promise<boolean> => {
      if (!user?.currentRepublicId) {
        toast({
          title: 'Erro',
          message:
            'Não foi possível identificar sua república. Tente novamente mais tarde.',
          tone: 'danger',
        });
        return false;
      }

      try {
        await adjustBalance(newBalance, description);
        await refreshFinancialData();
        toast({
          title: 'Saldo atualizado',
          message: 'Saldo da república atualizado com sucesso!',
          tone: 'success',
        });
        return true;
      } catch (error) {
        logger.error('Erro ao ajustar saldo:', error);
        void ErrorHandler.handle(error);
        return false;
      }
    },
    [user?.currentRepublicId, adjustBalance, refreshFinancialData, toast]
  );

  const header = (
    <ScreenHeader
      title="Finanças"
      rightActions={
        <Button
          label="Novo"
          variant="primary"
          size="sm"
          leftIcon={
            <Plus size={16} strokeWidth={1.75} color={theme.colors.onAccent} />
          }
          onPress={() => setShowNewSheet(true)}
          accessibilityLabel="Criar novo lançamento financeiro"
        />
      }
    />
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'expenses':
        return <ExpensesScreen hideHeader={true} />;
      case 'incomes':
        return <IncomesScreen hideHeader={true} />;
      default:
        return (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{
              padding: theme.spacing.md,
              gap: theme.spacing.md,
              paddingBottom: theme.spacing.xxl,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void handleRefresh()}
                colors={[theme.colors.accent]}
                tintColor={theme.colors.accent}
              />
            }
          >
            <FinancialSummary
              currentBalance={dashboardSummary?.currentBalance ?? 0}
              pendingExpenses={dashboardSummary?.pendingExpensesAmount ?? 0}
              approvedExpenses={dashboardSummary?.approvedExpensesAmount ?? 0}
              totalIncomes={dashboardSummary?.totalIncomes ?? 0}
              totalExpensesCurrentMonth={
                dashboardSummary?.totalExpensesCurrentMonth
              }
              totalIncomesCurrentMonth={
                dashboardSummary?.totalIncomesCurrentMonth
              }
              loading={loadingDashboard}
              error={dashboardError}
              isAdmin={isAdmin}
              onRetry={() => void handleRefresh()}
              onPressBalance={handleAdjustBalance}
              onPressExpenses={navigateToExpensesList}
              onPressIncomes={navigateToIncomesList}
              onAdjustBalance={handleAdjustBalance}
            />

            <RecentTransactions
              transactions={recentTransactions || []}
              loading={loadingDashboard}
              error={dashboardError}
              onRetry={() => void handleRefresh()}
              onPressTransaction={handleTransactionPress}
              onPressViewAll={navigateToExpensesList}
            />

            {safePendingActions.length > 0 || loadingDashboard ? (
              <PendingActions
                actions={safePendingActions}
                loading={loadingDashboard}
                error={dashboardError}
                onRetry={() => void handleRefresh()}
                onPressAction={handlePendingActionPress}
                onPressViewAll={navigateToExpensesList}
              />
            ) : null}

            <MonthlyChart
              data={monthlyData || undefined}
              title="Movimentação Financeira"
              loading={loadingDashboard}
            />

            {categoryExpenses.length > 0 ? (
              <CategoryChart
                data={categoryExpenses}
                title="Despesas por Categoria"
                onViewDetails={navigateToExpensesList}
              />
            ) : null}
          </ScrollView>
        );
    }
  };

  return (
    <Screen width="wide" padded={false} header={header}>
      <View
        style={{
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <SegmentedTabs<TabType>
          options={tabOptions}
          value={activeTab}
          onChange={handleTabChange}
        />
      </View>
      <Divider />

      <View style={styles.contentWrapper}>{renderContent()}</View>

      <BottomSheetModal
        visible={showNewSheet}
        onClose={() => setShowNewSheet(false)}
        title="Novo Lançamento"
      >
        <Surface tone="surface" bordered radiusKey="md" style={styles.sheetList}>
          <ListRow
            title="Nova Despesa"
            subtitle="Registrar um gasto para aprovação ou reembolso"
            showDivider
            leading={
              <ArrowUpRight
                size={20}
                strokeWidth={1.75}
                color={theme.colors.danger}
              />
            }
            onPress={() => {
              setShowNewSheet(false);
              navigateToCreateExpense();
            }}
          />
          <ListRow
            title="Nova Receita"
            subtitle="Registrar uma entrada ou contribuição na república"
            leading={
              <ArrowDownLeft
                size={20}
                strokeWidth={1.75}
                color={theme.colors.success}
              />
            }
            onPress={() => {
              setShowNewSheet(false);
              navigateToCreateIncome();
            }}
          />
        </Surface>
      </BottomSheetModal>

      <AdjustBalanceModal
        visible={showAdjustBalanceModal}
        currentBalance={dashboardSummary?.currentBalance ?? 0}
        onClose={() => setShowAdjustBalanceModal(false)}
        onSubmit={handleAdjustBalanceSubmit}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    minHeight: 0,
  },
  sheetList: {
    overflow: 'hidden',
  },
});

export default FinancesDashboardScreen;
