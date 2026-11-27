import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Search,
  Users,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import {
  AppText,
  Avatar,
  Button,
  Divider,
  IconButton,
  ListRow,
  StateView,
  StatusText,
  Surface,
  TextField,
  useTheme,
} from '../../src/design-system';
import { SelectableMember, useHouseMembers } from '../../src/hooks/useHouseMembers';

interface InviteUsersSectionProps {
  houseId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const InviteUsersSection: React.FC<InviteUsersSectionProps> = ({
  houseId,
  selectedIds,
  onSelectionChange,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { members: rawMembers, loading } = useHouseMembers(houseId);

  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const members = useMemo(
    () => rawMembers.filter((member) => member.uid !== user?.uid),
    [rawMembers, user?.uid]
  );

  const filteredMembers = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return members;

    return members.filter((member) => {
      const nameMatch = member.name?.toLowerCase().includes(trimmed);
      const nicknameMatch = member.nickname?.toLowerCase().includes(trimmed);
      const emailMatch = member.email?.toLowerCase().includes(trimmed);
      return Boolean(nameMatch || nicknameMatch || emailMatch);
    });
  }, [members, searchQuery]);

  const toggleMember = (memberId: string) => {
    if (selectedIds.includes(memberId)) {
      onSelectionChange(selectedIds.filter((id) => id !== memberId));
    } else {
      onSelectionChange([...selectedIds, memberId]);
    }
  };

  const getDisplayName = (member: SelectableMember) => {
    if (member.nickname) return member.nickname;
    return member.name.split(' ')[0] || member.name;
  };

  const clearAllSelected = () => {
    onSelectionChange([]);
  };

  const selectAllMembers = () => {
    onSelectionChange(members.map((member) => member.uid));
  };

  const getSelectionSummary = () => {
    if (selectedIds.length === 0) {
      return 'Ninguém selecionado';
    }
    if (members.length > 0 && selectedIds.length === members.length) {
      return 'Todos selecionados';
    }
    return `${selectedIds.length} ${selectedIds.length === 1 ? 'membro selecionado' : 'membros selecionados'}`;
  };

  return (
    <Surface tone="surface" bordered radiusKey="md" style={styles.container}>
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel="Convidar Participantes"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.header,
          {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            gap: theme.spacing.sm,
            opacity: pressed ? theme.motion.pressOpacity : 1,
          },
        ]}
      >
        <View style={[styles.headerLeft, { gap: theme.spacing.xs }]}>
          <Users size={20} strokeWidth={1.75} color={theme.colors.accent} />
          <View style={styles.headerTextBlock}>
            <AppText variant="bodyStrong" color="ink">
              Convidar Participantes
            </AppText>
            <AppText variant="caption" color="inkSecondary">
              {getSelectionSummary()}
            </AppText>
          </View>
        </View>

        <View style={[styles.headerRight, { gap: theme.spacing.xs }]}>
          {selectedIds.length > 0 ? (
            <StatusText label={String(selectedIds.length)} tone="accent" showDot />
          ) : null}
          {expanded ? (
            <ChevronUp size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />
          ) : (
            <ChevronDown size={20} strokeWidth={1.75} color={theme.colors.inkMuted} />
          )}
        </View>
      </Pressable>

      {expanded ? (
        <>
          <Divider />
          <View
            style={{
              padding: theme.spacing.md,
              gap: theme.spacing.sm,
            }}
          >
            <TextField
              placeholder="Buscar membros..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon={
                <Search size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
              }
              rightAccessory={
                searchQuery.length > 0 ? (
                  <IconButton
                    icon={<X size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />}
                    onPress={() => setSearchQuery('')}
                    accessibilityLabel="Limpar busca"
                    variant="ghost"
                  />
                ) : undefined
              }
            />

            <View style={[styles.actionButtons, { gap: theme.spacing.xs }]}>
              <View style={styles.actionButtonSlot}>
                <Button
                  label="Todos"
                  variant="secondary"
                  size="sm"
                  fullWidth
                  disabled={members.length === 0}
                  onPress={selectAllMembers}
                />
              </View>
              <View style={styles.actionButtonSlot}>
                <Button
                  label="Limpar"
                  variant="ghost"
                  size="sm"
                  fullWidth
                  disabled={selectedIds.length === 0}
                  onPress={clearAllSelected}
                />
              </View>
            </View>

            {loading ? (
              <StateView kind="loading" title="Carregando membros..." />
            ) : filteredMembers.length === 0 ? (
              <StateView
                kind="empty"
                icon={<Search size={28} strokeWidth={1.75} color={theme.colors.inkMuted} />}
                title={
                  searchQuery
                    ? 'Nenhum membro encontrado'
                    : 'Nenhum membro disponível'
                }
              />
            ) : (
              <Surface tone="bg" bordered radiusKey="sm" style={styles.listFrame}>
                <ScrollView
                  nestedScrollEnabled={true}
                  style={styles.listScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredMembers.map((item, index) => {
                    const isSelected = selectedIds.includes(item.uid);
                    return (
                      <ListRow
                        key={item.uid}
                        title={getDisplayName(item)}
                        subtitle={item.email}
                        selected={isSelected}
                        showDivider={index < filteredMembers.length - 1}
                        onPress={() => toggleMember(item.uid)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        leading={
                          <Avatar
                            uri={item.profilePictureUrl}
                            name={item.name}
                            size="sm"
                          />
                        }
                        trailing={
                          isSelected ? (
                            <CheckCircle2
                              size={20}
                              strokeWidth={1.75}
                              color={theme.colors.accent}
                            />
                          ) : (
                            <Circle
                              size={20}
                              strokeWidth={1.75}
                              color={theme.colors.borderStrong}
                            />
                          )
                        }
                      />
                    );
                  })}
                </ScrollView>
              </Surface>
            )}
          </View>
        </>
      ) : null}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextBlock: {
    flex: 1,
    gap: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButtonSlot: {
    flex: 1,
  },
  listFrame: {
    overflow: 'hidden',
  },
  listScroll: {
    maxHeight: 220,
  },
});

export default InviteUsersSection;
