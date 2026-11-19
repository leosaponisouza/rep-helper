import React from 'react';
import { ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { Button, IconButton, useTheme } from '../src/design-system';
import { useCalendarSync } from '../src/hooks/useCalendarSync';
import { Event } from '../src/services/events';
import { CalendarPicker } from './CalendarPicker';

interface SyncCalendarButtonProps {
  type: 'all' | 'confirmed';
  style?: StyleProp<ViewStyle>;
  buttonStyle?: 'primary' | 'secondary';
  compact?: boolean;
  singleEvent?: Event;
  iconOnly?: boolean;
}

export const SyncCalendarButton: React.FC<SyncCalendarButtonProps> = ({
  type,
  style,
  buttonStyle = 'primary',
  compact = false,
  singleEvent,
  iconOnly = false,
}) => {
  const { theme } = useTheme();
  const {
    syncConfirmedEvents,
    syncAllEvents,
    syncEventWithCalendar,
    isLoading,
    isCalendarPickerVisible,
    setIsCalendarPickerVisible,
    selectCalendar,
  } = useCalendarSync();

  const handleSync = () => {
    setIsCalendarPickerVisible(true);
  };

  const handleCalendarSelect = (calendarId: string, calendarSource?: string) => {
    selectCalendar(calendarId, calendarSource);

    if (singleEvent) {
      void syncEventWithCalendar(singleEvent);
    } else if (type === 'all') {
      void syncAllEvents();
    } else {
      void syncConfirmedEvents();
    }
  };

  return (
    <>
      {iconOnly ? (
        <IconButton
          icon={
            isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Calendar size={20} strokeWidth={1.75} color={theme.colors.accent} />
            )
          }
          onPress={handleSync}
          disabled={isLoading}
          accessibilityLabel="Sincronizar com calendário"
          variant="ghost"
          style={style}
        />
      ) : (
        <Button
          label="Sincronizar"
          variant={buttonStyle === 'secondary' ? 'secondary' : 'primary'}
          size={compact ? 'sm' : 'md'}
          loading={isLoading}
          fullWidth={!compact}
          leftIcon={
            <Calendar
              size={18}
              strokeWidth={1.75}
              color={
                buttonStyle === 'secondary'
                  ? theme.colors.ink
                  : theme.colors.onAccent
              }
            />
          }
          onPress={handleSync}
          style={style}
        />
      )}

      <CalendarPicker
        isVisible={isCalendarPickerVisible}
        onClose={() => setIsCalendarPickerVisible(false)}
        onSelect={handleCalendarSelect}
      />
    </>
  );
};
