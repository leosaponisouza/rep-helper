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
    republicId: 'rep-1',
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
});
