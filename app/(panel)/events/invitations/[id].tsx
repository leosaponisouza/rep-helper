// app/(panel)/events/invitations/[id].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CheckCircle2,
  Circle,
  Mail,
  Search,
  Users,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../../../src/context/AuthContext';
import {
  AppText,
  Avatar,
  Button,
  Divider,
  IconButton,
  ListRow,
  Screen,
  ScreenHeader,
  SegmentedTabs,
  StateView,
  StatusText,
  Surface,
  TextField,
  useFeedback,
  useMotion,
  useTheme,
  type StatusTone,
} from '../../../../src/design-system';
import { useEvents } from '../../../../src/hooks/useEvents';
import { Event } from '../../../../src/services/events';
import { getRepublicMembers } from '../../../../src/services/republicService';
import { ErrorHandler } from '../../../../src/utils/errorHandling';
import { logger } from '../../../../src/utils/logger';

interface Member {
  uid: string;
  name: string;
  nickname?: string;
  email: string;
  profilePictureUrl?: string;
  isInvited: boolean;
  status?: string;
}

const InvitationsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const motion = useMotion();
  const { toast } = useFeedback();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { getEventById, isCurrentUserCreator, inviteUsers } = useEvents();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [event, setEvent] = useState<Event | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedMembersIds, setSelectedMembersIds] = useState<string[]>([]);
  const [tab, setTab] = useState<'invited' | 'new'>('invited');

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (id) {
      router.replace(`/(panel)/events/${id}`);
    } else {
      router.replace('/(panel)/events');
    }
  }, [router, id]);

  useEffect(() => {
    if (!motion.shouldAnimate) {
      fadeAnim.setValue(1);
      return;
    }

    fadeAnim.setValue(0);
    const anim = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: motion.duration(theme.motion.duration.normal, {
        allowReducedFade: true,
      }),
      easing: theme.motion.easing.standard,
      useNativeDriver: motion.useNativeDriver,
    });
    anim.start();

    return () => {
      anim.stop();
    };
  }, [
    fadeAnim,
    motion,
    theme.motion.duration.normal,
    theme.motion.easing.standard,
  ]);

  const fetchData = useCallback(async () => {
    if (!id || !user?.currentRepublicId) {
      setLoadError('Evento ou república não identificados.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const eventData = await getEventById(id);

      if (!eventData) {
        setLoadError('Evento não encontrado.');
        toast({
          title: 'Não encontrado',
          message: 'Evento não encontrado.',
          tone: 'warning',
        });
        return;
      }

      if (!eventData.invitations) {
        eventData.invitations = [];
      }

      setEvent(eventData);

      if (!isCurrentUserCreator(eventData)) {
        setLoadError(
          'Você não tem permissão para gerenciar convites para este evento.'
        );
        toast({
          title: 'Acesso negado',
          message:
            'Você não tem permissão para gerenciar convites para este evento.',
          tone: 'warning',
        });
        return;
      }

      try {
        const membersData = await getRepublicMembers(user.currentRepublicId);
        const normalized = Array.isArray(membersData) ? membersData : [];

        const mappedMembers: Member[] = normalized.map((member: any) => {
          const memberUid = String(member.uid || member.id || '');
          const invitation = eventData.invitations.find(
            (inv) => inv.userId === memberUid
          );

          return {
            uid: memberUid,
            name: String(member.name || ''),
            nickname: member.nickname ? String(member.nickname) : undefined,
            email: String(member.email || ''),
            profilePictureUrl: member.profilePictureUrl
              ? String(member.profilePictureUrl)
              : undefined,
            isInvited: Boolean(invitation),
            status: invitation?.status,
          };
        });

        setMembers(mappedMembers);
        setSelectedMembersIds(
          eventData.invitations.map((inv) => inv.userId)
        );
      } catch (error) {
        logger.error('Erro ao carregar membros:', error);
        void ErrorHandler.handle(error);
      }
    } catch (error) {
      logger.error('Erro ao carregar evento:', error);
      setLoadError('Não foi possível carregar os detalhes do evento.');
      void ErrorHandler.handle(error);
    } finally {
      setLoading(false);
    }
  }, [id, getEventById, isCurrentUserCreator, user?.currentRepublicId, toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredMembers = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return members;

    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(trimmed) ||
        (member.nickname && member.nickname.toLowerCase().includes(trimmed)) ||
        member.email.toLowerCase().includes(trimmed)
    );
  }, [searchQuery, members]);

  const notInvitedMembers = useMemo(
    () => filteredMembers.filter((member) => !member.isInvited),
    [filteredMembers]
  );

  const invitedMembers = useMemo(
    () => filteredMembers.filter((member) => member.isInvited),
    [filteredMembers]
  );

  const newInviteesIds = useMemo(
    () =>
      selectedMembersIds.filter(
        (memberId) => !event?.invitations?.some((inv) => inv.userId === memberId)
      ),
    [selectedMembersIds, event?.invitations]
  );

  const toggleMemberSelection = useCallback((memberId: string) => {
    setSelectedMembersIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((itemId) => itemId !== memberId)
        : [...prev, memberId]
    );
  }, []);

  const handleInviteMembers = useCallback(async () => {
    if (!id || !event) return;

    try {
      setActionLoading(true);

      if (newInviteesIds.length === 0) {
        toast({
          title: 'Nenhum selecionado',
          message: 'Selecione ao menos um novo membro para convidar.',
          tone: 'info',
        });
        return;
      }

      await inviteUsers(parseInt(id, 10), newInviteesIds);
      await fetchData();

      toast({
        title: 'Convites enviados',
        message: `${newInviteesIds.length} ${newInviteesIds.length === 1 ? 'membro convidado' : 'membros convidados'} com sucesso!`,
        tone: 'success',
      });
    } catch (error) {
      logger.error('Erro ao convidar membros:', error);
      void ErrorHandler.handle(error);
    } finally {
      setActionLoading(false);
    }
  }, [id, event, newInviteesIds, inviteUsers, fetchData, toast]);

  const activeList = tab === 'invited' ? invitedMembers : notInvitedMembers;

  const renderNewMemberItem = useCallback(
    ({ item, index }: { item: Member; index: number }) => {
      const isSelected = selectedMembersIds.includes(item.uid);
      const displayName = item.nickname || item.name;
      const isFirst = index === 0;
      const isLast = index === notInvitedMembers.length - 1;

      return (
        <View
          style={[
            styles.itemFrame,
            {
              borderColor: theme.colors.line,
              backgroundColor: theme.colors.surface,
              borderTopWidth: isFirst ? 1 : 0,
              borderBottomWidth: isLast ? 1 : 0,
              borderTopLeftRadius: isFirst ? theme.radius.md : 0,
              borderTopRightRadius: isFirst ? theme.radius.md : 0,
              borderBottomLeftRadius: isLast ? theme.radius.md : 0,
              borderBottomRightRadius: isLast ? theme.radius.md : 0,
            },
          ]}
        >
          <ListRow
            title={`${displayName}${item.uid === user?.uid ? ' (Você)' : ''}`}
            subtitle={item.email}
            selected={isSelected}
            showDivider={!isLast}
            disabled={actionLoading}
            onPress={() => toggleMemberSelection(item.uid)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            leading={
              <Avatar
                uri={item.profilePictureUrl}
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
        </View>
      );
    },
    [
      selectedMembersIds,
      notInvitedMembers.length,
      theme.colors.line,
      theme.colors.surface,
      theme.colors.accent,
      theme.colors.borderStrong,
      theme.radius.md,
      user?.uid,
      actionLoading,
      toggleMemberSelection,
    ]
  );

  const renderInvitedMemberItem = useCallback(
    ({ item, index }: { item: Member; index: number }) => {
      const displayName = item.nickname || item.name;
      const isFirst = index === 0;
      const isLast = index === invitedMembers.length - 1;

      const statusMeta: { label: string; tone: StatusTone } =
        item.status === 'CONFIRMED'
          ? { label: 'Confirmado', tone: 'success' }
          : item.status === 'DECLINED'
            ? { label: 'Recusado', tone: 'danger' }
            : { label: 'Convidado', tone: 'warning' };

      return (
        <View
          style={[
            styles.itemFrame,
            {
              borderColor: theme.colors.line,
              backgroundColor: theme.colors.surface,
              borderTopWidth: isFirst ? 1 : 0,
              borderBottomWidth: isLast ? 1 : 0,
              borderTopLeftRadius: isFirst ? theme.radius.md : 0,
              borderTopRightRadius: isFirst ? theme.radius.md : 0,
              borderBottomLeftRadius: isLast ? theme.radius.md : 0,
              borderBottomRightRadius: isLast ? theme.radius.md : 0,
            },
          ]}
        >
          <ListRow
            title={`${displayName}${item.uid === user?.uid ? ' (Você)' : ''}`}
            subtitle={item.email}
            showDivider={!isLast}
            leading={
              <Avatar
                uri={item.profilePictureUrl}
                name={displayName}
                size="md"
              />
            }
            trailing={
              <StatusText
                label={statusMeta.label}
                tone={statusMeta.tone}
                showDot
              />
            }
          />
        </View>
      );
    },
    [invitedMembers.length, theme.colors.line, theme.colors.surface, theme.radius.md, user?.uid]
  );

  const renderEmptyState = useCallback(() => {
    if (loading) {
      return <StateView kind="loading" title="Carregando membros..." />;
    }

    if (searchQuery && filteredMembers.length === 0) {
      return (
        <StateView
          kind="empty"
          icon={<Search size={32} strokeWidth={1.75} color={theme.colors.inkMuted} />}
          title="Nenhum resultado"
          description={`Nenhum membro encontrado com "${searchQuery}".`}
          actionLabel="Limpar Busca"
          onAction={() => setSearchQuery('')}
        />
      );
    }

    if (tab === 'invited' && invitedMembers.length === 0) {
      return (
        <StateView
          kind="empty"
          icon={<Users size={32} strokeWidth={1.75} color={theme.colors.inkMuted} />}
          title="Nenhum membro convidado"
          description="Nenhum membro foi convidado para este evento ainda."
          actionLabel="Convidar Membros"
          onAction={() => setTab('new')}
        />
      );
    }

    if (tab === 'new' && notInvitedMembers.length === 0) {
      return (
        <StateView
          kind="empty"
          icon={
            <CheckCircle2 size={32} strokeWidth={1.75} color={theme.colors.success} />
          }
          title="Todos os membros já foram convidados"
          description='Você pode acompanhar as respostas na aba "Convidados".'
          actionLabel="Ver Convidados"
          onAction={() => setTab('invited')}
        />
      );
    }

    return null;
  }, [
    loading,
    searchQuery,
    filteredMembers.length,
    tab,
    invitedMembers.length,
    notInvitedMembers.length,
    theme.colors.inkMuted,
    theme.colors.success,
  ]);

  const header = (
    <ScreenHeader
      title="Gerenciar Convidados"
      variant="compact"
      onBack={handleBack}
    />
  );

  if (loading && !event) {
    return (
      <Screen header={header}>
        <StateView kind="loading" title="Carregando..." />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen header={header}>
        <StateView
          kind="error"
          title="Não foi possível carregar"
          description={loadError}
          actionLabel="Voltar"
          onAction={handleBack}
        />
      </Screen>
    );
  }

  return (
    <Screen width="wide" padded={false} header={header}>
      <Animated.View
        style={[
          styles.topControls,
          {
            opacity: fadeAnim,
            padding: theme.spacing.md,
            gap: theme.spacing.sm,
          },
        ]}
      >
        {event ? (
          <Surface tone="surface" bordered padded="md" radiusKey="md">
            <AppText variant="monoLabel" color="inkSecondary">
              Evento
            </AppText>
            <AppText variant="heading" color="ink" numberOfLines={2}>
              {event.title}
            </AppText>
          </Surface>
        ) : null}

        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            {
              value: 'invited',
              label: 'Convidados',
              badge: invitedMembers.length,
            },
            {
              value: 'new',
              label: 'Convidar',
              badge: notInvitedMembers.length,
            },
          ]}
        />

        <TextField
          placeholder="Buscar membro por nome ou email"
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

        {tab === 'new' && notInvitedMembers.length > 0 ? (
          <View style={styles.selectionCountContainer}>
            <AppText variant="caption" color="inkSecondary">
              {newInviteesIds.length}{' '}
              {newInviteesIds.length === 1
                ? 'membro selecionado'
                : 'membros selecionados'}
            </AppText>
            {newInviteesIds.length > 0 ? (
              <Button
                label="Limpar seleção"
                variant="ghost"
                size="sm"
                onPress={() =>
                  setSelectedMembersIds(
                    event?.invitations?.map((inv) => inv.userId) ?? []
                  )
                }
              />
            ) : null}
          </View>
        ) : null}
      </Animated.View>

      <Divider />

      <FlatList
        data={activeList}
        renderItem={
          tab === 'invited' ? renderInvitedMemberItem : renderNewMemberItem
        }
        keyExtractor={(item) => item.uid}
        contentContainerStyle={[
          styles.listContent,
          {
            padding: theme.spacing.md,
            paddingBottom:
              tab === 'new' && notInvitedMembers.length > 0
                ? theme.spacing.xxl
                : theme.spacing.xl,
          },
        ]}
        ListEmptyComponent={renderEmptyState}
      />

      {tab === 'new' && notInvitedMembers.length > 0 ? (
        <Surface
          tone="surface"
          padded="md"
          radiusKey="none"
          style={[
            styles.bottomBar,
            {
              borderTopColor: theme.colors.line,
            },
          ]}
        >
          <Button
            label={`Convidar ${newInviteesIds.length} ${newInviteesIds.length === 1 ? 'Membro' : 'Membros'}`}
            variant="primary"
            fullWidth
            loading={actionLoading}
            disabled={newInviteesIds.length === 0}
            leftIcon={
              <Mail size={18} strokeWidth={1.75} color={theme.colors.onAccent} />
            }
            onPress={() => void handleInviteMembers()}
          />
        </Surface>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  topControls: {
    width: '100%',
  },
  selectionCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 36,
  },
  itemFrame: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  listContent: {
    flexGrow: 1,
  },
  bottomBar: {
    borderTopWidth: 1,
    width: '100%',
  },
});

export default InvitationsScreen;
