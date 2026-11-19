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
import api from '../../../src/services/api';
import { formatShortDate } from '../../../src/utils/dateUtils';
import { ErrorHandler } from '../../../src/utils/errorHandling';
import { logger } from '../../../src/utils/logger';

interface RepublicMember {
  uid: string;
  name: string;
  nickname?: string;
  email: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  currentRepublicId?: string;
  currentRepublicName?: string;
  isAdmin: boolean;
  createdAt: string;
  lastLogin?: string;
  status?: string;
  firebaseUid?: string;
  provider?: string;
  entryDate?: string;
  departureDate?: string;
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

  const [members, setMembers] = useState<RepublicMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [republicOwnerId, setRepublicOwnerId] = useState<string | null>(null);

  const [selectedMember, setSelectedMember] = useState<RepublicMember | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingMemberAction>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const isOwner = Boolean(user && republicOwnerId && user.uid === republicOwnerId);
  const canManageUsers = Boolean(
    user && (isOwner || members.some((member) => member.uid === user.uid && member.isAdmin))
  );

  const fetchMembersAndInviteCode = useCallback(async () => {
    if (!user?.currentRepublicId) {
      setLoading(false);
      setError('Você não está associado a nenhuma república.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const membersResponse = await api.get<RepublicMember[]>(
        `/api/v1/republics/${user.currentRepublicId}/members`
      );
      setMembers(membersResponse.data);

      const republicResponse = await api.get<{ ownerId?: string; code?: string }>(
        `/api/v1/republics/${user.currentRepublicId}`
      );
      logger.debug('Resposta completa da república:', republicResponse.data);

      if (republicResponse.data?.ownerId) {
        setRepublicOwnerId(republicResponse.data.ownerId);
      } else {
        logger.error(
          'ID do dono da república não encontrado na resposta:',
          republicResponse.data
        );
      }

      if (republicResponse.data?.code) {
        setInviteCode(republicResponse.data.code);
      } else {
        logger.error(
          'Código da república não encontrado na resposta:',
          republicResponse.data
        );
      }
    } catch (err) {
      const parsedError = await ErrorHandler.parseError(err);
      setError(parsedError.message);
      void ErrorHandler.handle(err);
    } finally {
      setLoading(false);
    }
  }, [user?.currentRepublicId]);

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
    if (!isOwner) {
      toast({
        title: 'Permissão negada',
        message: 'Apenas o dono da república pode promover membros a administradores.',
        tone: 'warning',
      });
      return;
    }

    if (!canManageUsers) {
      toast({
        title: 'Permissão negada',
        message: 'Você não tem permissão para gerenciar funções de membros.',
        tone: 'warning',
      });
      return;
    }

    try {
      setActionLoading(true);
      triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

      const endpoint = `/api/v1/republics/${user?.currentRepublicId}/members/${memberId}/admin`;
      const response = makeAdmin
        ? await api.post(endpoint)
        : await api.delete(endpoint);

      if (response.status >= 200 && response.status < 300) {
        setMembers((prevMembers) =>
          prevMembers.map((member) =>
            member.uid === memberId ? { ...member, isAdmin: makeAdmin } : member
          )
        );

        const actionMessage = makeAdmin
          ? 'promovido a administrador'
          : 'alterado para membro regular';
        toast({
          title: 'Função atualizada',
          message: `Membro ${actionMessage} com sucesso!`,
          tone: 'success',
        });
        triggerHaptic(() =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        );
        setSelectedMember(null);
        setPendingAction(null);
      }
    } catch (err) {
      logger.error('Erro ao alterar papel do membro:', err);
      void ErrorHandler.handle(err);
      triggerHaptic(() =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      );
    } finally {
      setActionLoading(false);
    }
  };

  const executeRemoveMember = async (memberId: string) => {
    if (!canManageUsers) {
      toast({
        title: 'Permissão negada',
        message: 'Você não tem permissão para remover membros.',
        tone: 'warning',
      });
      return;
    }

    if (memberId === republicOwnerId) {
      toast({
        title: 'Operação inválida',
        message: 'O dono da república não pode ser removido.',
        tone: 'warning',
      });
      return;
    }

    try {
      setActionLoading(true);
      triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));

      const response = await api.delete(
        `/api/v1/republics/${user?.currentRepublicId}/members/${memberId}`
      );

      if (response.status >= 200 && response.status < 300) {
        setMembers((prevMembers) =>
          prevMembers.filter((member) => member.uid !== memberId)
        );
        toast({
          title: 'Membro removido',
          message: 'Membro removido da república com sucesso!',
          tone: 'success',
        });
        triggerHaptic(() =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        );
        setSelectedMember(null);
        setPendingAction(null);
      }
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
        message: `Entre na minha república no RepHelper usando o código: ${inviteCode}`,
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
    member: RepublicMember
  ): { label: string; tone: StatusTone } => {
    if (member.uid === republicOwnerId) {
      return { label: 'Proprietário', tone: 'warning' };
    }
    if (member.isAdmin) {
      return { label: 'Administrador', tone: 'accent' };
    }
    return { label: 'Membro', tone: 'neutral' };
  };

  const header = (
    <ScreenHeader
      title="Membros da República"
      subtitle={`${members.length} ${members.length === 1 ? 'membro' : 'membros'} na república`}
      onBack={() => router.back()}
    />
  );

  const selectedMemberDisplayName = selectedMember
    ? selectedMember.nickname || selectedMember.name
    : '';
  const isSelectedMemberOwner = selectedMember?.uid === republicOwnerId;

  return (
    <>
      <Screen
        scroll
        header={header}
        contentContainerStyle={{ gap: theme.spacing.md }}
      >
        <TextField
          placeholder="Pesquisar membro..."
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
                  Código para convidar novos membros
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
          <StateView kind="loading" title="Carregando membros..." />
        ) : error ? (
          <StateView
            kind="error"
            title="Erro ao carregar membros"
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
                ? 'Nenhum membro encontrado'
                : 'Nenhum membro na república'
            }
            description={
              searchQuery
                ? 'Nenhum membro corresponde à sua pesquisa.'
                : 'Compartilhe o código de convite para adicionar moradores.'
            }
          />
        ) : (
          <Surface tone="surface" bordered style={styles.membersSurface}>
            {filteredMembers.map((member, index) => {
              const isCurrentUser = member.uid === user?.uid;
              const isMemberOwner = member.uid === republicOwnerId;
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
                      uri={member.profilePictureUrl}
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
            : 'Gerenciar membro'
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
                  label={
                    pendingAction === 'remove' ? 'Remover' : 'Confirmar'
                  }
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
                  ? `Tem certeza que deseja remover ${selectedMemberDisplayName} da república? Esta ação não pode ser desfeita.`
                  : pendingAction === 'promote'
                    ? `Tem certeza que deseja promover ${selectedMemberDisplayName} a administrador?`
                    : `Tem certeza que deseja rebaixar ${selectedMemberDisplayName} para membro regular?`}
              </AppText>
            </View>
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              <View style={[styles.memberModalSummary, { gap: theme.spacing.sm }]}>
                <Avatar
                  uri={selectedMember.profilePictureUrl}
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
                {isOwner && !isSelectedMemberOwner ? (
                  <ListRow
                    title={
                      selectedMember.isAdmin
                        ? 'Rebaixar para Membro'
                        : 'Promover a Administrador'
                    }
                    subtitle={
                      selectedMember.isAdmin
                        ? 'Remove permissões administrativas'
                        : 'Permite gerenciar convites e membros'
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
                    title="Remover da República"
                    subtitle="Revoga o acesso deste morador à república"
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
