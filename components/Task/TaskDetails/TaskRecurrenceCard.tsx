import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../../../src/models/task.model';

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
  if (!task.recurring && !task.parentTaskId) {
    return null;
  }

  return (
    <View style={styles.recurrenceContainer}>
      <View style={styles.recurrenceBanner}>
        <Ionicons name="repeat" size={20} color="#4CAF50" />
        <Text style={styles.recurrenceBannerText}>
          {task.recurring ? 'Tarefa Recorrente' : 'Gerada por Recorrência'}
        </Text>
      </View>

      <View style={styles.recurrenceContent}>
        {task.recurring && (
          <>
            <View style={styles.recurrenceRow}>
              <Text style={styles.recurrenceLabel}>Tipo:</Text>
              <Text style={styles.recurrenceValue}>
                {task.recurrenceType === 'DAILY'
                  ? 'Diária'
                  : task.recurrenceType === 'WEEKLY'
                    ? 'Semanal'
                    : task.recurrenceType === 'MONTHLY'
                      ? 'Mensal'
                      : 'Anual'}
                {task.recurrenceInterval && task.recurrenceInterval > 1
                  ? ` (a cada ${task.recurrenceInterval} ${
                      task.recurrenceType === 'DAILY'
                        ? 'dias'
                        : task.recurrenceType === 'WEEKLY'
                          ? 'semanas'
                          : task.recurrenceType === 'MONTHLY'
                            ? 'meses'
                            : 'anos'
                    })`
                  : ''}
              </Text>
            </View>

            {task.recurrenceEndDate && (
              <View style={styles.recurrenceRow}>
                <Text style={styles.recurrenceLabel}>Término:</Text>
                <Text style={styles.recurrenceValue}>
                  {formatDateWithTime(task.recurrenceEndDate)}
                </Text>
              </View>
            )}
          </>
        )}

        {task.parentTaskId && (
          <View style={styles.recurrenceRow}>
            <Text style={styles.recurrenceLabel}>Origem:</Text>
            <TouchableOpacity
              style={styles.parentTaskLink}
              onPress={() => onNavigateToParent(task.parentTaskId!)}
            >
              <Text style={styles.parentTaskLinkText}>Ver tarefa original</Text>
              <Ionicons name="arrow-forward" size={16} color="#7B68EE" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.recurrenceInfoBox}>
          <Ionicons name="information-circle" size={16} color="#aaa" />
          <Text style={styles.recurrenceInfoText}>
            {task.recurring
              ? 'Quando concluída, uma nova instância será criada automaticamente.'
              : 'Esta tarefa foi gerada automaticamente por uma recorrência.'}
          </Text>
        </View>
      </View>

      {canModifyTask && task.recurring && (
        <TouchableOpacity
          style={styles.stopRecurrenceButton}
          onPress={onStopRecurrence}
          disabled={isStoppingRecurrence}
        >
          {isStoppingRecurrence ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="stop-circle" size={18} color="#FF6347" />
              <Text style={styles.stopRecurrenceText}>
                Interromper Recorrência
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  recurrenceContainer: {
    backgroundColor: '#444',
    borderRadius: 12,
    marginTop: 16,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  recurrenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  recurrenceBannerText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  recurrenceContent: {
    padding: 16,
  },
  recurrenceRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  recurrenceLabel: {
    color: '#aaa',
    fontSize: 14,
    width: 70,
  },
  recurrenceValue: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  recurrenceInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  recurrenceInfoText: {
    color: '#ccc',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  parentTaskLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parentTaskLinkText: {
    color: '#7B68EE',
    fontSize: 14,
    marginRight: 4,
  },
  stopRecurrenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 99, 71, 0.15)',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#555',
  },
  stopRecurrenceText: {
    color: '#FF6347',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TaskRecurrenceCard;
