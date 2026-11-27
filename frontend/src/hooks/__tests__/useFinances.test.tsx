import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useFinances } from '../useFinances';
import * as financesService from '../../services/financesService';

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'u-1', currentHouseId: 'house-1', isAdmin: true },
  }),
}));

jest.mock('../../services/financesService', () => ({
  getExpenses: jest.fn(),
  getIncomes: jest.fn(),
  getDashboardSummary: jest.fn(),
  getMonthlyExpensesChart: jest.fn(),
  getPendingActions: jest.fn(),
  updateExpense: jest.fn(),
}));

const mockedFinancesService = financesService as jest.Mocked<typeof financesService>;

describe('useFinances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults hasSharedFund and requireExpenseApproval to false before summary resolves (no Caixinha flash)', async () => {
    let resolveSummary!: (val: any) => void;
    mockedFinancesService.getExpenses.mockResolvedValue([]);
    mockedFinancesService.getIncomes.mockResolvedValue([]);
    mockedFinancesService.getMonthlyExpensesChart.mockResolvedValue({ monthlyData: [] });
    mockedFinancesService.getPendingActions.mockResolvedValue({
      pendingExpenses: [],
      pendingExpensesCount: 0,
      pendingExpensesTotal: 0,
    });
    mockedFinancesService.getDashboardSummary.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSummary = resolve;
        })
    );

    let latest!: ReturnType<typeof useFinances>;
    function Consumer() {
      latest = useFinances();
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(Consumer));
    });

    expect(latest.hasSharedFund).toBe(false);
    expect(latest.requireExpenseApproval).toBe(false);

    await act(async () => {
      resolveSummary({
        currentBalance: 200,
        totalExpenses: 50,
        totalIncomes: 250,
        pendingExpensesAmount: 0,
        approvedExpensesAmount: 0,
        hasSharedFund: true,
        requireExpenseApproval: true,
      });
    });

    expect(latest.hasSharedFund).toBe(true);
    expect(latest.requireExpenseApproval).toBe(true);

    act(() => {
      tree.unmount();
    });
  });

  it('refreshes dashboard summary and monthly chart when updateExpense succeeds', async () => {
    mockedFinancesService.getExpenses.mockResolvedValue([]);
    mockedFinancesService.getIncomes.mockResolvedValue([]);
    mockedFinancesService.getMonthlyExpensesChart.mockResolvedValue({ monthlyData: [] });
    mockedFinancesService.getPendingActions.mockResolvedValue({
      pendingExpenses: [],
      pendingExpensesCount: 0,
      pendingExpensesTotal: 0,
    });
    mockedFinancesService.getDashboardSummary.mockResolvedValue({
      currentBalance: 0,
      totalExpenses: 100,
      totalIncomes: 0,
      pendingExpensesAmount: 0,
      approvedExpensesAmount: 100,
      hasSharedFund: false,
      requireExpenseApproval: false,
    });
    mockedFinancesService.updateExpense.mockResolvedValue({
      id: 10,
      type: 'EXPENSE',
      description: 'Mercado',
      amount: 250,
      date: '2026-11-10',
      expenseDate: '2026-11-10',
      category: 'MERCADO',
      status: 'APPROVED',
      houseId: 'house-1',
      creatorId: 'u-1',
      creatorName: 'Ana',
      createdAt: '2026-11-10T10:00:00Z',
    });

    let latest!: ReturnType<typeof useFinances>;
    function Consumer() {
      latest = useFinances();
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(Consumer));
    });

    expect(mockedFinancesService.getDashboardSummary).toHaveBeenCalledTimes(1);

    await act(async () => {
      await latest.updateExpense(10, { amount: 250 });
    });

    expect(mockedFinancesService.getDashboardSummary).toHaveBeenCalledTimes(2);

    act(() => {
      tree.unmount();
    });
  });
});
