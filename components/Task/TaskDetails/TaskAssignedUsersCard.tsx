import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { AssignedUser } from '../../../src/models/task.model';

export interface TaskAssignedUsersCardProps {
  assignedUsers?: AssignedUser[];
  currentUserId?: string;
}

export const TaskAssignedUsersCard: React.FC<TaskAssignedUsersCardProps> = ({
  assignedUsers = [],
  currentUserId,
}) => {
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Responsáveis</Text>
      </View>

      {assignedUsers && assignedUsers.length > 0 ? (
        assignedUsers.map((assignedUser, index) => {
          const isCurrentUser =
            Boolean(currentUserId) && assignedUser.uid === currentUserId;
          const userKey = assignedUser.uid || `user-${index}`;

          return (
            <View
              key={userKey}
              style={[
                styles.assigneeRow,
                isCurrentUser && styles.currentUserAssigneeRow,
              ]}
            >
              <View style={styles.assigneeAvatarContainer}>
                {assignedUser.profilePictureUrl ? (
                  <Image
                    source={{ uri: assignedUser.profilePictureUrl }}
                    style={styles.assigneeAvatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.assigneeAvatarPlaceholder,
                      isCurrentUser && styles.currentUserAvatarPlaceholder,
                    ]}
                  >
                    <Text style={styles.assigneeInitials}>
                      {assignedUser.nickname
                        ? assignedUser.nickname.substring(0, 2).toUpperCase()
                        : assignedUser.name
                          ? assignedUser.name.substring(0, 2).toUpperCase()
                          : 'NA'}
                    </Text>
                  </View>
                )}

                {isCurrentUser && <View style={styles.currentUserIndicator} />}
              </View>

              <View style={styles.assigneeInfo}>
                <Text
                  style={[
                    styles.assigneeName,
                    isCurrentUser && styles.currentUserName,
                  ]}
                >
                  {assignedUser.nickname ||
                    assignedUser.name ||
                    assignedUser.email ||
                    assignedUser.uid}
                  {isCurrentUser ? ' (Você)' : ''}
                </Text>
                {assignedUser.email && (
                  <Text style={styles.assigneeEmail}>{assignedUser.email}</Text>
                )}
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.noAssigneesText}>
          Nenhum responsável atribuído.
        </Text>
      )}
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
    color: '#7B68EE',
  },
  assigneeRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
    alignItems: 'center',
  },
  currentUserAssigneeRow: {
    backgroundColor: 'rgba(123, 104, 238, 0.1)',
  },
  assigneeAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  assigneeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  assigneeAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentUserAvatarPlaceholder: {
    backgroundColor: '#7B68EE',
  },
  assigneeInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentUserIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#444',
  },
  assigneeInfo: {
    flex: 1,
  },
  assigneeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  currentUserName: {
    color: '#7B68EE',
    fontWeight: 'bold',
  },
  assigneeEmail: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 2,
  },
  noAssigneesText: {
    color: '#aaa',
    fontSize: 14,
    padding: 16,
    fontStyle: 'italic',
  },
});

export default TaskAssignedUsersCard;
