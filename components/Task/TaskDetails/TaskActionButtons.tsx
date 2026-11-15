import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  if (!['PENDING', 'IN_PROGRESS', 'OVERDUE'].includes(status) || !canModifyTask) {
    return null;
  }

  return (
    <View style={styles.actionButtonsContainer}>
      {(status === 'PENDING' || status === 'OVERDUE') && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.primaryButton,
            isStatusChanging && styles.actionButtonDisabled,
          ]}
          onPress={onToggleStatus}
          disabled={!canChangeStatus || isStatusChanging}
        >
          {isStatusChanging ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="play-circle" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Iniciar Tarefa</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {status === 'IN_PROGRESS' && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.primaryButton,
            isStatusChanging && styles.actionButtonDisabled,
          ]}
          onPress={onToggleStatus}
          disabled={!canChangeStatus || isStatusChanging}
        >
          {isStatusChanging ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Concluir Tarefa</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.buttonSpacer} />

      <TouchableOpacity
        style={[
          styles.actionButton,
          styles.secondaryButton,
          isCancelling && styles.actionButtonDisabled,
        ]}
        onPress={() => {
          Alert.alert(
            'Cancelar Tarefa',
            'Tem certeza que deseja cancelar esta tarefa?',
            [
              { text: 'Não', style: 'cancel' },
              {
                text: 'Cancelar Tarefa',
                onPress: onCancelTask,
              },
            ]
          );
        }}
        disabled={!canChangeStatus || isCancelling}
      >
        {isCancelling ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="close-circle" size={18} color="#fff" />
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#444',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7B68EE',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    maxWidth: '60%',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#555',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    maxWidth: '35%',
  },
  buttonSpacer: {
    width: 12,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TaskActionButtons;
