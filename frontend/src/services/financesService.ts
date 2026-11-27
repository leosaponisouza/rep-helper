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
import { encodePathSegment, validatePositiveIntId } from '../utils/urlSecurity';

export const getExpenses = async (houseId: string): Promise<Expense[]> => {
  const response = await api.get<Expense[]>('/api/v1/expenses', {
    params: { houseId },
  });
  return response.data;
};

export const getExpensesByStatus = async (
  houseId: string,
  status: string
): Promise<Expense[]> => {
  const safeStatus = encodePathSegment(status);
  const response = await api.get<Expense[]>(`/api/v1/expenses/status/${safeStatus}`, {
    params: { houseId },
  });
  return response.data;
};

export const getExpenseById = async (id: number): Promise<Expense> => {
  const safeId = validatePositiveIntId(id);
  const response = await api.get<Expense>(`/api/v1/expenses/${safeId}`);
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
  const safeId = validatePositiveIntId(id);
  const response = await api.put<Expense>(`/api/v1/expenses/${safeId}`, data);
  return response.data;
};

export const approveExpense = async (id: number): Promise<Expense> => {
  const safeId = validatePositiveIntId(id);
  const response = await api.post<Expense>(`/api/v1/expenses/${safeId}/approve`);
  return response.data;
};

export const rejectExpense = async (
  id: number,
  data: RejectExpenseRequest
): Promise<Expense> => {
  const safeId = validatePositiveIntId(id);
  const response = await api.post<Expense>(`/api/v1/expenses/${safeId}/reject`, data);
  return response.data;
};

export const reimburseExpense = async (id: number): Promise<Expense> => {
  const safeId = validatePositiveIntId(id);
  const response = await api.post<Expense>(`/api/v1/expenses/${safeId}/reimburse`);
  return response.data;
};

export const resetExpenseStatus = async (id: number): Promise<Expense> => {
  const safeId = validatePositiveIntId(id);
  const response = await api.post<Expense>(`/api/v1/expenses/${safeId}/reset`);
  return response.data;
};

export const deleteExpense = async (id: number): Promise<void> => {
  const safeId = validatePositiveIntId(id);
  await api.delete(`/api/v1/expenses/${safeId}`);
};

export const getIncomes = async (houseId: string): Promise<Income[]> => {
  const response = await api.get<Income[]>('/api/v1/incomes', {
    params: { houseId },
  });
  return response.data;
};

export const getIncomeById = async (id: number): Promise<Income> => {
  const safeId = validatePositiveIntId(id);
  const response = await api.get<Income>(`/api/v1/incomes/${safeId}`);
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
  const safeId = validatePositiveIntId(id);
  const response = await api.put<Income>(`/api/v1/incomes/${safeId}`, data);
  return response.data;
};

export const deleteIncome = async (id: number): Promise<void> => {
  const safeId = validatePositiveIntId(id);
  await api.delete(`/api/v1/incomes/${safeId}`);
};

export const getDashboardSummary = async (
  houseId: string
): Promise<FinancialDashboardSummary> => {
  const safeHouseId = encodePathSegment(houseId);
  const response = await api.get<FinancialDashboardSummary>(
    `/api/v1/financial-dashboard/summary/${safeHouseId}`
  );
  return response.data;
};

export const getMonthlyExpensesChart = async (
  houseId: string,
  numberOfMonths: number = 6
): Promise<MonthlyChartData> => {
  const safeHouseId = encodePathSegment(houseId);
  const response = await api.get<MonthlyChartData>(
    `/api/v1/financial-dashboard/expenses/monthly/${safeHouseId}`,
    { params: { numberOfMonths } }
  );
  return response.data;
};

export const getPendingActions = async (
  houseId: string
): Promise<PendingActionsResponse> => {
  const safeHouseId = encodePathSegment(houseId);
  const response = await api.get<PendingActionsResponse>(
    `/api/v1/financial-dashboard/pending-actions/${safeHouseId}`
  );
  return response.data;
};

export const adjustHouseBalance = async (
  houseId: string,
  amount: number,
  description: string = ''
): Promise<FinancialDashboardSummary> => {
  const safeHouseId = encodePathSegment(houseId);
  const response = await api.post<FinancialDashboardSummary>(
    `/api/v1/finances/${safeHouseId}/adjust-balance`,
    {
      amount,
      description,
    }
  );
  return response.data;
};
