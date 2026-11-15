import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ConfirmDeleteModalProps {
  title: string;
  deleteLabel: string;
  confirmLabel?: string;
  showConfirm: boolean;
  loading?: boolean;
  onPressDelete: () => void;
  onCancelConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  title,
  deleteLabel,
  confirmLabel = 'Confirmar exclusão',
  showConfirm,
  loading = false,
  onPressDelete,
  onCancelConfirm,
}) => {
  return (
    <View style={styles.creatorActionsContainer}>
      <Text style={styles.creatorActionsTitle}>{title}</Text>

      <View style={styles.creatorButtonsContainer}>
        <TouchableOpacity
          style={[styles.creatorButton, styles.deleteButton]}
          onPress={onPressDelete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={showConfirm ? 'alert-circle' : 'trash'}
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
              <Text style={styles.deleteButtonText}>
                {showConfirm ? confirmLabel : deleteLabel}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {showConfirm && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancelConfirm}
            disabled={loading}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="#aaa"
              style={styles.buttonIcon}
            />
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  creatorActionsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#444',
    borderRadius: 12,
  },
  creatorActionsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  creatorButtonsContainer: {
    marginTop: 8,
  },
  creatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(123, 104, 238, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.3)',
  },
  deleteButton: {
    backgroundColor: '#FF6347',
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#FF6347',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#444',
  },
  cancelButtonText: {
    color: '#aaa',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default ConfirmDeleteModal;
