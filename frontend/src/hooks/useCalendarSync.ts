import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  CalendarService,
  CalendarSyncErrorCode,
} from '../services/calendar/calendarService';
import { Event } from '../services/events/eventsTypes';
import { useEvents } from './useEvents';
import { useFeedback } from '../design-system';
import { logger } from '../utils/logger';

export interface CalendarSyncResult {
  success: number;
  failure: number;
  calendarSource?: string | null;
}

/**
 * Hook personalizado para gerenciar a sincronização de eventos com o calendário do dispositivo
 */
export const useCalendarSync = () => {
  const { toast, confirm } = useFeedback();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<CalendarSyncResult | null>(null);
  const [isCalendarPickerVisible, setIsCalendarPickerVisibleState] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [selectedCalendarSource, setSelectedCalendarSource] = useState<string | null>(null);
  const [currentSyncEvent, setCurrentSyncEvent] = useState<Event | null>(null);
  const [currentSyncEvents, setCurrentSyncEvents] = useState<Event[]>([]);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const { events: allEvents } = useEvents();

  const selectedCalendarRef = useRef<{ id: string | null; source: string | null }>({
    id: null,
    source: null,
  });

  const isLoading = syncing;

  const setIsCalendarPickerVisible = useCallback((visible: boolean) => {
    setIsCalendarPickerVisibleState(visible);
    if (!visible) {
      setCurrentSyncEvent(null);
      setCurrentSyncEvents([]);
      setIsSyncingAll(false);
    }
  }, []);

  const notifyPermissionDenied = useCallback(() => {
    toast({
      title: Platform.OS === 'web' ? 'Indisponível na Web' : 'Permissão necessária',
      message:
        Platform.OS === 'web'
          ? 'A sincronização com o calendário do dispositivo está disponível apenas no aplicativo mobile.'
          : 'Para sincronizar eventos, precisamos de acesso ao seu calendário.',
      tone: 'warning',
    });
  }, [toast]);

  const promptCalendarPicker = useCallback(
    async (pending: { event?: Event; events?: Event[] }): Promise<boolean> => {
      const shouldOpenPicker = await confirm({
        title: 'Calendário não encontrado',
        message:
          'Não foi possível encontrar um calendário válido automaticamente. Deseja selecionar um calendário manualmente?',
        confirmLabel: 'Selecionar calendário',
        cancelLabel: 'Cancelar',
      });

      if (shouldOpenPicker) {
        if (pending.event) {
          setCurrentSyncEvent(pending.event);
          setCurrentSyncEvents([]);
          setIsSyncingAll(false);
        } else if (pending.events) {
          setCurrentSyncEvent(null);
          setCurrentSyncEvents(pending.events);
          setIsSyncingAll(true);
        }
        setIsCalendarPickerVisibleState(true);
        return true;
      }

      return false;
    },
    [confirm]
  );

  const handleSyncErrorCode = useCallback(
    async (
      errorCode: CalendarSyncErrorCode | undefined,
      pending: { event?: Event; events?: Event[] }
    ): Promise<boolean> => {
      if (errorCode === 'permission_denied') {
        notifyPermissionDenied();
        return false;
      }

      if (errorCode === 'no_calendar') {
        return promptCalendarPicker(pending);
      }

      toast({
        title: 'Erro na sincronização',
        message: 'Não foi possível adicionar o(s) evento(s) ao calendário.',
        tone: 'danger',
      });
      return false;
    },
    [notifyPermissionDenied, promptCalendarPicker, toast]
  );

  const runSingleSync = useCallback(
    async (
      event: Event,
      target?: { calendarId?: string; calendarSource?: string | null }
    ): Promise<boolean> => {
      let openedPicker = false;

      try {
        setSyncing(true);

        const resolvedId = target?.calendarId ?? selectedCalendarRef.current.id ?? undefined;
        const resolvedSource =
          target?.calendarSource !== undefined
            ? target.calendarSource
            : selectedCalendarRef.current.source;

        const result = await CalendarService.addEventToCalendar(
          event,
          resolvedId ? { calendarId: resolvedId, calendarSource: resolvedSource } : undefined
        );

        if (result.eventId) {
          setSelectedCalendarSource(result.calendarSource ?? null);
          selectedCalendarRef.current.source = result.calendarSource ?? null;
          const sourceLabel = result.calendarSource ? ` ${result.calendarSource}` : '';
          toast({
            title: 'Evento sincronizado',
            message: `Evento adicionado com sucesso ao calendário${sourceLabel}!`,
            tone: 'success',
          });
          return true;
        }

        openedPicker = await handleSyncErrorCode(result.errorCode, { event });
        return false;
      } catch (error) {
        logger.error('Erro ao sincronizar evento:', error);
        toast({
          title: 'Erro na sincronização',
          message: 'Não foi possível adicionar o evento ao calendário.',
          tone: 'danger',
        });
        return false;
      } finally {
        setSyncing(false);
        if (!openedPicker) {
          setCurrentSyncEvent(null);
        }
      }
    },
    [handleSyncErrorCode, toast]
  );

  const runBatchSync = useCallback(
    async (
      events: Event[],
      target?: { calendarId?: string; calendarSource?: string | null }
    ): Promise<CalendarSyncResult> => {
      let openedPicker = false;

      try {
        setSyncing(true);

        const resolvedId = target?.calendarId ?? selectedCalendarRef.current.id ?? undefined;
        const resolvedSource =
          target?.calendarSource !== undefined
            ? target.calendarSource
            : selectedCalendarRef.current.source;

        const result = await CalendarService.syncEventsWithCalendar(
          events,
          resolvedId ? { calendarId: resolvedId, calendarSource: resolvedSource } : undefined
        );

        const adaptedResult: CalendarSyncResult = {
          success: result.success,
          failure: result.failed,
          calendarSource: result.calendarSource,
        };

        if (result.errorCode && result.success === 0) {
          openedPicker = await handleSyncErrorCode(result.errorCode, { events });
          return adaptedResult;
        }

        setLastSyncResult(adaptedResult);
        setSelectedCalendarSource(result.calendarSource);
        selectedCalendarRef.current.source = result.calendarSource;

        const sourceLabel = result.calendarSource ? ` ${result.calendarSource}` : '';
        const summaryMessage =
          adaptedResult.failure > 0
            ? `${adaptedResult.success} sincronizado(s) e ${adaptedResult.failure} não puderam ser adicionados ao calendário${sourceLabel}.`
            : `${adaptedResult.success} evento(s) sincronizado(s) com o calendário${sourceLabel}!`;

        toast({
          title: 'Sincronização concluída',
          message: summaryMessage,
          tone: adaptedResult.failure > 0 ? 'warning' : 'success',
        });

        return adaptedResult;
      } catch (error) {
        logger.error('Erro ao sincronizar eventos:', error);
        toast({
          title: 'Erro na sincronização',
          message: 'Ocorreu um erro ao sincronizar seus eventos com o calendário.',
          tone: 'danger',
        });
        return { success: 0, failure: events.length };
      } finally {
        setSyncing(false);
        if (!openedPicker) {
          setCurrentSyncEvents([]);
          setIsSyncingAll(false);
        }
      }
    },
    [handleSyncErrorCode, toast]
  );

  const syncEventsWithCalendar = useCallback(
    async (events: Event[], calendarId?: string): Promise<CalendarSyncResult> => {
      if (events.length === 0) {
        toast({
          title: 'Nenhum evento disponível',
          message: 'Não há eventos para sincronizar.',
          tone: 'info',
        });
        return { success: 0, failure: 0 };
      }

      return runBatchSync(
        events,
        calendarId ? { calendarId, calendarSource: selectedCalendarRef.current.source } : undefined
      );
    },
    [runBatchSync, toast]
  );

  const selectCalendar = useCallback(
    (calendarId: string, calendarSource?: string) => {
      const normalizedSource = calendarSource ?? null;
      selectedCalendarRef.current = { id: calendarId, source: normalizedSource };
      setSelectedCalendarId(calendarId);
      if (calendarSource) {
        setSelectedCalendarSource(calendarSource);
      }

      if (currentSyncEvent) {
        void runSingleSync(currentSyncEvent, {
          calendarId,
          calendarSource: normalizedSource,
        });
      } else if (isSyncingAll) {
        void runBatchSync(currentSyncEvents, {
          calendarId,
          calendarSource: normalizedSource,
        });
      }
    },
    [currentSyncEvent, currentSyncEvents, isSyncingAll, runBatchSync, runSingleSync]
  );

  /**
   * Sincroniza um único evento com o calendário
   */
  const syncEventWithCalendar = useCallback(
    async (event: Event): Promise<boolean> => {
      return runSingleSync(event);
    },
    [runSingleSync]
  );

  /**
   * Sincroniza todos os eventos confirmados com o calendário
   */
  const syncConfirmedEvents = useCallback(async (): Promise<CalendarSyncResult> => {
    const confirmedEvents = allEvents.filter(
      (event) =>
        (event as any).status === 'confirmed' ||
        event.invitations?.some((invitation) => invitation.status === 'CONFIRMED')
    );

    if (confirmedEvents.length === 0) {
      toast({
        title: 'Nenhum evento confirmado',
        message: 'Você não tem eventos confirmados para sincronizar.',
        tone: 'info',
      });
      return { success: 0, failure: 0 };
    }

    return runBatchSync(confirmedEvents);
  }, [allEvents, runBatchSync, toast]);

  /**
   * Sincroniza todos os eventos com o calendário
   */
  const syncAllEvents = useCallback(async (): Promise<CalendarSyncResult> => {
    if (allEvents.length === 0) {
      toast({
        title: 'Nenhum evento disponível',
        message: 'Você não tem eventos para sincronizar.',
        tone: 'info',
      });
      return { success: 0, failure: 0 };
    }

    return runBatchSync(allEvents);
  }, [allEvents, runBatchSync, toast]);

  useEffect(() => {
    return () => {
      setCurrentSyncEvent(null);
      setCurrentSyncEvents([]);
      setIsSyncingAll(false);
    };
  }, []);

  return {
    syncing,
    isLoading,
    lastSyncResult,
    syncEventWithCalendar,
    syncConfirmedEvents,
    syncAllEvents,
    syncEventsWithCalendar,
    isCalendarPickerVisible,
    setIsCalendarPickerVisible,
    selectCalendar,
    selectedCalendarId,
    selectedCalendarSource,
  };
};
