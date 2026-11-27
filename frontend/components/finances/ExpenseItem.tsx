// components/Finances/ExpenseItem.tsx
import React, { memo } from 'react';
import { Expense } from '../../src/models/finances.model';
import FinanceItem from './FinanceItem';

interface ExpenseItemProps {
  expense: Expense;
  onPress: (expense: Expense) => void;
  currentUserId?: string;
  requireExpenseApproval?: boolean;
}

const ExpenseItem: React.FC<ExpenseItemProps> = ({
  expense,
  onPress,
  currentUserId,
  requireExpenseApproval = true,
}) => {
  const handlePress = (item: Expense) => {
    onPress(item);
  };

  return (
    <FinanceItem
      item={expense}
      type="expense"
      onPress={handlePress}
      currentUserId={currentUserId}
      requireExpenseApproval={requireExpenseApproval}
    />
  );
};

export default memo(ExpenseItem);
