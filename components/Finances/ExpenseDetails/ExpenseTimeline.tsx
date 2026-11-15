import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const formattedDate = date
    ? formatLocalDate(date, "dd 'de' MMMM 'de' yyyy") || date
    : null;

  const isPending = !isCompleted && !isRejected;
  const itemStyle = [
    styles.timelineItem,
    isRejected && styles.rejectedTimelineItem,
    isPending && styles.pendingTimelineItem,
    isFuture && styles.futureTimelineItem,
  ];

  return (
    <View style={itemStyle}>
      <View style={styles.timelineDotContainer}>
        <View
          style={[
            styles.timelineDot,
            isCompleted && styles.completedTimelineDot,
            isRejected && styles.rejectedTimelineDot,
            isPending && styles.pendingTimelineDot,
            isFuture && styles.futureTimelineDot,
          ]}
        >
          {isCompleted && <Ionicons name="checkmark" size={10} color="#fff" />}
          {isRejected && <Ionicons name="close" size={10} color="#fff" />}
        </View>
        {!isLast && (
          <View
            style={[
              styles.timelineConnector,
              isCompleted && styles.completedTimelineConnector,
              isRejected && styles.rejectedTimelineConnector,
              isPending && styles.pendingTimelineConnector,
              isFuture && styles.futureTimelineConnector,
            ]}
          />
        )}
      </View>
      <View style={styles.timelineContent}>
        <Text
          style={[
            styles.timelineTitle,
            isPending && styles.pendingTimelineText,
            isRejected && styles.rejectedTimelineText,
            isFuture && styles.futureTimelineText,
          ]}
        >
          {title}
        </Text>

        {formattedDate ? (
          <Text style={styles.timelineDate}>{formattedDate}</Text>
        ) : isFuture ? (
          <Text style={styles.futureDateText}>Aguardando status anterior</Text>
        ) : (
          <Text style={styles.pendingDateText}>Pendente</Text>
        )}

        {isRejected && rejectionReason && (
          <View>
            <Text style={styles.rejectionReason}>Motivo: {rejectionReason}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export interface ExpenseTimelineProps {
  expense: Expense;
}

export const ExpenseTimeline: React.FC<ExpenseTimelineProps> = ({ expense }) => {
  const steps = buildExpenseTimelineSteps(expense);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Timeline de Status</Text>
      </View>

      <View style={styles.timelineContainer}>
        {steps.map(({ key, ...stepProps }) => (
          <TimelineItem key={key} {...stepProps} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 20,
    backgroundColor: '#444',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6347',
  },
  timelineContainer: {
    marginTop: 0,
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative',
  },
  pendingTimelineItem: {
    opacity: 0.5,
  },
  rejectedTimelineItem: {},
  futureTimelineItem: {
    opacity: 0.3,
  },
  timelineDotContainer: {
    position: 'relative',
    alignItems: 'center',
    width: 30,
    height: 50,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    marginRight: 16,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineConnector: {
    position: 'absolute',
    top: 16,
    left: 7,
    width: 2,
    height: 40,
    backgroundColor: '#444',
    zIndex: 1,
  },
  completedTimelineDot: {
    backgroundColor: '#4CAF50',
  },
  pendingTimelineDot: {
    backgroundColor: '#aaa',
    borderWidth: 1,
    borderColor: '#555',
  },
  rejectedTimelineDot: {
    backgroundColor: '#FF6347',
  },
  futureTimelineDot: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#444',
  },
  completedTimelineConnector: {
    backgroundColor: '#4CAF50',
  },
  rejectedTimelineConnector: {
    backgroundColor: '#FF6347',
  },
  pendingTimelineConnector: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  futureTimelineConnector: {
    backgroundColor: '#333',
    opacity: 0.3,
    borderStyle: 'dashed',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 0,
    marginLeft: 8,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  pendingTimelineText: {
    color: '#aaa',
    opacity: 0.8,
  },
  rejectedTimelineText: {
    color: '#FF6347',
  },
  futureTimelineText: {
    color: '#777',
  },
  timelineDate: {
    fontSize: 14,
    color: '#aaa',
  },
  pendingDateText: {
    fontSize: 14,
    color: '#aaa',
    fontStyle: 'italic',
  },
  futureDateText: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
  },
  rejectionReason: {
    fontSize: 14,
    color: '#FF6347',
    fontStyle: 'italic',
    backgroundColor: 'rgba(255, 99, 71, 0.1)',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
  },
});

export default ExpenseTimeline;
