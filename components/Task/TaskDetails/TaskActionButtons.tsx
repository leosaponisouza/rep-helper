import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CheckCircle2, PlayCircle, XCircle } from 'lucide-react-native';
import {
  AppText,
  Button,
  Divider,
  useFeedback,
  useTheme,
} from '../../../src/design-system';
import { TaskStatus } from '../../../src/models/task.model';

export interface TaskActionButtonsProps {
  status: TaskStatus;
  canModifyTask: boolean;
  canChangeStatus: boolean;
  isStatusChanging: boolean;
  isCancelling: boolean;
  onToggleStatus: () => void;
  onCancelTask: () => void;
}

export const TaskActionButtons: React.FC<TaskActionButtonsProps> = ({
  status,
  canModifyTask,
  canChangeStatus,
  isStatusChanging,
  isCancelling,
  onToggleStatus,
  onCancelTask,
}) => {
  const { theme } = useTheme();
  const { confirm, toast } = useFeedback();

  if (!['PENDING', 'IN_PROGRESS', 'OVERDUE'].includes(status) || !canModifyTask) {
    return null;
  }

  const isStartAction = status === 'PENDING' || status === 'OVERDUE';

  const handlePressToggle = () => {
    if (!canChangeStatus) {
      toast({
        title: 'Acesso negado',
        message: 'Apenas o criador ou os responsáveis podem alterar o status da tarefa.',
        tone: 'warning',
      });
      return;
    }
    onToggleStatus();
  };

  const handlePressCancel = async () => {
    if (!canChangeStatus) {
      toast({
        title: 'Acesso negado',
        message: 'Apenas o criador ou os responsáveis podem cancelar esta tarefa.',
        tone: 'warning',
      });
      return;
    }
    if (isCancelling) return;

    const accepted = await confirm({
      title: 'Cancelar Tarefa',
      message: 'Tem certeza que deseja cancelar esta tarefa?',
      confirmLabel: 'Cancelar Tarefa',
      cancelLabel: 'Voltar',
      destructive: true,
    });

    if (accepted) {
      onCancelTask();
    }
  };

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Divider />

      <View style={[styles.actionsRow, { gap: theme.spacing.sm }]}>
        <View style={styles.primarySlot}>
          <Button
            variant="primary"
            fullWidth
            label={isStartAction ? 'Iniciar Tarefa' : 'Concluir Tarefa'}
            loading={isStatusChanging}
            disabled={!canChangeStatus || isCancelling}
            leftIcon={
              isStartAction ? (
                <PlayCircle size={18} strokeWidth={1.75} color={theme.colors.onAccent} />
              ) : (
                <CheckCircle2 size={18} strokeWidth={1.75} color={theme.colors.onAccent} />
              )
            }
            onPress={handlePressToggle}
          />
        </View>

        <View style={styles.secondarySlot}>
          <Button
            variant="secondary"
            fullWidth
            label="Cancelar"
            loading={isCancelling}
            disabled={!canChangeStatus || isStatusChanging}
            leftIcon={<XCircle size={18} strokeWidth={1.75} color={theme.colors.ink} />}
            onPress={() => void handlePressCancel()}
          />
        </View>
      </View>

      {!canChangeStatus ? (
        <AppText variant="caption" color="inkMuted">
          Apenas o criador da tarefa ou responsáveis atribuídos podem alterar o status.
        </AppText>
      ) : null}

      <Divider />
    </View>
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primarySlot: {
    flex: 3,
  },
  secondarySlot: {
    flex: 2,
  },
});

export default TaskActionButtons;
