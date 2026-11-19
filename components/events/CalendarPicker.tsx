import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Calendar from 'expo-calendar';
import { Calendar as CalendarIcon, ChevronRight } from 'lucide-react-native';
import {
  AppText,
  BottomSheetModal,
  GoogleIcon,
  ListRow,
  StateView,
  Surface,
  useTheme,
} from '../../src/design-system';
import { CalendarService } from '../../src/services/calendar/calendarService';
import { logger } from '../../src/utils/logger';

interface CalendarPickerProps {
  onSelect: (calendarId: string, calendarSource?: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  onSelect,
  isVisible,
  onClose,
}) => {
  const { theme } = useTheme();
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadCalendars = async () => {
      if (Platform.OS === 'web') {
        if (isMounted) {
          setCalendars([]);
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setLoading(true);
        const availableCalendars = await CalendarService.listAvailableCalendars();
        const writableCalendars = availableCalendars.filter(
          (cal) => cal.allowsModifications
        );

        const sortedCalendars = writableCalendars.sort((a, b) => {
          const aSource = a.source?.name ?? '';
          const bSource = b.source?.name ?? '';

          if (aSource.includes('Samsung') && !bSource.includes('Samsung')) return -1;
          if (!aSource.includes('Samsung') && bSource.includes('Samsung')) return 1;
          if (aSource === 'Google' && bSource !== 'Google') return -1;
          if (aSource !== 'Google' && bSource === 'Google') return 1;
          return (a.title || '').localeCompare(b.title || '', 'pt-BR');
        });

        if (isMounted) {
          setCalendars(sortedCalendars);
        }
      } catch (error) {
        logger.error('Erro ao carregar calendários:', error);
        if (isMounted) {
          setCalendars([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (isVisible) {
      void loadCalendars();
    }

    return () => {
      isMounted = false;
    };
  }, [isVisible]);

  const renderCalendarIcon = (calendar: Calendar.Calendar) => {
    const sourceName = calendar.source?.name ?? '';
    if (sourceName === 'Google' || sourceName.includes('Google')) {
      return <GoogleIcon size={22} />;
    }
    return (
      <CalendarIcon
        size={22}
        strokeWidth={1.75}
        color={theme.colors.accent}
      />
    );
  };

  const formatCalendarInfo = (calendar: Calendar.Calendar): string => {
    const rawSource = calendar.source?.name ?? '';
    let sourceName = rawSource;
    const calendarName = calendar.name || calendar.title || '';

    if (rawSource.includes('Samsung')) {
      sourceName = 'Samsung Calendar';
    } else if (rawSource === 'Google' || rawSource.includes('Google')) {
      sourceName = 'Google Calendar';
    }

    const baseInfo =
      !sourceName || calendarName === sourceName
        ? calendarName || sourceName || 'Calendário'
        : `${calendarName} (${sourceName})`;

    const flags: string[] = [];
    if ((calendar as any).isLocalAccount) flags.push('Local');
    if ((calendar as any).isMainCalendar) flags.push('Principal');

    return flags.length > 0 ? `${baseInfo} • ${flags.join(' • ')}` : baseInfo;
  };

  return (
    <BottomSheetModal
      visible={isVisible}
      onClose={onClose}
      title="Selecionar Calendário"
    >
      {Platform.OS === 'web' ? (
        <StateView
          kind="empty"
          icon={<CalendarIcon size={32} strokeWidth={1.75} color={theme.colors.inkMuted} />}
          title="Calendário disponível no app mobile"
          description="A sincronização com o calendário do dispositivo está disponível apenas nos aplicativos Android e iOS."
        />
      ) : loading ? (
        <StateView kind="loading" title="Carregando calendários..." />
      ) : calendars.length === 0 ? (
        <StateView
          kind="empty"
          icon={<CalendarIcon size={32} strokeWidth={1.75} color={theme.colors.inkMuted} />}
          title="Nenhum calendário disponível"
          description="Verifique se você concedeu permissão e se tem o Samsung Calendar ou Google Calendar configurado."
        />
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="caption" color="inkSecondary">
            Escolha um calendário para adicionar seus eventos
          </AppText>

          <Surface tone="surface" bordered radiusKey="md" style={styles.listSurface}>
            {calendars.map((item, index) => (
              <ListRow
                key={item.id}
                title={item.title || item.name || 'Calendário'}
                subtitle={formatCalendarInfo(item)}
                showDivider={index < calendars.length - 1}
                onPress={() => {
                  onSelect(item.id, item.source?.name);
                  onClose();
                }}
                leading={
                  <View style={styles.calendarIconContainer}>
                    {renderCalendarIcon(item)}
                    <View
                      pointerEvents="none"
                      style={[
                        styles.calendarColorDot,
                        {
                          backgroundColor: item.color || theme.colors.accent,
                          borderColor: theme.colors.surface,
                          borderRadius: theme.radius.full,
                        },
                      ]}
                    />
                  </View>
                }
                trailing={
                  <ChevronRight
                    size={18}
                    strokeWidth={1.75}
                    color={theme.colors.inkMuted}
                  />
                }
              />
            ))}
          </Surface>
        </View>
      )}
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  listSurface: {
    overflow: 'hidden',
  },
  calendarIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calendarColorDot: {
    width: 10,
    height: 10,
    borderWidth: 1.5,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});
