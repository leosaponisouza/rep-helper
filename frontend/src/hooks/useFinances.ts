// src/hooks/useFinances.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ErrorHandler } from '../utils/errorHandling';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';
import * as financesService from '../services/financesService';
import {
  Expense,
  Income,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  RejectExpenseRequest,
  CreateIncomeRequest,
  UpdateIncomeRequest,
  FinancialDashboardSummary,
  MonthlyChartData,
  PendingAction,
  Transaction,
  TransactionType,
} from '../models/finances.model';

export type ExpenseFilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';

interface UseFinancesOptions {
  initialFilter?: ExpenseFilterType;
}

export const useFinances = (options: UseFinancesOptions = {}) => {
  const { user } = useAuth();
  const houseId = user?.currentHouseId;

  // State for expenses
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilterType>(options.initialFilter || 'ALL');
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expensesError, setExpensesError] = useState<string | null>(null);

  // State for incomes
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loadingIncomes, setLoadingIncomes] = useState(false);
  const [incomesError, setIncomesError] = useState<string | null>(null);

  // State for dashboard
  const [dashboardSummary, setDashboardSummary] = useState<FinancialDashboardSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyChartData>();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Derived state
  const filteredExpenses = useMemo(() => {
    if (expenseFilter === 'ALL') {
      return expenses;
    }
    return expenses.filter(expense => expense.status === expenseFilter);
  }, [expenses, expenseFilter]);

  const categoryExpenses = useMemo(() => {
    const categories = new Map<string, number>();
    const total = expenses.reduce((sum, expense) => {
      if (expense.status === 'APPROVED' || expense.status === 'REIMBURSED') {
        const category = expense.category || 'Outros';
        const current = categories.get(category) || 0;
        categories.set(category, current + expense.amount);
        return sum + expense.amount;
      }
      return sum;
    }, 0);

    return Array.from(categories.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const recentTransactions = useMemo<Transaction[]>(() => {
    const allTransactions: Transaction[] = [
      ...expenses.map(expense => ({
        ...expense,
        date: expense.expenseDate,
        type: 'EXPENSE' as TransactionType,
        uniqueId: `expense-${expense.id}`,
      })),
      ...incomes.map(income => ({
        ...income,
        date: income.incomeDate,
        type: 'INCOME' as TransactionType,
        uniqueId: `income-${income.id}`,
      })),
    ];

    return allTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [expenses, incomes]);

  const fetchWithErrorHandling = async <T>(
    apiCall: () => Promise<T>,
    setLoading: (loading: boolean) => void,
    setError: (error: string | null) => void,
    errorMessage: string = 'Ocorreu um erro ao buscar os dados'
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      return await apiCall();
    } catch (err) {
      const parsedError = await ErrorHandler.parseError(err);
      setError(parsedError.message || errorMessage);
      logger.error(`${errorMessage}:`, err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fetch expenses
  const fetchExpenses = useCallback(async (): Promise<void> => {
    if (!houseId) return;

    const data = await fetchWithErrorHandling(
      () => financesService.getExpenses(houseId),
      setLoadingExpenses,
      setExpensesError,
      'Não foi possível carregar as despesas'
    );

    if (data) {
      setExpenses(data);
    }
  }, [houseId]);

  // Fetch incomes
  const fetchIncomes = useCallback(async (): Promise<void> => {
    if (!houseId) return;

    const data = await fetchWithErrorHandling(
      () => financesService.getIncomes(houseId),
      setLoadingIncomes,
      setIncomesError,
      'Não foi possível carregar as receitas'
    );

    if (data) {
      setIncomes(data);
    }
  }, [houseId]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (): Promise<void> => {
    if (!houseId) return;

    setLoadingDashboard(true);
    setDashboardError(null);

    try {
      const [summaryData, monthlyChart, pendingData] = await Promise.all([
        financesService.getDashboardSummary(houseId),
        financesService.getMonthlyExpensesChart(houseId, 6),
        financesService.getPendingActions(houseId),
      ]);

      setDashboardSummary(summaryData);
      setMonthlyData(monthlyChart);

      if (pendingData && Array.isArray(pendingData.pendingExpenses)) {
        const mappedPendingActions = pendingData.pendingExpenses.map(expense => ({
          ...expense,
          date: expense.expenseDate,
        }));
        setPendingActions(mappedPendingActions);
      } else {
        setPendingActions([]);
      }
    } catch (err) {
      const parsedError = await ErrorHandler.parseError(err);
      setDashboardError(parsedError.message || 'Não foi possível carregar os dados do dashboard');
      logger.error('Dashboard error:', err);

      setMonthlyData(undefined);
      setPendingActions([]);
    } finally {
      setLoadingDashboard(false);
    }
  }, [houseId]);

  // Apply expense filter
  const applyExpenseFilter = useCallback((filter: ExpenseFilterType) => {
    setExpenseFilter(filter);
  }, []);

  // Get expense by ID
  const getExpenseById = useCallback(async (id: number): Promise<Expense> => {
    try {
      return await financesService.getExpenseById(id);
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      throw error;
    }
  }, []);

  // Get income by ID
  const getIncomeById = useCallback(async (id: number): Promise<Income> => {
    try {
      return await financesService.getIncomeById(id);
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      throw error;
    }
  }, []);

  // Create expense
  const createExpense = useCallback(async (data: CreateExpenseRequest): Promise<Expense> => {
    try {
      const created = await financesService.createExpense(data);
      await Promise.all([fetchExpenses(), fetchDashboardData()]);
      return created;
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      throw error;
    }
  }, [fetchExpenses, fetchDashboardData]);

  // Update expense
  const updateExpense = useCallback(async (id: number, data: UpdateExpenseRequest): Promise<Expense> => {
    try {
      const updated = await financesService.updateExpense(id, data);
      await Promise.all([fetchExpenses(), fetchDashboardData()]);
      return updated;
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      throw error;
    }
  }, [fetchExpenses, fetchDashboardData]);

  // Expense status operations
  const approveExpense = useCallback(async (id: number): Promise<Expense> => {
    try {
      const approved = await financesService.approveExpense(id);
      await Promise.all([fetchExpenses(), fetchDashboardData()]);
      return approved;
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      throw error;
    }
  }, [fetchExpenses, fetchDashboardData]);

  const rejectExpense = useCallback(async (id: number, data: RejectExpenseRequest): Promise<Expense> => {
    try {
      const rejected = await financesService.rejectExpense(id, data);
      await Promise.all([fetchExpenses(), fetchDashboardData()]);
      return rejected;
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      throw error;
    }
  }, [fetchExpenses, fetchDashboardData]);

  const reimburseExpense = useCallback(async (id: number): Promise<Expense> => {
    try {
      const reimbursed = await financesService.reimburseExpense(id);
      await Promise.all([fetchExpenses(), fetchDashboardData()]);
      return reimbursed;
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      throw error;
    }
  }, [fetchExpenses, fetchDashboardData]);

  const resetExpenseStatus = useCallback(async (id: number): Promise<Expense> => {
    try {
      const reset = await financesService.resetExpenseStatus(id);
      await Promise.all([fetchExpenses(), fetchDashboardData()]);
      return reset;
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      throw error;
    }
  }, [fetchExpenses, fetchDashboardData]);

  const deleteExpense = useCallback(async (id: number): Promise<boolean> => {
    try {
      await financesService.deleteExpense(id);
      await Promise.all([fetchExpenses(), fetchDashboardData()]);
      return true;
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      throw error;
    }
  }, [fetchExpenses, fetchDashboardData]);

  // Income operations
  const createIncome = useCallback(async (data: CreateIncomeRequest): Promise<Income> => {
    try {
      const created = await financesService.createIncome(data);
      await Promise.all([fetchIncomes(), fetchDashboardData()]);
      return created;
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      throw error;
    }
  }, [fetchIncomes, fetchDashboardData]);

  const updateIncome = useCallback(async (id: number, data: UpdateIncomeRequest): Promise<Income> => {
    try {
      const updated = await financesService.updateIncome(id, data);
      await Promise.all([fetchIncomes(), fetchDashboardData()]);
      return updated;
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      throw error;
    }
  }, [fetchIncomes, fetchDashboardData]);

  const deleteIncome = useCallback(async (id: number): Promise<boolean> => {
    try {
      await financesService.deleteIncome(id);
      await Promise.all([fetchIncomes(), fetchDashboardData()]);
      return true;
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      throw error;
    }
  }, [fetchIncomes, fetchDashboardData]);

  // Adjust house balance
  const adjustBalance = useCallback(async (newBalance: number, description?: string): Promise<FinancialDashboardSummary> => {
    if (!houseId) {
      throw new Error('Casa não identificada');
    }
    try {
      return await financesService.adjustHouseBalance(houseId, newBalance, description || '');
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      throw error;
    }
  }, [houseId]);

  // Fetch expenses by status
  const fetchExpensesByStatus = useCallback(async (status: ExpenseFilterType): Promise<Expense[]> => {
    if (!houseId || status === 'ALL') return [];

    try {
      return await financesService.getExpensesByStatus(houseId, status);
    } catch (err) {
      const error = await ErrorHandler.parseError(err);
      logger.error('Error fetching expenses by status:', error);
      return [];
    }
  }, [houseId]);

  // Refresh all financial data
  const refreshFinancialData = useCallback(async (): Promise<boolean> => {
    if (!houseId) return false;

    try {
      await Promise.all([
        fetchExpenses(),
        fetchIncomes(),
        fetchDashboardData(),
      ]);
      return true;
    } catch (error) {
      logger.error('Error refreshing financial data:', error);
      return false;
    }
  }, [houseId, fetchExpenses, fetchIncomes, fetchDashboardData]);

  // Load initial data
  useEffect(() => {
    if (houseId) {
      refreshFinancialData();
    }
  }, [houseId, refreshFinancialData]);

  return {
    // Data
    expenses: filteredExpenses,
    allExpenses: expenses,
    incomes,
    recentTransactions,

    // Dashboard
    dashboardSummary,
    hasSharedFund: dashboardSummary?.hasSharedFund ?? false,
    requireExpenseApproval: dashboardSummary?.requireExpenseApproval ?? false,
    monthlyData,
    categoryExpenses,
    pendingActions,

    // Loading states
    loadingExpenses,
    loadingIncomes,
    loadingDashboard,

    // Errors
    expensesError,
    incomesError,
    dashboardError,

    // Data fetching
    fetchExpenses,
    fetchIncomes,
    fetchDashboardData,
    fetchExpensesByStatus,
    refreshFinancialData,

    // Filter
    applyExpenseFilter,
    expenseFilter,

    // Expense operations
    createExpense,
    getExpenseById,
    updateExpense,
    approveExpense,
    rejectExpense,
    reimburseExpense,
    resetExpenseStatus,
    deleteExpense,

    // Income operations
    createIncome,
    getIncomeById,
    updateIncome,
    deleteIncome,

    // Balance operations
    adjustBalance,
  };
};
