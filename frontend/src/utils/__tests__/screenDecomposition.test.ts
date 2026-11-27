import fs from 'fs';
import path from 'path';
import { buildExpenseTimelineSteps } from '../../../components/finances/ExpenseDetails/ExpenseTimeline';
import { Expense } from '../../models/finances.model';

describe('buildExpenseTimelineSteps', () => {
  const baseExpense: Expense = {
    id: 10,
    type: 'EXPENSE',
    description: 'Internet',
    amount: 120,
    date: '2026-11-01',
    expenseDate: '2026-11-01',
    category: 'Contas',
    status: 'PENDING',
    houseId: 'house-1',
    creatorId: 'u-1',
    creatorName: 'João',
    createdAt: '2026-11-01T12:00:00',
  };

  it('marks creation completed and approval/reimbursement pending when status is PENDING', () => {
    const steps = buildExpenseTimelineSteps(baseExpense);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatchObject({ key: 'created', isCompleted: true });
    expect(steps[1]).toMatchObject({ key: 'approval', isCompleted: false, isRejected: false });
    expect(steps[2]).toMatchObject({ key: 'reimbursement', isCompleted: false, isFuture: true, isLast: true });
  });

  it('marks second step as rejected with rejectionReason when status is REJECTED', () => {
    const rejected: Expense = {
      ...baseExpense,
      status: 'REJECTED',
      rejectionReason: 'Comprovante ilegível',
    };
    const steps = buildExpenseTimelineSteps(rejected);
    expect(steps[1]).toMatchObject({
      key: 'approval',
      isCompleted: false,
      isRejected: true,
      rejectionReason: 'Comprovante ilegível',
    });
  });

  it('returns a single completed "Registrada" step when hasSharedFund=false and requireExpenseApproval=false', () => {
    const tracked: Expense = {
      ...baseExpense,
      status: 'APPROVED',
      approvalDate: '2026-11-01T12:00:00',
    };
    const steps = buildExpenseTimelineSteps(tracked, {
      hasSharedFund: false,
      requireExpenseApproval: false,
    });
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({
      key: 'created',
      title: 'Registrada',
      isCompleted: true,
      isLast: true,
    });
  });

  it('returns two steps without reimbursement when hasSharedFund=false and requireExpenseApproval=true', () => {
    const steps = buildExpenseTimelineSteps(baseExpense, {
      hasSharedFund: false,
      requireExpenseApproval: true,
    });
    expect(steps).toHaveLength(2);
    expect(steps.map((s) => s.key)).toEqual(['created', 'approval']);
    expect(steps[1].isLast).toBe(true);
  });

  it('enforces expense editability parity, focus refreshes, and CEP validation in screens', () => {
    const frontendRoot = path.resolve(__dirname, '../../..');
    const expenseDetailsSrc = fs.readFileSync(
      path.join(frontendRoot, 'app/(panel)/finances/expenses/[id].tsx'),
      'utf8'
    );
    expect(expenseDetailsSrc).not.toContain("(isUserAdmin && expense?.status !== 'REIMBURSED')");
    expect(expenseDetailsSrc).toContain('expense?.sharedFund !== false');
    expect(expenseDetailsSrc).toContain('useFocusEffect');

    const houseSettingsSrc = fs.readFileSync(
      path.join(frontendRoot, 'app/(panel)/settings/house.tsx'),
      'utf8'
    );
    expect(houseSettingsSrc).toMatch(/\\d\{5\}-\\d\{3\}/);

    const expensesListSrc = fs.readFileSync(
      path.join(frontendRoot, 'app/(panel)/finances/expenses/index.tsx'),
      'utf8'
    );
    const incomesListSrc = fs.readFileSync(
      path.join(frontendRoot, 'app/(panel)/finances/incomes/index.tsx'),
      'utf8'
    );
    const homeSrc = fs.readFileSync(
      path.join(frontendRoot, 'app/(panel)/home.tsx'),
      'utf8'
    );
    expect(expensesListSrc).toContain('useFocusEffect');
    expect(incomesListSrc).toContain('useFocusEffect');
    expect(homeSrc).toContain('useFocusEffect');
  });
});
