// src/services/financesService.ts
import api from './api';
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
  PendingActionsResponse,
} from '../models/finances.model';

export const getExpenses = async (republicId: string): Promise<Expense[]> => {
  const response = await api.get<Expense[]>('/api/v1/expenses', {
    params: { republicId },
  });
  return response.data;
};

export const getExpensesByStatus = async (
  republicId: string,
  status: string
): Promise<Expense[]> => {
  const response = await api.get<Expense[]>(`/api/v1/expenses/status/${status}`, {
    params: { republicId },
  });
  return response.data;
};

export const getExpenseById = async (id: number): Promise<Expense> => {
  const response = await api.get<Expense>(`/api/v1/expenses/${id}`);
  return response.data;
};

export const createExpense = async (data: CreateExpenseRequest): Promise<Expense> => {
  const response = await api.post<Expense>('/api/v1/expenses', data);
  return response.data;
};

export const updateExpense = async (
  id: number,
  data: UpdateExpenseRequest
): Promise<Expense> => {
  const response = await api.put<Expense>(`/api/v1/expenses/${id}`, data);
  return response.data;
};

export const approveExpense = async (id: number): Promise<Expense> => {
  const response = await api.post<Expense>(`/api/v1/expenses/${id}/approve`);
  return response.data;
};

export const rejectExpense = async (
  id: number,
  data: RejectExpenseRequest
): Promise<Expense> => {
  const response = await api.post<Expense>(`/api/v1/expenses/${id}/reject`, data);
  return response.data;
};

export const reimburseExpense = async (id: number): Promise<Expense> => {
  const response = await api.post<Expense>(`/api/v1/expenses/${id}/reimburse`);
  return response.data;
};

export const resetExpenseStatus = async (id: number): Promise<Expense> => {
  const response = await api.post<Expense>(`/api/v1/expenses/${id}/reset`);
  return response.data;
};

export const deleteExpense = async (id: number): Promise<void> => {
  await api.delete(`/api/v1/expenses/${id}`);
};

export const getIncomes = async (republicId: string): Promise<Income[]> => {
  const response = await api.get<Income[]>('/api/v1/incomes', {
    params: { republicId },
  });
  return response.data;
};

export const getIncomeById = async (id: number): Promise<Income> => {
  const response = await api.get<Income>(`/api/v1/incomes/${id}`);
  return response.data;
};

export const createIncome = async (data: CreateIncomeRequest): Promise<Income> => {
  const response = await api.post<Income>('/api/v1/incomes', data);
  return response.data;
};

export const updateIncome = async (
  id: number,
  data: UpdateIncomeRequest
): Promise<Income> => {
  const response = await api.put<Income>(`/api/v1/incomes/${id}`, data);
  return response.data;
};

export const deleteIncome = async (id: number): Promise<void> => {
  await api.delete(`/api/v1/incomes/${id}`);
};

export const getDashboardSummary = async (
  republicId: string
): Promise<FinancialDashboardSummary> => {
  const response = await api.get<FinancialDashboardSummary>(
    `/api/v1/financial-dashboard/summary/${republicId}`
  );
  return response.data;
};

export const getMonthlyExpensesChart = async (
  republicId: string,
  numberOfMonths: number = 6
): Promise<MonthlyChartData> => {
  const response = await api.get<MonthlyChartData>(
    `/api/v1/financial-dashboard/expenses/monthly/${republicId}`,
    { params: { numberOfMonths } }
  );
  return response.data;
};

export const getPendingActions = async (
  republicId: string
): Promise<PendingActionsResponse> => {
  const response = await api.get<PendingActionsResponse>(
    `/api/v1/financial-dashboard/pending-actions/${republicId}`
  );
  return response.data;
};

export const adjustRepublicBalance = async (
  republicId: string,
  amount: number,
  description: string = ''
): Promise<FinancialDashboardSummary> => {
  const response = await api.post<FinancialDashboardSummary>(
    `/api/v1/finances/${republicId}/adjust-balance`,
    {
      amount,
      description,
    }
  );
  return response.data;
};
