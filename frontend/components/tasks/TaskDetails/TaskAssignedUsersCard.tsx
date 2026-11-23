import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Avatar,
  ListRow,
  StatusText,
  Surface,
  useTheme,
} from '../../../src/design-system';
import { AssignedUser } from '../../../src/models/task.model';

export interface TaskAssignedUsersCardProps {
  assignedUsers?: AssignedUser[];
  currentUserId?: string;
}

export const TaskAssignedUsersCard: React.FC<TaskAssignedUsersCardProps> = ({
  assignedUsers = [],
  currentUserId,
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText variant="monoLabel" color="inkSecondary">
        Responsáveis
      </AppText>

      <Surface tone="surface" bordered style={styles.cardSurface}>
        {assignedUsers && assignedUsers.length > 0 ? (
          assignedUsers.map((assignedUser, index) => {
            const isCurrentUser =
              Boolean(currentUserId) && assignedUser.uid === currentUserId;
            const userKey = assignedUser.uid || `user-${index}`;
            const displayName =
              assignedUser.nickname ||
              assignedUser.name ||
              assignedUser.email ||
              assignedUser.uid;

            return (
              <ListRow
                key={userKey}
                title={displayName}
                subtitle={assignedUser.email || undefined}
                showDivider={index < assignedUsers.length - 1}
                leading={
                  <Avatar
                    uri={assignedUser.profilePictureUrl}
                    name={displayName}
                    size="md"
                  />
                }
                trailing={
                  isCurrentUser ? (
                    <StatusText label="Você" tone="accent" showDot />
                  ) : undefined
                }
              />
            );
          })
        ) : (
          <View style={{ padding: theme.spacing.md }}>
            <AppText variant="body" color="inkMuted">
              Nenhum responsável atribuído.
            </AppText>
          </View>
        )}
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  cardSurface: {
    overflow: 'hidden',
  },
});

export default TaskAssignedUsersCard;
