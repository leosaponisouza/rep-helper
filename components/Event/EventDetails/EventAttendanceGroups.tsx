import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Users,
  XCircle,
} from 'lucide-react-native';
import {
  AppText,
  Avatar,
  ListRow,
  StateView,
  Surface,
  useTheme,
  type AppTextColor,
} from '../../../src/design-system';
import { EventInvitation } from '../../../src/services/events';

export interface EventAttendanceGroupsProps {
  invitations?: EventInvitation[];
  currentUserId?: string;
}

type AttendanceGroupKey = 'confirmed' | 'pending' | 'declined';

export const EventAttendanceGroups: React.FC<EventAttendanceGroupsProps> = ({
  invitations = [],
  currentUserId,
}) => {
  const { theme } = useTheme();
  const [expandedGroup, setExpandedGroup] = useState<AttendanceGroupKey | null>(null);

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

  const toggleGroup = useCallback((group: AttendanceGroupKey) => {
    setExpandedGroup((prev) => (prev === group ? null : group));
  }, []);

  const groups: Array<{
    key: AttendanceGroupKey;
    title: string;
    colorKey: AppTextColor;
    colorValue: string;
    items: EventInvitation[];
    icon: React.ReactNode;
  }> = [
    {
      key: 'confirmed',
      title: `Confirmados (${confirmedParticipants.length})`,
      colorKey: 'success',
      colorValue: theme.colors.success,
      items: confirmedParticipants,
      icon: (
        <CheckCircle2 size={20} strokeWidth={1.75} color={theme.colors.success} />
      ),
    },
    {
      key: 'pending',
      title: `Pendentes (${pendingParticipants.length})`,
      colorKey: 'warning',
      colorValue: theme.colors.warning,
      items: pendingParticipants,
      icon: (
        <HelpCircle size={20} strokeWidth={1.75} color={theme.colors.warning} />
      ),
    },
    {
      key: 'declined',
      title: `Recusados (${declinedParticipants.length})`,
      colorKey: 'danger',
      colorValue: theme.colors.danger,
      items: declinedParticipants,
      icon: <XCircle size={20} strokeWidth={1.75} color={theme.colors.danger} />,
    },
  ];

  return (
    <Surface
      tone="surface"
      bordered
      padded="md"
      radiusKey="md"
      style={{ gap: theme.spacing.sm }}
    >
      <AppText variant="heading" color="ink">
        Participantes
      </AppText>

      {invitations.length === 0 ? (
        <StateView
          kind="empty"
          icon={<Users size={32} strokeWidth={1.75} color={theme.colors.inkMuted} />}
          title="Nenhum participante convidado ainda"
        />
      ) : (
        <View style={{ gap: theme.spacing.xs }}>
          {groups.map((group) => {
            const isExpanded = expandedGroup === group.key;

            return (
              <View key={group.key} style={{ gap: theme.spacing.xs }}>
                <Pressable
                  onPress={() => toggleGroup(group.key)}
                  accessibilityRole="button"
                  accessibilityLabel={group.title}
                  accessibilityState={{ expanded: isExpanded }}
                  style={({ pressed }) => [
                    styles.groupHeader,
                    {
                      backgroundColor: theme.colors.subtle,
                      borderColor: theme.colors.line,
                      borderRadius: theme.radius.sm,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: theme.spacing.xs,
                      opacity: pressed ? theme.motion.pressOpacity : 1,
                    },
                  ]}
                >
                  <View style={[styles.groupHeaderContent, { gap: theme.spacing.xs }]}>
                    {group.icon}
                    <AppText variant="bodyStrong" color={group.colorKey}>
                      {group.title}
                    </AppText>
                  </View>

                  {isExpanded ? (
                    <ChevronUp size={18} strokeWidth={1.75} color={group.colorValue} />
                  ) : (
                    <ChevronDown size={18} strokeWidth={1.75} color={group.colorValue} />
                  )}
                </Pressable>

                {isExpanded ? (
                  group.items.length === 0 ? (
                    <AppText
                      variant="caption"
                      color="inkMuted"
                      style={{ paddingHorizontal: theme.spacing.sm }}
                    >
                      Nenhum participante nesta categoria.
                    </AppText>
                  ) : (
                    <Surface
                      tone="bg"
                      bordered
                      radiusKey="sm"
                      style={styles.participantsSurface}
                    >
                      {group.items.map((invitation, index) => {
                        const displayName =
                          invitation.nickName ?? invitation.userName ?? 'Participante';
                        const title = `${displayName}${invitation.userId === currentUserId ? ' (Você)' : ''}`;

                        return (
                          <ListRow
                            key={invitation.userId}
                            title={title}
                            subtitle={invitation.userEmail}
                            showDivider={index < group.items.length - 1}
                            leading={
                              <Avatar
                                uri={invitation.profilePictureUrl}
                                name={displayName}
                                size="sm"
                              />
                            }
                          />
                        );
                      })}
                    </Surface>
                  )
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    borderWidth: 1,
  },
  groupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsSurface: {
    overflow: 'hidden',
  },
});

export default EventAttendanceGroups;
