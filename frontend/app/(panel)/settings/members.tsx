import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  Search,
  Share2,
  Shield,
  ShieldOff,
  Trash2,
  Users,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../../src/context/AuthContext';
import {
  AppText,
  Avatar,
  BottomSheetModal,
  Button,
  IconButton,
  ListRow,
  Screen,
  ScreenHeader,
  StateView,
  StatusText,
  Surface,
  TextField,
  useFeedback,
  useTheme,
  type StatusTone,
} from '../../../src/design-system';
import * as houseService from '../../../src/services/houseService';
import { formatShortDate } from '../../../src/utils/dateUtils';
import { ErrorHandler } from '../../../src/utils/errorHandling';
import { logger } from '../../../src/utils/logger';

interface HouseMemberItem {
  uid: string;
  name: string;
  nickname?: string | null;
  email: string;
  phoneNumber?: string | null;
  profilePictureUrl?: string | null;
  isAdmin: boolean;
  isOwner?: boolean;
  joinedAt?: string;
  entryDate?: string;
  status?: string;
}

type PendingMemberAction = 'promote' | 'demote' | 'remove' | null;

const triggerHaptic = (callback: () => Promise<void> | void) => {
  if (Platform.OS === 'web') return;
  try {
    void Promise.resolve(callback()).catch(() => {});
  } catch {
    // Ignore haptics errors on unsupported devices
  }
};

const MembersSettingsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const { user } = useAuth();

  const [members, setMembers] = useState<HouseMemberItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [houseOwnerId, setHouseOwnerId] = useState<string | null>(null);
  const [allMembersAdmin, setAllMembersAdmin] = useState<boolean>(false);

  const [selectedMember, setSelectedMember] = useState<HouseMemberItem | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingMemberAction>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const isOwner = Boolean(user && houseOwnerId && user.uid === houseOwnerId);
  const canManageUsers = Boolean(
    user &&
      (isOwner ||
        allMembersAdmin ||
        members.some((member) => member.uid === user.uid && member.isAdmin))
  );

  const fetchMembersAndInviteCode = useCallback(async () => {
    if (!user?.currentHouseId) {
      setLoading(false);
      setError('Você não está vinculado a nenhuma casa.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [rawMembers, houseData] = await Promise.all([
        houseService.getHouseMembers(user.currentHouseId),
        houseService.getHouse(user.currentHouseId),
      ]);

      setMembers(
        rawMembers.map((m) => ({
          uid: String(m.uid || m.id),
          name: m.name,
          nickname: m.nickname,
          email: m.email,
          phoneNumber: m.phoneNumber,
          profilePictureUrl: m.profilePictureUrl,
          isAdmin: m.isAdmin,
          isOwner: m.isOwner,
          joinedAt: m.joinedAt,
          entryDate: m.entryDate || m.joinedAt,
          status: m.status,
        }))
      );

      if (houseData?.ownerId) {
        setHouseOwnerId(houseData.ownerId);
      }
      if (houseData?.code) {
        setInviteCode(houseData.code);
      }
      setAllMembersAdmin(Boolean(houseData?.allMembersAdmin));
    } catch (err) {
      const parsedError = await ErrorHandler.parseError(err);
      setError(parsedError.message);
      void ErrorHandler.handle(err);
    } finally {
      setLoading(false);
    }
  }, [user?.currentHouseId]);

  useEffect(() => {
    void fetchMembersAndInviteCode();
  }, [fetchMembersAndInviteCode]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(query) ||
        (member.nickname && member.nickname.toLowerCase().includes(query)) ||
        member.email.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  const closeMemberModal = () => {
    if (actionLoading) return;
    setSelectedMember(null);
    setPendingAction(null);
  };

  const executeChangeRole = async (memberId: string, makeAdmin: boolean) => {
    if (!isOwner || !user?.currentHouseId) {
      toast({
        title: 'Permissão negada',
        message: 'Apenas quem criou a casa pode alterar funções de administrador.',
        tone: 'warning',
      });
      return;
    }

    try {
      setActionLoading(true);
      triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

      if (makeAdmin) {
        await houseService.promoteToAdmin(user.currentHouseId, memberId);
      } else {
        await houseService.demoteFromAdmin(user.currentHouseId, memberId);
      }

      setMembers((prevMembers) =>
        prevMembers.map((member) =>
          member.uid === memberId ? { ...member, isAdmin: makeAdmin } : member
        )
      );

      const actionMessage = makeAdmin
        ? 'promovido a administrador'
        : 'alterado para morador regular';
      toast({
        title: 'Função atualizada',
        message: `Morador ${actionMessage} com sucesso!`,
        tone: 'success',
      });
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      );
      setSelectedMember(null);
      setPendingAction(null);
    } catch (err) {
      logger.error('Erro ao alterar papel do morador:', err);
      void ErrorHandler.handle(err);
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      );
    } finally {
      setActionLoading(false);
    }
  };

  const executeRemoveMember = async (memberId: string) => {
    if (!canManageUsers || !user?.currentHouseId) {
      toast({
        title: 'Permissão negada',
        message: 'Você não tem permissão para remover moradores.',
        tone: 'warning',
      });
      return;
    }

    if (memberId === houseOwnerId) {
      toast({
        title: 'Operação inválida',
        message: 'Quem criou a casa não pode ser removido.',
        tone: 'warning',
      });
      return;
    }

    try {
      setActionLoading(true);
      triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));

      await houseService.removeMember(user.currentHouseId, memberId);

      setMembers((prevMembers) =>
        prevMembers.filter((member) => member.uid !== memberId)
      );
      toast({
        title: 'Morador removido',
        message: 'Morador removido da casa com sucesso!',
        tone: 'success',
      });
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      );
      setSelectedMember(null);
      setPendingAction(null);
    } catch (err) {
      void ErrorHandler.handle(err);
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleShareInviteCode = async () => {
    if (!inviteCode) return;

    try {
      await Share.share({
        message: `Entre na nossa casa no Alpendre usando o código: ${inviteCode}`,
      });
    } catch {
      toast({
        title: 'Erro',
        message: 'Houve um erro ao compartilhar o código.',
        tone: 'danger',
      });
    }
  };

  const getRoleDisplay = (
    member: HouseMemberItem
  ): { label: string; tone: StatusTone } => {
    if (member.uid === houseOwnerId || member.isOwner) {
      return { label: 'Responsável', tone: 'warning' };
    }
    if (member.isAdmin || allMembersAdmin) {
      return { label: 'Administrador', tone: 'accent' };
    }
    return { label: 'Morador', tone: 'neutral' };
  };

  const header = (
    <ScreenHeader
      title="Moradores da Casa"
      subtitle={`${members.length} ${members.length === 1 ? 'morador' : 'moradores'} na casa`}
      onBack={() => router.back()}
    />
  );

  const selectedMemberDisplayName = selectedMember
    ? selectedMember.nickname || selectedMember.name
    : '';
  const isSelectedMemberOwner =
    selectedMember?.uid === houseOwnerId || Boolean(selectedMember?.isOwner);

  return (
    <>
      <Screen
        scroll
        header={header}
        contentContainerStyle={{ gap: theme.spacing.md }}
      >
        <TextField
          placeholder="Pesquisar morador..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Search size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />}
          rightAccessory={
            searchQuery ? (
              <IconButton
                icon={<X size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />}
                onPress={() => setSearchQuery('')}
                accessibilityLabel="Limpar pesquisa"
                variant="ghost"
              />
            ) : undefined
          }
        />

        {(isOwner || canManageUsers) && inviteCode ? (
          <Surface tone="surface" bordered padded="md">
            <View style={[styles.inviteRow, { gap: theme.spacing.sm }]}>
              <View style={styles.inviteTextBlock}>
                <AppText variant="caption" color="inkSecondary">
                  Código para convidar novos moradores
                </AppText>
                <AppText variant="monoValue" color="accent" style={styles.inviteCodeText}>
                  {inviteCode}
                </AppText>
              </View>
              <IconButton
                icon={<Share2 size={20} strokeWidth={1.75} color={theme.colors.accent} />}
                onPress={() => void handleShareInviteCode()}
                accessibilityLabel="Compartilhar código de convite"
                variant="subtle"
              />
            </View>
          </Surface>
        ) : null}

        {loading ? (
          <StateView kind="loading" title="Carregando moradores..." />
        ) : error ? (
          <StateView
            kind="error"
            title="Erro ao carregar moradores"
            description={error}
            actionLabel="Tentar Novamente"
            onAction={() => void fetchMembersAndInviteCode()}
          />
        ) : filteredMembers.length === 0 ? (
          <StateView
            kind="empty"
            icon={<Users size={32} strokeWidth={1.75} color={theme.colors.inkMuted} />}
            title={
              searchQuery
                ? 'Nenhum morador encontrado'
                : 'Nenhum morador na casa'
            }
            description={
              searchQuery
                ? 'Nenhum morador corresponde à sua pesquisa.'
                : 'Compartilhe o código de convite para adicionar moradores.'
            }
          />
        ) : (
          <Surface tone="surface" bordered style={styles.membersSurface}>
            {filteredMembers.map((member, index) => {
              const isCurrentUser = member.uid === user?.uid;
              const isMemberOwner = member.uid === houseOwnerId || Boolean(member.isOwner);
              const canManageTarget = Boolean(
                canManageUsers && !isCurrentUser && !isMemberOwner
              );
              const roleDisplay = getRoleDisplay(member);
              const displayName = member.nickname || member.name;
              const titleText = isCurrentUser ? `${displayName} (Você)` : displayName;
              const entryLabel = member.entryDate
                ? ` · Desde ${formatShortDate(member.entryDate)}`
                : '';

              return (
                <ListRow
                  key={member.uid}
                  title={titleText}
                  subtitle={`${member.email}${entryLabel}`}
                  showDivider={index < filteredMembers.length - 1}
                  onPress={
                    canManageTarget
                      ? () => {
                          setPendingAction(null);
                          setSelectedMember(member);
                        }
                      : undefined
                  }
                  leading={
                    <Avatar
                      uri={member.profilePictureUrl ?? undefined}
                      name={displayName}
                      size="md"
                    />
                  }
                  trailing={
                    <View style={[styles.trailingRow, { gap: theme.spacing.xs }]}>
                      <StatusText
                        label={roleDisplay.label}
                        tone={roleDisplay.tone}
                        showDot
                      />
                      {canManageTarget ? (
                        <ChevronRight
                          size={18}
                          strokeWidth={1.75}
                          color={theme.colors.inkMuted}
                        />
                      ) : null}
                    </View>
                  }
                />
              );
            })}
          </Surface>
        )}
      </Screen>

      <BottomSheetModal
        visible={selectedMember !== null}
        onClose={closeMemberModal}
        title={
          selectedMember
            ? `Gerenciar ${selectedMemberDisplayName}`
            : 'Gerenciar morador'
        }
        dismissable={!actionLoading}
        dismissOnBackdropPress={!actionLoading}
        footer={
          pendingAction && selectedMember ? (
            <View style={[styles.confirmFooter, { gap: theme.spacing.sm }]}>
              <View style={styles.flexSlot}>
                <Button
                  label="Cancelar"
                  variant="secondary"
                  disabled={actionLoading}
                  fullWidth
                  onPress={() => setPendingAction(null)}
                />
              </View>
              <View style={styles.flexSlot}>
                <Button
                  label={pendingAction === 'remove' ? 'Remover' : 'Confirmar'}
                  variant={pendingAction === 'remove' ? 'danger' : 'primary'}
                  loading={actionLoading}
                  fullWidth
                  onPress={() => {
                    if (pendingAction === 'remove') {
                      void executeRemoveMember(selectedMember.uid);
                    } else if (pendingAction === 'promote') {
                      void executeChangeRole(selectedMember.uid, true);
                    } else if (pendingAction === 'demote') {
                      void executeChangeRole(selectedMember.uid, false);
                    }
                  }}
                />
              </View>
            </View>
          ) : undefined
        }
      >
        {selectedMember ? (
          pendingAction ? (
            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="body" color="inkSecondary">
                {pendingAction === 'remove'
                  ? `Tem certeza que deseja remover ${selectedMemberDisplayName} da casa? Esta ação não pode ser desfeita.`
                  : pendingAction === 'promote'
                    ? `Tem certeza que deseja promover ${selectedMemberDisplayName} a administrador?`
                    : `Tem certeza que deseja alterar ${selectedMemberDisplayName} para morador regular?`}
              </AppText>
            </View>
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              <View style={[styles.memberModalSummary, { gap: theme.spacing.sm }]}>
                <Avatar
                  uri={selectedMember.profilePictureUrl ?? undefined}
                  name={selectedMemberDisplayName}
                  size="md"
                />
                <View style={styles.flexSlot}>
                  <AppText variant="bodyStrong" color="ink">
                    {selectedMemberDisplayName}
                  </AppText>
                  <AppText variant="caption" color="inkSecondary">
                    {selectedMember.email}
                  </AppText>
                </View>
                <StatusText
                  label={getRoleDisplay(selectedMember).label}
                  tone={getRoleDisplay(selectedMember).tone}
                  showDot
                />
              </View>

              <Surface tone="surface" bordered style={styles.membersSurface}>
                {isOwner && !isSelectedMemberOwner && !allMembersAdmin ? (
                  <ListRow
                    title={
                      selectedMember.isAdmin
                        ? 'Tornar Morador Regular'
                        : 'Promover a Administrador'
                    }
                    subtitle={
                      selectedMember.isAdmin
                        ? 'Remove permissões administrativas individuais'
                        : 'Permite gerenciar convites, regras e moradores'
                    }
                    showDivider={!isSelectedMemberOwner}
                    onPress={() =>
                      setPendingAction(selectedMember.isAdmin ? 'demote' : 'promote')
                    }
                    leading={
                      selectedMember.isAdmin ? (
                        <ShieldOff
                          size={20}
                          strokeWidth={1.75}
                          color={theme.colors.warning}
                        />
                      ) : (
                        <Shield
                          size={20}
                          strokeWidth={1.75}
                          color={theme.colors.accent}
                        />
                      )
                    }
                  />
                ) : null}

                {!isSelectedMemberOwner ? (
                  <ListRow
                    title="Remover da Casa"
                    subtitle="Revoga o acesso deste morador à casa"
                    onPress={() => setPendingAction('remove')}
                    leading={
                      <Trash2
                        size={20}
                        strokeWidth={1.75}
                        color={theme.colors.danger}
                      />
                    }
                  />
                ) : null}
              </Surface>
            </View>
          )
        ) : null}
      </BottomSheetModal>
    </>
  );
};

const styles = StyleSheet.create({
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteTextBlock: {
    flex: 1,
    gap: 2,
  },
  inviteCodeText: {
    letterSpacing: 1.5,
  },
  membersSurface: {
    overflow: 'hidden',
  },
  trailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberModalSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmFooter: {
    flexDirection: 'row',
    width: '100%',
  },
  flexSlot: {
    flex: 1,
  },
});

export default MembersSettingsScreen;
