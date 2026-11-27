// components/Finances/FinanceItem.tsx
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Avatar,
  ListRow,
  StatusText,
  Surface,
  useTheme,
  type StatusTone,
} from '../../src/design-system';
import {
  Expense,
  Income,
  PendingAction,
} from '../../src/models/finances.model';
import { formatCurrencyBRL } from '../../src/utils/currencyUtils';
import { formatLocalDate } from '../../src/utils/dateUtils';

type FinanceItemType = Income | Expense | PendingAction;

interface FinanceItemProps {
  item: FinanceItemType;
  type: 'income' | 'expense';
  onPress: (item: any) => void;
  currentUserId?: string;
  requireExpenseApproval?: boolean;
}

const getExpenseStatusMeta = (
  status: string,
  requireExpenseApproval: boolean = true
): { label: string; tone: StatusTone } => {
  switch (status) {
    case 'PENDING':
      return { label: 'Pendente', tone: 'warning' };
    case 'APPROVED':
      return {
        label: requireExpenseApproval ? 'Aprovada' : 'Registrada',
        tone: 'success',
      };
    case 'REJECTED':
      return { label: 'Rejeitada', tone: 'danger' };
    case 'REIMBURSED':
      return { label: 'Reembolsada', tone: 'accent' };
    default:
      return { label: status, tone: 'neutral' };
  }
};

const FinanceItem: React.FC<FinanceItemProps> = ({
  item,
  type,
  onPress,
  currentUserId,
  requireExpenseApproval = true,
}) => {
  const { theme } = useTheme();
  const isIncome = type === 'income';
  const isPendingAction = 'status' in item && !('type' in item);

  let categoryValue: string | undefined;
  let dateValue: string | undefined;
  let notes: string | undefined;
  let statusMeta: { label: string; tone: StatusTone };

  if (isPendingAction) {
    const pendingItem = item as PendingAction;
    categoryValue = pendingItem.category || 'Outros';
    dateValue = pendingItem.expenseDate;
    statusMeta = getExpenseStatusMeta(pendingItem.status, requireExpenseApproval);
  } else if (isIncome) {
    const incomeItem = item as Income;
    categoryValue = incomeItem.source;
    dateValue = incomeItem.incomeDate;
    notes = incomeItem.notes;
    statusMeta = { label: 'Recebido', tone: 'success' };
  } else {
    const expenseItem = item as Expense;
    categoryValue = expenseItem.category;
    dateValue = expenseItem.expenseDate;
    notes = expenseItem.notes;
    statusMeta = getExpenseStatusMeta(expenseItem.status, requireExpenseApproval);
  }

  const categoryLabel =
    categoryValue || (isIncome ? 'Sem fonte' : 'Sem categoria');

  let creatorName = '';
  let creatorId = '';
  let creatorProfilePictureUrl: string | undefined;

  if (isPendingAction) {
    const pendingItem = item as PendingAction;
    creatorName = pendingItem.creatorName;
    creatorId = pendingItem.creatorId;
    creatorProfilePictureUrl = pendingItem.creatorProfilePictureUrl;
  } else if (isIncome) {
    const incomeItem = item as Income;
    creatorName = incomeItem.contributorName || '';
    creatorId = incomeItem.contributorId || '';
    creatorProfilePictureUrl = incomeItem.contributorProfilePictureUrl;
  } else {
    const expenseItem = item as Expense;
    creatorName = expenseItem.creatorName;
    creatorId = expenseItem.creatorId;
    creatorProfilePictureUrl = expenseItem.creatorProfilePictureUrl;
  }

  const isCurrentUserCreator = Boolean(
    currentUserId && creatorId === currentUserId
  );
  const formattedDate = dateValue
    ? formatLocalDate(dateValue, "d 'de' MMM") || dateValue
    : '';
  const userName = isCurrentUserCreator ? 'Você' : creatorName || 'Usuário';

  const subtitleParts = [
    categoryLabel,
    formattedDate || null,
    creatorName ? userName : null,
  ].filter(Boolean);

  const title = item.description || (isIncome ? 'Receita' : 'Despesa');
  const formattedAmount = formatCurrencyBRL(item.amount);
  const signedAmount = `${isIncome ? '+' : '-'}${formattedAmount}`;

  return (
    <Surface tone="surface" bordered radiusKey="md" style={styles.card}>
      <ListRow
        title={title}
        subtitle={subtitleParts.join(' · ')}
        onPress={() => onPress(item)}
        accessibilityLabel={`${title}, ${formattedAmount}, ${statusMeta.label}, ${subtitleParts.join(', ')}`}
        leading={
          <Avatar
            uri={creatorProfilePictureUrl}
            name={userName}
            size="sm"
          />
        }
        trailing={
          <View style={styles.trailing}>
            <AppText
              variant="monoValue"
              color={isIncome ? 'success' : 'ink'}
              numberOfLines={1}
            >
              {signedAmount}
            </AppText>
            <StatusText label={statusMeta.label} tone={statusMeta.tone} showDot />
          </View>
        }
      />
      {typeof notes === 'string' && notes.trim() !== '' ? (
        <View
          style={{
            paddingHorizontal: theme.spacing.md,
            paddingBottom: theme.spacing.sm,
          }}
        >
          <AppText variant="caption" color="inkSecondary" numberOfLines={2}>
            {notes.trim()}
          </AppText>
        </View>
      ) : null}
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 2,
  },
});

export default memo(FinanceItem);
