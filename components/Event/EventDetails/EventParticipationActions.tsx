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
import { EventInvitation } from '../../../src/services/events';

export interface EventParticipationActionsProps {
  eventHasPassed: boolean;
  userInvitation: EventInvitation | null;
  refreshing: boolean;
  onUpdateStatus: (status: 'CONFIRMED' | 'DECLINED') => void;
}

export const EventParticipationActions: React.FC<
  EventParticipationActionsProps
> = ({ eventHasPassed, userInvitation, refreshing, onUpdateStatus }) => {
  if (eventHasPassed || !userInvitation) {
    return null;
  }

  return (
    <View style={styles.userActionsContainer}>
      <Text style={styles.userActionsTitle}>Sua participação</Text>

      {(userInvitation.status === 'DECLINED' ||
        userInvitation.status === 'INVITED') && (
        <TouchableOpacity
          style={[styles.participationButton, styles.confirmButton]}
          onPress={() => onUpdateStatus('CONFIRMED')}
          disabled={refreshing}
          accessibilityLabel="Confirmar participação"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name="checkmark"
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
              <Text style={styles.confirmButtonText}>
                Confirmar participação
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {(userInvitation.status === 'CONFIRMED' ||
        userInvitation.status === 'INVITED') && (
        <TouchableOpacity
          style={[styles.participationButton, styles.declineButton]}
          onPress={() => onUpdateStatus('DECLINED')}
          disabled={refreshing}
          accessibilityLabel="Recusar participação"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name="close"
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
              <Text style={styles.declineButtonText}>Recusar participação</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  userActionsContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#444',
    borderRadius: 12,
  },
  userActionsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  participationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  declineButton: {
    backgroundColor: '#FF6347',
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
  declineButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default EventParticipationActions;
