// src/models/finances.model.ts

export type TransactionType = 'EXPENSE' | 'INCOME';
export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';

export interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  houseId: string;
  houseName?: string;
  creatorId: string;
  creatorName: string;
  creatorNickname?: string;
  creatorProfilePictureUrl?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  type: TransactionType;
}

export interface Expense extends Transaction {
  type: 'EXPENSE';
  expenseDate: string;
  category: string;
  status: ExpenseStatus;
  approvalDate?: string;
  reimbursementDate?: string;
  rejectionReason?: string;
  approverId?: string;
  approverName?: string;
}

export interface Income extends Transaction {
  type: 'INCOME';
  incomeDate: string;
  source: string;
  contributorId?: string;
  contributorName?: string;
  contributorProfilePictureUrl?: string;
}

export interface HouseFinances {
  id: number;
  houseId: string;
  houseName: string;
  currentBalance: number;
  lastUpdated: string;
}

export interface FinancialDashboardSummary {
  currentBalance: number;
  totalExpenses: number;
  totalIncomes: number;
  pendingExpensesAmount: number;
  approvedExpensesAmount: number;
  rejectedExpenses?: number;
  reimbursedExpenses?: number;
  totalExpensesCurrentMonth?: number;
  totalIncomesCurrentMonth?: number;
  hasSharedFund?: boolean;
  requireExpenseApproval?: boolean;
}

export interface MonthlyChartData {
  monthlyData: MonthlyData[];
}

export interface MonthlyData {
  month: string;
  expenses: number;
  incomes: number;
}

export interface CategoryExpense {
  category: string;
  amount: number;
  percentage: number;
  color?: string;
}

export interface PendingAction {
  id: number;
  description: string;
  amount: number;
  expenseDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  creatorId: string;
  creatorName: string;
  creatorNickname?: string;
  creatorProfilePictureUrl?: string;
  category?: string;
  approvalDate?: string | null;
  receiptUrl?: string | null;
  reimbursementDate?: string | null;
  rejectionReason?: string | null;
  houseId?: string;
  houseName?: string;
  createdAt?: string;
}

export interface PendingActionsResponse {
  pendingExpenses: PendingAction[];
  pendingExpensesCount: number;
  pendingExpensesTotal: number;
}

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  expenseDate: string;
  category: string;
  receiptUrl?: string;
  houseId: string;
  notes?: string;
}

export interface UpdateExpenseRequest {
  description?: string;
  amount?: number;
  expenseDate?: string;
  category?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface RejectExpenseRequest {
  reason: string;
}

export interface CreateIncomeRequest {
  description: string;
  amount: number;
  incomeDate: string;
  source: string;
  houseId: string;
  notes?: string;
}

export interface UpdateIncomeRequest {
  description?: string;
  amount?: number;
  incomeDate?: string;
  source?: string;
  notes?: string;
}

export interface ExpenseFormData {
  description: string;
  amount: number | string;
  date: string;
  category: string;
  receipt?: string;
  notes?: string;
}

export interface IncomeFormData {
  description: string;
  amount: number | string;
  date: string;
  source: string;
  notes?: string;
}
