// components/Task/TaskEdit/UserAssignmentSection.tsx
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CheckCircle2, Circle, Users } from 'lucide-react-native';
import {
  AppText,
  Avatar,
  BottomSheetModal,
  Button,
  ListRow,
  StateView,
  Surface,
  useTheme,
} from '../../../src/design-system';

export interface SelectableUser {
  uid: string;
  name: string;
  nickname?: string;
  email: string;
  profilePictureUrl?: string;
}

export interface UserAssignmentSectionProps {
  selectedUsers: string[];
  availableUsers: SelectableUser[];
  currentUserId?: string;
  onChangeSelectedUsers: (users: string[]) => void;
}

const UserAssignmentSection: React.FC<UserAssignmentSectionProps> = ({
  selectedUsers,
  availableUsers,
  currentUserId,
  onChangeSelectedUsers,
}) => {
  const { theme } = useTheme();
  const [isUserModalVisible, setUserModalVisible] = useState(false);
  const [draftSelectedUsers, setDraftSelectedUsers] = useState<string[]>(selectedUsers);

  useEffect(() => {
    if (isUserModalVisible) {
      setDraftSelectedUsers(selectedUsers);
    }
  }, [isUserModalVisible, selectedUsers]);

  const toggleDraftUser = (userId: string) => {
    const userIdStr = String(userId);
    setDraftSelectedUsers((prev) =>
      prev.includes(userIdStr)
        ? prev.filter((id) => id !== userIdStr)
        : [...prev, userIdStr]
    );
  };

  const handleConfirm = () => {
    onChangeSelectedUsers(draftSelectedUsers);
    setUserModalVisible(false);
  };

  const selectedMembers = availableUsers.filter((u) =>
    selectedUsers.includes(String(u.uid))
  );

  return (
    <View style={{ gap: theme.spacing.xxs }}>
      <AppText variant="bodyStrong" color="ink">
        Responsáveis
      </AppText>

      <Surface tone="surface" bordered radiusKey="md">
        <Pressable
          onPress={() => setUserModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={
            selectedUsers.length > 0
              ? `${selectedUsers.length} responsáveis selecionados. Toque para alterar`
              : 'Selecionar responsáveis pela tarefa'
          }
          style={({ pressed }) => [
            styles.selectRow,
            {
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              gap: theme.spacing.sm,
              opacity: pressed ? theme.motion.pressOpacity : 1,
            },
          ]}
        >
          <View style={styles.selectTextBlock}>
            <AppText variant="caption" color="inkSecondary">
              Responsáveis
            </AppText>
            <AppText
              variant="body"
              color={selectedUsers.length > 0 ? 'ink' : 'inkMuted'}
              numberOfLines={1}
            >
              {selectedUsers.length > 0
                ? `${selectedUsers.length} ${selectedUsers.length === 1 ? 'pessoa selecionada' : 'pessoas selecionadas'}`
                : 'Selecione os responsáveis'}
            </AppText>
          </View>
          <Users size={20} strokeWidth={1.75} color={theme.colors.accent} />
        </Pressable>

        {selectedMembers.length > 0 ? (
          <View
            style={[
              styles.previewRow,
              {
                paddingHorizontal: theme.spacing.md,
                paddingBottom: theme.spacing.sm,
                gap: theme.spacing.xs,
              },
            ]}
          >
            <View style={styles.avatarStack}>
              {selectedMembers.slice(0, 4).map((member, index) => (
                <View
                  key={member.uid}
                  style={[
                    styles.avatarWrapper,
                    {
                      marginLeft: index > 0 ? -8 : 0,
                      zIndex: 10 - index,
                      borderColor: theme.colors.surface,
                      borderRadius: theme.radius.full,
                    },
                  ]}
                >
                  <Avatar
                    uri={member.profilePictureUrl}
                    name={member.nickname || member.name}
                    size="sm"
                  />
                </View>
              ))}
            </View>

            {selectedMembers.length > 4 ? (
              <AppText variant="caption" color="accent">
                +{selectedMembers.length - 4}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </Surface>

      <BottomSheetModal
        visible={isUserModalVisible}
        onClose={() => setUserModalVisible(false)}
        title="Selecionar Responsáveis"
        footer={
          <View style={[styles.modalFooter, { gap: theme.spacing.sm }]}>
            <View style={styles.footerSlot}>
              <Button
                label="Cancelar"
                variant="secondary"
                fullWidth
                onPress={() => setUserModalVisible(false)}
              />
            </View>
            <View style={styles.footerSlot}>
              <Button
                label={`Confirmar (${draftSelectedUsers.length})`}
                variant="primary"
                fullWidth
                onPress={handleConfirm}
              />
            </View>
          </View>
        }
      >
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="caption" color="inkSecondary">
            Selecione os moradores responsáveis pela tarefa
          </AppText>

          {availableUsers.length === 0 ? (
            <StateView
              kind="empty"
              title="Nenhum morador disponível"
              description="Não foi possível encontrar membros na república."
            />
          ) : (
            <Surface tone="surface" bordered style={styles.listSurface}>
              {availableUsers.map((availableUser, index) => {
                const userId = String(availableUser.uid);
                const isSelected = draftSelectedUsers.includes(userId);
                const isCurrentUser =
                  Boolean(currentUserId) && userId === String(currentUserId);
                const displayName = availableUser.nickname || availableUser.name;

                return (
                  <ListRow
                    key={userId}
                    title={`${displayName}${isCurrentUser ? ' (Você)' : ''}`}
                    subtitle={availableUser.email}
                    selected={isSelected}
                    showDivider={index < availableUsers.length - 1}
                    onPress={() => toggleDraftUser(userId)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    leading={
                      <Avatar
                        uri={availableUser.profilePictureUrl}
                        name={displayName}
                        size="md"
                      />
                    }
                    trailing={
                      isSelected ? (
                        <CheckCircle2
                          size={22}
                          strokeWidth={1.75}
                          color={theme.colors.accent}
                        />
                      ) : (
                        <Circle
                          size={22}
                          strokeWidth={1.75}
                          color={theme.colors.borderStrong}
                        />
                      )
                    }
                  />
                );
              })}
            </Surface>
          )}
        </View>
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  selectTextBlock: {
    flex: 1,
    gap: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderWidth: 2,
  },
  listSurface: {
    overflow: 'hidden',
  },
  modalFooter: {
    flexDirection: 'row',
    width: '100%',
  },
  footerSlot: {
    flex: 1,
  },
});

export default UserAssignmentSection;
