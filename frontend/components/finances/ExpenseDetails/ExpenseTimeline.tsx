// components/Finances/ExpenseDetails/ExpenseTimeline.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Clock, X } from 'lucide-react-native';
import {
  AppText,
  Divider,
  Surface,
  useTheme,
} from '../../../src/design-system';
import { Expense } from '../../../src/models/finances.model';
import { formatLocalDate } from '../../../src/utils/dateUtils';

export interface ExpenseTimelineStep {
  key: 'created' | 'approval' | 'reimbursement';
  title: string;
  date?: string | null;
  isCompleted: boolean;
  isRejected: boolean;
  rejectionReason?: string;
  isFuture: boolean;
  isLast: boolean;
}

export function buildExpenseTimelineSteps(expense: Expense): ExpenseTimelineStep[] {
  const isRejected = expense.status === 'REJECTED';
  const isApprovedOrReimbursed =
    expense.status === 'APPROVED' || expense.status === 'REIMBURSED';
  const isReimbursed = expense.status === 'REIMBURSED';

  const createdStep: ExpenseTimelineStep = {
    key: 'created',
    title: 'Criada',
    date: expense.createdAt,
    isCompleted: true,
    isRejected: false,
    isFuture: false,
    isLast: false,
  };

  const approvalStep: ExpenseTimelineStep = {
    key: 'approval',
    title: isRejected ? 'Rejeitada' : 'Aprovada',
    date: isRejected ? expense.updatedAt || expense.approvalDate : expense.approvalDate,
    isCompleted: isApprovedOrReimbursed,
    isRejected,
    rejectionReason: isRejected ? expense.rejectionReason : undefined,
    isFuture: expense.status === 'PENDING' && !expense.approvalDate,
    isLast: false,
  };

  const reimbursementStep: ExpenseTimelineStep = {
    key: 'reimbursement',
    title: 'Reembolsada',
    date: expense.reimbursementDate,
    isCompleted: isReimbursed,
    isRejected: false,
    isFuture: !expense.reimbursementDate && !isReimbursed,
    isLast: true,
  };

  return [createdStep, approvalStep, reimbursementStep];
}

const TimelineItem: React.FC<Omit<ExpenseTimelineStep, 'key'>> = ({
  title,
  date,
  isCompleted,
  isRejected,
  rejectionReason,
  isLast,
  isFuture,
}) => {
  const { theme } = useTheme();
  const formattedDate = date
    ? formatLocalDate(date, "dd 'de' MMMM 'de' yyyy") || date
    : null;

  const isPending = !isCompleted && !isRejected;

  const dotBackground = isCompleted
    ? theme.colors.success
    : isRejected
      ? theme.colors.danger
      : theme.colors.subtle;

  const dotBorderColor = isCompleted
    ? theme.colors.success
    : isRejected
      ? theme.colors.danger
      : isFuture
        ? theme.colors.line
        : theme.colors.borderStrong;

  const connectorColor = isCompleted
    ? theme.colors.success
    : isRejected
      ? theme.colors.danger
      : theme.colors.line;

  const titleColor = isRejected
    ? 'danger'
    : isCompleted
      ? 'ink'
      : isFuture
        ? 'inkMuted'
        : 'inkSecondary';

  return (
    <View style={[styles.timelineItem, isFuture ? styles.futureItem : undefined]}>
      <View style={styles.timelineDotColumn}>
        <View
          style={[
            styles.timelineDot,
            {
              backgroundColor: dotBackground,
              borderColor: dotBorderColor,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          {isCompleted ? (
            <Check size={12} strokeWidth={2.5} color={theme.colors.onAccent} />
          ) : isRejected ? (
            <X size={12} strokeWidth={2.5} color={theme.colors.onDanger} />
          ) : isPending ? (
            <Clock size={11} strokeWidth={2} color={theme.colors.inkMuted} />
          ) : null}
        </View>

        {!isLast ? (
          <View
            style={[
              styles.timelineConnector,
              {
                backgroundColor: connectorColor,
              },
            ]}
          />
        ) : null}
      </View>

      <View
        style={[
          styles.timelineContent,
          {
            paddingBottom: isLast ? 0 : theme.spacing.lg,
            gap: theme.spacing.xxs,
          },
        ]}
      >
        <AppText variant="bodyStrong" color={titleColor}>
          {title}
        </AppText>

        {formattedDate ? (
          <AppText variant="caption" color="inkSecondary">
            {formattedDate}
          </AppText>
        ) : (
          <AppText variant="caption" color="inkMuted">
            {isFuture ? 'Aguardando status anterior' : 'Pendente'}
          </AppText>
        )}

        {isRejected && rejectionReason ? (
          <Surface
            tone="subtle"
            bordered
            padded="xs"
            radiusKey="sm"
            style={{
              backgroundColor: theme.colors.dangerSoft,
              borderColor: theme.colors.danger,
              marginTop: theme.spacing.xxs,
            }}
          >
            <AppText variant="caption" color="danger">
              Motivo: {rejectionReason}
            </AppText>
          </Surface>
        ) : null}
      </View>
    </View>
  );
};

export interface ExpenseTimelineProps {
  expense: Expense;
}

export const ExpenseTimeline: React.FC<ExpenseTimelineProps> = ({ expense }) => {
  const { theme } = useTheme();
  const steps = buildExpenseTimelineSteps(expense);

  return (
    <Surface tone="surface" bordered radiusKey="md" style={styles.sectionContainer}>
      <View
        style={{
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <AppText variant="monoLabel" color="inkSecondary">
          Timeline de Status
        </AppText>
      </View>
      <Divider />
      <View style={{ padding: theme.spacing.md }}>
        {steps.map(({ key, ...stepProps }) => (
          <TimelineItem key={key} {...stepProps} />
        ))}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    overflow: 'hidden',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  futureItem: {
    opacity: 0.6,
  },
  timelineDotColumn: {
    width: 28,
    alignItems: 'center',
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
});

export default ExpenseTimeline;
