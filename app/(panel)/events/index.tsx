// app/(panel)/events/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Calendar as CalendarIcon, Plus } from 'lucide-react-native';
import { CalendarPicker } from '../../../components/CalendarPicker';
import Calendar from '../../../components/Event/Calendar';
import CalendarSkeleton from '../../../components/Event/CalendarSkeleton';
import { useAuth } from '../../../src/context/AuthContext';
import {
  Button,
  Screen,
  ScreenHeader,
  useFeedback,
  useTheme,
} from '../../../src/design-system';
import { useCalendarSync } from '../../../src/hooks/useCalendarSync';
import { useEvents } from '../../../src/hooks/useEvents';
import { formatLocalDate } from '../../../src/utils/dateUtils';
import { ErrorHandler } from '../../../src/utils/errorHandling';
import { logger } from '../../../src/utils/logger';

const EventsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const { user } = useAuth();
  const { events, refreshEvents } = useEvents();
  const {
    setIsCalendarPickerVisible,
    isCalendarPickerVisible,
    selectCalendar,
    syncConfirmedEvents,
  } = useCalendarSync();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [calendarLoading, setCalendarLoading] = useState<boolean>(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const eventsLoaded = useRef(false);
  const isRefreshing = useRef(false);
  const isMountedRef = useRef(true);
  const skeletonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshEventsRef = useRef(refreshEvents);
  refreshEventsRef.current = refreshEvents;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (skeletonTimerRef.current) {
        clearTimeout(skeletonTimerRef.current);
      }
    };
  }, []);

  const formattedDate = useMemo(() => {
    try {
      return formatLocalDate(selectedDate, 'yyyy-MM-dd') || formatLocalDate(new Date(), 'yyyy-MM-dd');
    } catch (error) {
      logger.error('Erro ao formatar data:', error);
      return formatLocalDate(new Date(), 'yyyy-MM-dd');
    }
  }, [selectedDate]);

  const refreshCalendarEvents = useCallback(async (showSkeleton: boolean) => {
    if (isRefreshing.current) return;

    try {
      isRefreshing.current = true;
      setRefreshing(true);
      if (showSkeleton) {
        setCalendarLoading(true);
      }

      const ok = await refreshEventsRef.current('all');

      if (ok) {
        eventsLoaded.current = true;
        if (isMountedRef.current) {
          setLastRefresh(new Date());
        }
      } else if (isMountedRef.current) {
        toast({
          title: 'Erro ao carregar agenda',
          message: 'Não foi possível carregar os eventos. Tente novamente.',
          tone: 'danger',
        });
      }

      if (showSkeleton) {
        if (skeletonTimerRef.current) {
          clearTimeout(skeletonTimerRef.current);
        }
        skeletonTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setCalendarLoading(false);
          }
        }, 300);
      }
    } catch (error) {
      logger.error('Erro ao atualizar eventos do calendário:', error);
      void ErrorHandler.handle(error);
      if (isMountedRef.current) {
        setCalendarLoading(false);
      }
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
      isRefreshing.current = false;
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      void refreshCalendarEvents(!eventsLoaded.current);

      return () => {
        if (!router.canGoBack()) {
          eventsLoaded.current = false;
        }
      };
    }, [router, refreshCalendarEvents])
  );

  const handlePullToRefresh = useCallback(async () => {
    if (isRefreshing.current) return;

    try {
      isRefreshing.current = true;
      setRefreshing(true);
      const ok = await refreshEvents('all');

      if (isMountedRef.current) {
        if (ok) {
          setLastRefresh(new Date());
          toast({
            title: 'Agenda atualizada',
            message: 'Eventos atualizados com sucesso.',
            tone: 'success',
          });
        } else {
          toast({
            title: 'Erro ao atualizar',
            message: 'Não foi possível atualizar os eventos. Tente novamente.',
            tone: 'danger',
          });
        }
      }
    } catch (error) {
      logger.error('Erro ao atualizar eventos:', error);
      void ErrorHandler.handle(error);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
      isRefreshing.current = false;
    }
  }, [refreshEvents, toast]);

  const lastUpdateText = useMemo(() => {
    if (!lastRefresh) return undefined;

    try {
      const diff = Date.now() - lastRefresh.getTime();
      const minutes = Math.floor(diff / 60000);

      if (minutes < 1) return 'Atualizado agora mesmo';
      if (minutes === 1) return 'Atualizado há 1 minuto';
      if (minutes < 60) return `Atualizado há ${minutes} minutos`;

      const hours = Math.floor(minutes / 60);
      return hours === 1 ? 'Atualizado há 1 hora' : `Atualizado há ${hours} horas`;
    } catch {
      return undefined;
    }
  }, [lastRefresh]);

  const handleDateSelect = useCallback((dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
      } else {
        logger.error('Data inválida selecionada:', dateString);
      }
    } catch (error) {
      logger.error('Erro ao converter data:', error);
    }
  }, []);

  const handleEventPress = useCallback(
    (event: any) => {
      if (event && event.id) {
        router.push(`/(panel)/events/${event.id}`);
      }
    },
    [router]
  );

  const handleAddEvent = useCallback(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    router.push({
      pathname: '/(panel)/events/create',
      params: { date: dateString },
    });
  }, [router, selectedDate]);

  const preparedEvents = useMemo(() => {
    const list = Array.isArray(events) ? events : [];
    return list.map((event) => ({
      ...event,
      ...(event.startDate && typeof event.startDate === 'string'
        ? { date: event.startDate }
        : {}),
    }));
  }, [events]);

  const handleOpenCalendarPicker = useCallback(() => {
    setIsCalendarPickerVisible(true);
  }, [setIsCalendarPickerVisible]);

  const header = (
    <ScreenHeader
      title="Agenda"
      subtitle={lastUpdateText}
      rightActions={
        <>
          <Button
            label="Sincronizar"
            variant="secondary"
            size="sm"
            leftIcon={
              <CalendarIcon size={16} strokeWidth={1.75} color={theme.colors.ink} />
            }
            onPress={handleOpenCalendarPicker}
          />
          <Button
            label="Novo"
            variant="primary"
            size="sm"
            leftIcon={
              <Plus size={16} strokeWidth={1.75} color={theme.colors.onAccent} />
            }
            onPress={handleAddEvent}
          />
        </>
      }
    />
  );

  return (
    <Screen width="wide" padded={false} header={header}>
      <View style={styles.body}>
        {calendarLoading ? (
          <CalendarSkeleton />
        ) : (
          <Calendar
            events={preparedEvents}
            selectedDate={formattedDate}
            onDateSelect={handleDateSelect}
            onEventPress={handleEventPress}
            currentUserId={user?.uid || ''}
            loading={calendarLoading}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void handlePullToRefresh()}
                colors={[theme.colors.accent]}
                tintColor={theme.colors.accent}
              />
            }
          />
        )}
      </View>

      <CalendarPicker
        isVisible={isCalendarPickerVisible}
        onClose={() => setIsCalendarPickerVisible(false)}
        onSelect={(calendarId: string, calendarSource?: string) => {
          selectCalendar(calendarId, calendarSource);
          void syncConfirmedEvents();
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    minHeight: 0,
  },
});

export default React.memo(EventsScreen);
