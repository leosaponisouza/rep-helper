import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventInvitation } from '../../../src/services/events';

export interface EventAttendanceGroupsProps {
  invitations?: EventInvitation[];
  currentUserId?: string;
}

export const EventAttendanceGroups: React.FC<EventAttendanceGroupsProps> = ({
  invitations = [],
  currentUserId,
}) => {
  const [expandedGroup, setExpandedGroup] = useState<
    'confirmed' | 'pending' | 'declined' | null
  >(null);
  const confirmedHeight = useState(new Animated.Value(0))[0];
  const pendingHeight = useState(new Animated.Value(0))[0];
  const declinedHeight = useState(new Animated.Value(0))[0];

  const confirmedParticipants = useMemo(
    () => invitations.filter((inv) => inv.status === 'CONFIRMED'),
    [invitations]
  );
  const pendingParticipants = useMemo(
    () => invitations.filter((inv) => inv.status === 'INVITED'),
    [invitations]
  );
  const declinedParticipants = useMemo(
    () => invitations.filter((inv) => inv.status === 'DECLINED'),
    [invitations]
  );

  const animateGroup = useCallback(
    (group: 'confirmed' | 'pending' | 'declined' | null) => {
      const targetHeight = group === expandedGroup ? 0 : 1;

      Animated.parallel([
        Animated.timing(confirmedHeight, {
          toValue: group === 'confirmed' ? targetHeight : 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(pendingHeight, {
          toValue: group === 'pending' ? targetHeight : 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(declinedHeight, {
          toValue: group === 'declined' ? targetHeight : 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();

      setExpandedGroup(group === expandedGroup ? null : group);
    },
    [expandedGroup, confirmedHeight, pendingHeight, declinedHeight]
  );

  const renderParticipantItem = (invitation: EventInvitation) => (
    <View key={invitation.userId} style={styles.participantItem}>
      {invitation.profilePictureUrl ? (
        <Image
          source={{ uri: invitation.profilePictureUrl }}
          style={styles.participantAvatar}
        />
      ) : (
        <View style={styles.participantAvatarPlaceholder}>
          <Text style={styles.participantInitials}>
            {(invitation.nickName ?? invitation.userName ?? '?')
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>
          {invitation.nickName ?? invitation.userName}
          {invitation.userId === currentUserId && ' (Você)'}
        </Text>
        <Text style={styles.participantEmail}>{invitation.userEmail}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.participantsSection}>
      <Text style={styles.sectionTitle}>Participantes</Text>

      {/* Confirmados */}
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={() => animateGroup('confirmed')}
      >
        <View style={styles.groupHeaderContent}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={[styles.groupTitle, { color: '#4CAF50' }]}>
            Confirmados ({confirmedParticipants.length})
          </Text>
        </View>
        <Ionicons
          name={expandedGroup === 'confirmed' ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#4CAF50"
        />
      </TouchableOpacity>
      <Animated.View
        style={[
          styles.participantsGroup,
          {
            maxHeight: confirmedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000],
            }),
            opacity: confirmedHeight,
          },
        ]}
      >
        {confirmedParticipants.map(renderParticipantItem)}
      </Animated.View>

      {/* Pendentes */}
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={() => animateGroup('pending')}
      >
        <View style={styles.groupHeaderContent}>
          <Ionicons name="help-circle" size={20} color="#FFC107" />
          <Text style={[styles.groupTitle, { color: '#FFC107' }]}>
            Pendentes ({pendingParticipants.length})
          </Text>
        </View>
        <Ionicons
          name={expandedGroup === 'pending' ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#FFC107"
        />
      </TouchableOpacity>
      <Animated.View
        style={[
          styles.participantsGroup,
          {
            maxHeight: pendingHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000],
            }),
            opacity: pendingHeight,
          },
        ]}
      >
        {pendingParticipants.map(renderParticipantItem)}
      </Animated.View>

      {/* Recusados */}
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={() => animateGroup('declined')}
      >
        <View style={styles.groupHeaderContent}>
          <Ionicons name="close-circle" size={20} color="#FF6347" />
          <Text style={[styles.groupTitle, { color: '#FF6347' }]}>
            Recusados ({declinedParticipants.length})
          </Text>
        </View>
        <Ionicons
          name={expandedGroup === 'declined' ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#FF6347"
        />
      </TouchableOpacity>
      <Animated.View
        style={[
          styles.participantsGroup,
          {
            maxHeight: declinedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000],
            }),
            opacity: declinedHeight,
          },
        ]}
      >
        {declinedParticipants.map(renderParticipantItem)}
      </Animated.View>

      {invitations.length === 0 && (
        <View style={styles.emptyParticipantsContainer}>
          <Ionicons name="people" size={40} color="#666" />
          <Text style={styles.emptyParticipantsText}>
            Nenhum participante convidado ainda
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  participantsSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#444',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 8,
  },
  groupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  participantsGroup: {
    overflow: 'hidden',
    marginBottom: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 8,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  participantAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7B68EE20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantInitials: {
    color: '#7B68EE',
    fontSize: 16,
    fontWeight: 'bold',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  participantEmail: {
    fontSize: 14,
    color: '#aaa',
  },
  emptyParticipantsContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyParticipantsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default EventAttendanceGroups;
