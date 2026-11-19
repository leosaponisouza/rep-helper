import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ArrowRight, Info, Repeat, StopCircle } from 'lucide-react-native';
import {
  AppText,
  Button,
  Divider,
  StatusText,
  Surface,
  useTheme,
} from '../../../src/design-system';
import { Task } from '../../../src/models/task.model';
import { getRecurrencePatternLabel } from '../../../src/validation/taskSchemas';

export interface TaskRecurrenceCardProps {
  task: Task;
  canModifyTask: boolean;
  isStoppingRecurrence: boolean;
  formatDateWithTime: (dateString?: string | null) => string;
  onNavigateToParent: (parentTaskId: number) => void;
  onStopRecurrence: () => void;
}

export const TaskRecurrenceCard: React.FC<TaskRecurrenceCardProps> = ({
  task,
  canModifyTask,
  isStoppingRecurrence,
  formatDateWithTime,
  onNavigateToParent,
  onStopRecurrence,
}) => {
  const { theme } = useTheme();

  if (!task.recurring && !task.parentTaskId) {
    return null;
  }

  const patternLabel = getRecurrencePatternLabel(
    true,
    task.recurrenceType || 'WEEKLY',
    task.recurrenceInterval || 1
  );

  return (
    <Surface
      tone="surface"
      bordered
      padded="md"
      radiusKey="md"
      style={{ gap: theme.spacing.sm }}
    >
      <View style={[styles.headerRow, { gap: theme.spacing.xs }]}>
        <StatusText
          label={task.recurring ? 'Tarefa Recorrente' : 'Gerada por Recorrência'}
          tone="success"
          icon={<Repeat size={16} strokeWidth={1.75} color={theme.colors.success} />}
        />
      </View>

      <Divider />

      <View style={{ gap: theme.spacing.xs }}>
        {task.recurring ? (
          <View style={[styles.detailRow, { gap: theme.spacing.sm }]}>
            <AppText variant="caption" color="inkSecondary" style={styles.label}>
              Frequência
            </AppText>
            <AppText variant="bodyStrong" color="ink" style={styles.value}>
              {patternLabel}
            </AppText>
          </View>
        ) : null}

        {task.recurring && task.recurrenceEndDate ? (
          <View style={[styles.detailRow, { gap: theme.spacing.sm }]}>
            <AppText variant="caption" color="inkSecondary" style={styles.label}>
              Término
            </AppText>
            <AppText variant="body" color="ink" style={styles.value}>
              {formatDateWithTime(task.recurrenceEndDate)}
            </AppText>
          </View>
        ) : null}

        {task.parentTaskId ? (
          <View style={[styles.detailRow, { gap: theme.spacing.sm }]}>
            <AppText variant="caption" color="inkSecondary" style={styles.label}>
              Origem
            </AppText>
            <View style={styles.value}>
              <Button
                label="Ver tarefa original"
                variant="ghost"
                size="sm"
                leftIcon={
                  <ArrowRight size={16} strokeWidth={1.75} color={theme.colors.accent} />
                }
                onPress={() => onNavigateToParent(task.parentTaskId!)}
                style={styles.inlineLinkButton}
              />
            </View>
          </View>
        ) : null}
      </View>

      <Surface
        tone="subtle"
        padded="sm"
        radiusKey="sm"
        style={[styles.infoBox, { gap: theme.spacing.xs }]}
      >
        <Info size={16} strokeWidth={1.75} color={theme.colors.inkSecondary} />
        <AppText variant="caption" color="inkSecondary" style={styles.infoText}>
          {task.recurring
            ? 'Quando concluída, uma nova instância será criada automaticamente.'
            : 'Esta tarefa foi gerada automaticamente por uma recorrência.'}
        </AppText>
      </Surface>

      {canModifyTask && task.recurring ? (
        <>
          <Divider />
          <Button
            label="Interromper Recorrência"
            variant="secondary"
            fullWidth
            loading={isStoppingRecurrence}
            leftIcon={
              <StopCircle size={18} strokeWidth={1.75} color={theme.colors.danger} />
            }
            onPress={onStopRecurrence}
          />
        </>
      ) : null}
    </Surface>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    width: 80,
  },
  value: {
    flex: 1,
    alignItems: 'flex-start',
  },
  inlineLinkButton: {
    paddingHorizontal: 0,
    alignSelf: 'flex-start',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
  },
});

export default TaskRecurrenceCard;
