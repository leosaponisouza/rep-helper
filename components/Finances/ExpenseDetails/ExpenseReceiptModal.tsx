import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  Modal,
  Share,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ExpenseReceiptModalProps {
  visible: boolean;
  receiptUrl?: string;
  description: string;
  onClose: () => void;
}

export const ExpenseReceiptModal: React.FC<ExpenseReceiptModalProps> = ({
  visible,
  receiptUrl,
  description,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.imageModalContainer}>
        <TouchableOpacity style={styles.closeModalButton} onPress={onClose}>
          <Ionicons name="close-circle" size={32} color="#fff" />
        </TouchableOpacity>

        {receiptUrl && (
          <Image
            source={{ uri: receiptUrl }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
        )}

        <TouchableOpacity
          style={styles.saveImageButton}
          onPress={() => {
            if (receiptUrl) {
              Share.share({
                url: receiptUrl,
                message: `Comprovante da despesa: ${description}`,
              });
            }
          }}
        >
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 100,
  },
  closeModalButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  saveImageButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: '#FF6347',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

export default ExpenseReceiptModal;
