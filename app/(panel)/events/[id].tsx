// app/(panel)/events/[id].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Share, StyleSheet, View } from 'react-native';
import {
  differenceInMinutes,
  format,
  isAfter,
  isPast,
  isToday,
  isTomorrow,
  isValid,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Calendar as CalendarIcon,
  Clock,
  Edit2,
  MapPin,
  Share2,
  Users,
} from 'lucide-react-native';
import { CalendarPicker } from '../../../components/events/CalendarPicker';
import { EventAttendanceGroups } from '../../../components/events/EventDetails/EventAttendanceGroups';
import { EventParticipationActions } from '../../../components/events/EventDetails/EventParticipationActions';
import { useAuth } from '../../../src/context/AuthContext';
import {
  AppText,
  Button,
  ConfirmSection,
  IconButton,
  ListRow,
  Screen,
  ScreenHeader,
  StateView,
  StatusText,
  Surface,
  useFeedback,
  useMotion,
  useTheme,
  type StatusTone,
} from '../../../src/design-system';
import { useCalendarSync } from '../../../src/hooks/useCalendarSync';
import { useEvents } from '../../../src/hooks/useEvents';
import { Event } from '../../../src/services/events';
import { ErrorHandler } from '../../../src/utils/errorHandling';
import { logger } from '../../../src/utils/logger';

const triggerSuccessHaptic = () => {
  if (Platform.OS === 'web') return;
  try {
    void Promise.resolve(
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    ).catch(() => {});
  } catch {
    // Ignore haptics errors on unsupported devices
  }
};

const EventDetailsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const motion = useMotion();
  const { toast } = useFeedback();
  const { id } = useLocalSearchParams<{ id: string; source?: string }>();
  const { user } = useAuth();
  const { getEventById, updateInvitationStatus, deleteEvent } = useEvents();
  const {
    syncing,
    syncEventWithCalendar,
    isCalendarPickerVisible,
    setIsCalendarPickerVisible,
    selectCalendar,
  } = useCalendarSync();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadedEventId = event?.id;

  useEffect(() => {
    if (!loadedEventId) return;
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
    loadedEventId,
    fadeAnim,
    motion,
    theme.motion.duration.normal,
    theme.motion.easing.standard,
  ]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(panel)/events');
    }
  }, [router]);

  const loadEventDetails = useCallback(async () => {
    if (!id) {
      setError('Identificador do evento não informado.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const eventData = await getEventById(id);
      if (eventData) {
        setEvent(eventData);
      } else {
        setError('Evento não encontrado');
      }
    } catch (err) {
      logger.error('Erro ao carregar detalhes do evento:', err);
      void ErrorHandler.handle(err);
      setError('Não foi possível carregar os detalhes do evento');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, getEventById]);

  useFocusEffect(
    useCallback(() => {
      void loadEventDetails();
    }, [loadEventDetails])
  );

  const isCreator = useMemo(() => {
    if (!event || !user) return false;
    return event.creatorId === user.uid;
  }, [event, user]);

  const userInvitation = useMemo(() => {
    if (!event || !user || !event.invitations) return null;
    return event.invitations.find((inv) => inv.userId === user.uid) || null;
  }, [event, user]);

  const formatEventDate = useCallback((dateString?: string): string => {
    if (!dateString) return '';

    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return dateString;

      if (isToday(date)) {
        return `Hoje, ${format(date, 'HH:mm', { locale: ptBR })}`;
      }
      if (isTomorrow(date)) {
        return `Amanhã, ${format(date, 'HH:mm', { locale: ptBR })}`;
      }
      return format(date, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  }, []);

  const formatEventDuration = useCallback(
    (startDate?: string, endDate?: string): string => {
      if (!startDate || !endDate) return '';

      try {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        if (!isValid(start) || !isValid(end)) return '';
        const durationMinutes = differenceInMinutes(end, start);

        if (durationMinutes < 60) {
          return `${durationMinutes} minutos`;
        }

        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        if (minutes === 0) {
          return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
        }
        return `${hours} ${hours === 1 ? 'hora' : 'horas'} e ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
      } catch {
        return '';
      }
    },
    []
  );

  const handleUpdateStatus = useCallback(
    async (status: 'CONFIRMED' | 'DECLINED') => {
      if (!event || !user) return;

      try {
        setRefreshing(true);
        await updateInvitationStatus(event.id, user.uid, status);
        await loadEventDetails();
        toast({
          title: 'Participação atualizada',
          message:
            status === 'CONFIRMED'
              ? 'Presença confirmada neste evento.'
              : 'Convite recusado.',
          tone: 'success',
        });
      } catch (err) {
        // EventsService.updateInvitationStatus already displays API error toast via ErrorHandler.handle
        logger.error('Erro ao atualizar status de participação:', err);
      } finally {
        setRefreshing(false);
      }
    },
    [event, user, updateInvitationStatus, loadEventDetails, toast]
  );

  const handleShareEvent = useCallback(async () => {
    if (!event) return;

    const message =
      `Evento: ${event.title}\n` +
      `Data: ${formatEventDate(event.startDate)}\n` +
      (event.location ? `Local: ${event.location}\n` : '') +
      (event.description ? `\n${event.description}` : '');

    try {
      if (
        Platform.OS === 'web' &&
        typeof navigator !== 'undefined' &&
        !navigator.share &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(message);
        toast({
          title: 'Resumo copiado',
          message: 'Os detalhes do evento foram copiados para a área de transferência.',
          tone: 'success',
        });
        return;
      }

      await Share.share({
        message,
        title: event.title,
      });
    } catch (err) {
      logger.error('Erro ao compartilhar evento:', err);
      toast({
        title: 'Erro',
        message: 'Não foi possível compartilhar o evento.',
        tone: 'danger',
      });
    }
  }, [event, formatEventDate, toast]);

  const handleDeleteEvent = useCallback(async () => {
    if (!event) return;

    if (!showConfirmDelete) {
      setShowConfirmDelete(true);
      return;
    }

    try {
      setRefreshing(true);
      await deleteEvent(event.id);
      triggerSuccessHaptic();
      toast({
        title: 'Evento excluído',
        message: 'Evento excluído com sucesso!',
        tone: 'success',
      });
      router.replace('/(panel)/events');
    } catch (err) {
      // EventsService.deleteEvent already displays API error toast via ErrorHandler.handle
      logger.error('Erro ao excluir evento:', err);
      setShowConfirmDelete(false);
    } finally {
      setRefreshing(false);
    }
  }, [event, showConfirmDelete, deleteEvent, toast, router]);

  const handleCancelDelete = useCallback(() => {
    setShowConfirmDelete(false);
  }, []);

  const eventHasPassed = useMemo(() => {
    if (!event || !event.endDate) return false;
    try {
      const endDate = parseISO(event.endDate);
      return isValid(endDate) && isPast(endDate);
    } catch {
      return false;
    }
  }, [event]);

  const eventIsHappening = useMemo(() => {
    if (!event || !event.startDate || !event.endDate) return false;
    try {
      const now = new Date();
      const startDate = parseISO(event.startDate);
      const endDate = parseISO(event.endDate);
      return (
        isValid(startDate) &&
        isValid(endDate) &&
        isAfter(now, startDate) &&
        isAfter(endDate, now)
      );
    } catch {
      return false;
    }
  }, [event]);

  const baseHeader = (
    <ScreenHeader
      title="Detalhes do Evento"
      variant="compact"
      onBack={handleBack}
    />
  );

  if (loading && !event) {
    return (
      <Screen header={baseHeader}>
        <StateView kind="loading" title="Carregando detalhes do compromisso..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen header={baseHeader}>
        <StateView
          kind="error"
          title="Não foi possível carregar"
          description={error}
          actionLabel="Tentar novamente"
          onAction={() => void loadEventDetails()}
        />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen header={baseHeader}>
        <StateView
          kind="empty"
          icon={
            <CalendarIcon size={32} strokeWidth={1.75} color={theme.colors.inkMuted} />
          }
          title="Compromisso não encontrado"
          description="O evento solicitado não foi encontrado ou foi excluído."
          actionLabel="Voltar para Agenda"
          onAction={() => router.replace('/(panel)/events')}
        />
      </Screen>
    );
  }

  const invitationBadge: { label: string; tone: StatusTone } | null = userInvitation
    ? userInvitation.status === 'CONFIRMED'
      ? { label: 'Você está confirmado', tone: 'success' }
      : userInvitation.status === 'INVITED'
        ? { label: 'Você foi convidado', tone: 'warning' }
        : { label: 'Você recusou o convite', tone: 'danger' }
    : null;

  const durationText = formatEventDuration(event.startDate, event.endDate);
  const dateSubtitleParts: string[] = [];
  if (event.endDate) {
    dateSubtitleParts.push(`Término: ${formatEventDate(event.endDate)}`);
  }
  if (durationText) {
    dateSubtitleParts.push(`Duração: ${durationText}`);
  }

  const header = (
    <ScreenHeader
      title="Detalhes do Evento"
      variant="compact"
      onBack={handleBack}
      rightActions={
        <>
          <IconButton
            icon={<Share2 size={20} strokeWidth={1.75} color={theme.colors.ink} />}
            onPress={() => void handleShareEvent()}
            accessibilityLabel="Compartilhar evento"
            variant="ghost"
          />
          {isCreator ? (
            <IconButton
              icon={<Edit2 size={20} strokeWidth={1.75} color={theme.colors.accent} />}
              onPress={() => router.push(`/(panel)/events/edit/${event.id}`)}
              accessibilityLabel="Editar evento"
              variant="ghost"
            />
          ) : null}
        </>
      }
    />
  );

  return (
    <Screen
      scroll
      header={header}
      contentContainerStyle={{
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xxl,
      }}
    >
      <Animated.View style={{ opacity: fadeAnim, gap: theme.spacing.md }}>
        <Surface
          tone="surface"
          bordered
          padded="md"
          radiusKey="md"
          style={{ gap: theme.spacing.sm }}
        >
          {eventHasPassed || eventIsHappening || invitationBadge ? (
            <View style={[styles.statusRow, { gap: theme.spacing.sm }]}>
              {eventHasPassed ? (
                <StatusText
                  label="Compromisso finalizado"
                  tone="neutral"
                  showDot
                />
              ) : eventIsHappening ? (
                <StatusText label="Acontecendo agora" tone="accent" showDot />
              ) : null}

              {invitationBadge ? (
                <StatusText
                  label={invitationBadge.label}
                  tone={invitationBadge.tone}
                  showDot
                />
              ) : null}
            </View>
          ) : null}

          <View style={[styles.titleRow, { gap: theme.spacing.sm }]}>
            <AppText variant="title" color="ink" style={styles.eventTitle}>
              {event.title}
            </AppText>

            <Button
              label="Sincronizar"
              variant="secondary"
              size="sm"
              loading={syncing}
              leftIcon={
                <CalendarIcon
                  size={16}
                  strokeWidth={1.75}
                  color={theme.colors.accent}
                />
              }
              onPress={() => setIsCalendarPickerVisible(true)}
            />
          </View>
        </Surface>

        <Surface
          tone="surface"
          bordered
          radiusKey="md"
          style={styles.detailsSurface}
        >
          <ListRow
            title={formatEventDate(event.startDate)}
            subtitle={
              dateSubtitleParts.length > 0
                ? dateSubtitleParts.join(' • ')
                : 'Data e hora de início'
            }
            showDivider={Boolean(event.location)}
            leading={
              <Clock size={18} strokeWidth={1.75} color={theme.colors.accent} />
            }
          />

          {event.location ? (
            <ListRow
              title={event.location}
              subtitle="Local"
              leading={
                <MapPin size={18} strokeWidth={1.75} color={theme.colors.accent} />
              }
            />
          ) : null}
        </Surface>

        {event.description ? (
          <Surface
            tone="surface"
            bordered
            padded="md"
            radiusKey="md"
            style={{ gap: theme.spacing.xs }}
          >
            <AppText variant="monoLabel" color="inkSecondary">
              Descrição
            </AppText>
            <AppText variant="body" color="ink">
              {event.description}
            </AppText>
          </Surface>
        ) : null}

        {isCreator ? (
          <Surface
            tone="surface"
            bordered
            padded="md"
            radiusKey="md"
            style={{ gap: theme.spacing.sm }}
          >
            <AppText variant="heading" color="ink">
              Ações Rápidas
            </AppText>
            <Button
              label="Gerenciar Convidados"
              variant="secondary"
              fullWidth
              leftIcon={
                <Users size={18} strokeWidth={1.75} color={theme.colors.accent} />
              }
              onPress={() => router.push(`/(panel)/events/invitations/${event.id}`)}
            />
          </Surface>
        ) : null}

        <EventAttendanceGroups
          invitations={event.invitations}
          currentUserId={user?.uid}
        />

        <EventParticipationActions
          eventHasPassed={eventHasPassed}
          userInvitation={userInvitation}
          refreshing={refreshing}
          onUpdateStatus={(status) => void handleUpdateStatus(status)}
        />

        {isCreator ? (
          <ConfirmSection
            title="Ações do organizador"
            deleteLabel="Excluir evento"
            showConfirm={showConfirmDelete}
            loading={refreshing}
            onPressDelete={() => void handleDeleteEvent()}
            onCancelConfirm={handleCancelDelete}
          />
        ) : null}
      </Animated.View>

      <CalendarPicker
        isVisible={isCalendarPickerVisible}
        onClose={() => setIsCalendarPickerVisible(false)}
        onSelect={(calendarId, calendarSource) => {
          selectCalendar(calendarId, calendarSource);
          if (event) {
            void syncEventWithCalendar(event);
          }
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  eventTitle: {
    flex: 1,
    minWidth: 180,
  },
  detailsSurface: {
    overflow: 'hidden',
  },
});

export default EventDetailsScreen;
