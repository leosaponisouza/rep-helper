import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Calendar as RNCalendar, LocaleConfig } from 'react-native-calendars';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import {
  AppText,
  createCalendarTheme,
  Divider,
  StateView,
  StatusText,
  Surface,
  useMotion,
  useTheme,
} from '../../src/design-system';
import { formatLocalDate } from '../../src/utils/dateUtils';
import { logger } from '../../src/utils/logger';
import EventItem from './EventItem';

LocaleConfig.locales['pt-br'] = {
  monthNames: [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ],
  monthNamesShort: [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ],
  dayNames: [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: 'Hoje',
};
LocaleConfig.defaultLocale = 'pt-br';

interface CalendarProps {
  events: any[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onEventPress: (event: any) => void;
  currentUserId: string;
  loading?: boolean;
  refreshControl?: React.ReactElement;
}

interface EventsByDate {
  [date: string]: any[];
}

const WIDE_LAYOUT_BREAKPOINT = 900;

const Calendar: React.FC<CalendarProps> = ({
  events,
  selectedDate,
  onDateSelect,
  onEventPress,
  currentUserId,
  refreshControl,
}) => {
  const { theme } = useTheme();
  const motion = useMotion();
  const { width: windowWidth } = useWindowDimensions();
  const isWideLayout = windowWidth >= WIDE_LAYOUT_BREAKPOINT;

  const [selectedDay, setSelectedDay] = useState(
    selectedDate || format(new Date(), 'yyyy-MM-dd')
  );
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (selectedDate && selectedDate !== selectedDay) {
      setSelectedDay(selectedDate);
    }
  }, [selectedDate, selectedDay]);

  const calendarTheme = useMemo(() => createCalendarTheme(theme), [theme]);

  const eventsByDate = useMemo<EventsByDate>(() => {
    const grouped: EventsByDate = {};
    if (!Array.isArray(events)) {
      return grouped;
    }

    events.forEach((event) => {
      if (event && typeof event === 'object') {
        const eventDate = event.date || event.startDate;
        if (eventDate && typeof eventDate === 'string') {
          const dateStr = formatLocalDate(eventDate, 'yyyy-MM-dd') || eventDate.split('T')[0];
          if (!grouped[dateStr]) {
            grouped[dateStr] = [];
          }
          grouped[dateStr].push(event);
        }
      }
    });

    return grouped;
  }, [events]);

  const dayEvents = useMemo(() => {
    if (!selectedDay || typeof selectedDay !== 'string') {
      return [];
    }
    const dateStr = selectedDay.split('T')[0];
    return eventsByDate[dateStr] || [];
  }, [selectedDay, eventsByDate]);

  useEffect(() => {
    if (!motion.shouldAnimate) {
      slideAnim.setValue(0);
      opacityAnim.setValue(1);
      return;
    }

    slideAnim.setValue(12);
    opacityAnim.setValue(0);

    const anim = Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: motion.duration(theme.motion.duration.normal),
        easing: theme.motion.easing.standard,
        useNativeDriver: motion.useNativeDriver,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: motion.duration(theme.motion.duration.normal, {
          allowReducedFade: true,
        }),
        easing: theme.motion.easing.standard,
        useNativeDriver: motion.useNativeDriver,
      }),
    ]);

    anim.start();

    return () => {
      anim.stop();
    };
  }, [
    selectedDay,
    dayEvents.length,
    motion,
    slideAnim,
    opacityAnim,
    theme.motion.duration.normal,
    theme.motion.easing.standard,
  ]);

  const markedDates = useMemo(() => {
    const markers: Record<string, any> = {};

    Object.keys(eventsByDate).forEach((date) => {
      markers[date] = {
        marked: true,
        dotColor: theme.colors.accent,
      };
    });

    if (selectedDay && typeof selectedDay === 'string') {
      const selectedDateStr = selectedDay.split('T')[0];
      markers[selectedDateStr] = {
        ...markers[selectedDateStr],
        selected: true,
        selectedColor: theme.colors.accent,
        selectedTextColor: theme.colors.onAccent,
        selectedDotColor: theme.colors.onAccent,
      };
    }

    return markers;
  }, [eventsByDate, selectedDay, theme.colors.accent, theme.colors.onAccent]);

  const formattedSelectedDay = useMemo(() => {
    try {
      const parsed = parseISO(selectedDay);
      if (!isValid(parsed)) {
        return selectedDay;
      }
      return format(parsed, "dd 'de' MMMM", { locale: ptBR });
    } catch (error) {
      logger.error('Erro ao formatar dia selecionado:', error);
      return selectedDay;
    }
  }, [selectedDay]);

  const handleDateSelect = useCallback(
    (day: { dateString?: string }) => {
      if (day?.dateString) {
        setSelectedDay(day.dateString);
        onDateSelect(day.dateString);
      }
    },
    [onDateSelect]
  );

  const renderEventItem = useCallback(
    ({ item }: { item: any }) => {
      if (!item) return null;
      return (
        <EventItem
          event={item}
          onPress={() => onEventPress(item)}
          currentUserId={currentUserId}
        />
      );
    },
    [onEventPress, currentUserId]
  );

  const renderCalendarArrow = useCallback(
    (direction: 'left' | 'right') =>
      direction === 'left' ? (
        <ChevronLeft size={20} strokeWidth={1.75} color={theme.colors.accent} />
      ) : (
        <ChevronRight size={20} strokeWidth={1.75} color={theme.colors.accent} />
      ),
    [theme.colors.accent]
  );

  return (
    <View
      style={[
        styles.container,
        isWideLayout ? styles.containerWide : styles.containerStacked,
        {
          backgroundColor: theme.colors.bg,
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        },
      ]}
    >
      <View style={isWideLayout ? styles.calendarColumnWide : undefined}>
        <Surface tone="surface" bordered radiusKey="md" style={styles.calendarCard}>
          <RNCalendar
            key={theme.mode}
            current={selectedDay}
            onDayPress={handleDateSelect}
            markedDates={markedDates}
            enableSwipeMonths={true}
            renderArrow={renderCalendarArrow}
            theme={calendarTheme}
          />
        </Surface>
      </View>

      <Surface
        tone="surface"
        bordered
        radiusKey="md"
        style={styles.eventsSection}
      >
        <View
          style={[
            styles.eventsHeader,
            {
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
            },
          ]}
        >
          <AppText variant="heading" color="ink" numberOfLines={1}>
            {formattedSelectedDay}
          </AppText>
          <StatusText
            label={`${dayEvents.length} ${dayEvents.length === 1 ? 'evento' : 'eventos'}`}
            tone={dayEvents.length > 0 ? 'accent' : 'neutral'}
            showDot={dayEvents.length > 0}
          />
        </View>

        <Divider />

        <Animated.View
          style={[
            styles.eventsList,
            {
              transform: motion.shouldAnimate ? [{ translateY: slideAnim }] : undefined,
              opacity: opacityAnim,
            },
          ]}
        >
          <FlatList
            data={dayEvents}
            renderItem={renderEventItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[
              styles.eventsListContent,
              { padding: theme.spacing.md },
            ]}
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <StateView
                kind="empty"
                icon={
                  <CalendarIcon
                    size={32}
                    strokeWidth={1.75}
                    color={theme.colors.inkMuted}
                  />
                }
                title="Nenhum evento para este dia"
                description="Selecione outra data ou crie um novo evento."
              />
            }
          />
        </Animated.View>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  containerStacked: {
    flexDirection: 'column',
  },
  containerWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  calendarColumnWide: {
    width: 380,
    maxWidth: '45%',
  },
  calendarCard: {
    overflow: 'hidden',
  },
  eventsSection: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventsList: {
    flex: 1,
    minHeight: 0,
  },
  eventsListContent: {
    flexGrow: 1,
  },
});

export default Calendar;
