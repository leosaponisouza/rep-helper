// components/Task/TaskEdit/DateTimePickerSection.tsx
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { isValid, parse, startOfDay } from 'date-fns';
import { Calendar, Clock, X } from 'lucide-react-native';
import { Control, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import {
  AppText,
  Button,
  IconButton,
  Surface,
  TextField,
  useTheme,
} from '../../../src/design-system';
import {
  formatShortDate,
  formatTime,
  mergeDateAndTime,
} from '../../../src/utils/dateUtils';

export interface DateTimePickerFieldsProps {
  label: string;
  helperText?: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  isVisible: boolean;
  onVisibleChange: (visible: boolean) => void;
  mode: 'date' | 'time';
  onModeChange: (mode: 'date' | 'time') => void;
  minimumDate?: Date;
  error?: string;
  clearable?: boolean;
}

/**
 * Reusable editorial date & time selector supporting native DateTimePicker on iOS/Android
 * and inline validated text entry on Expo Web.
 */
export const DateTimePickerFields: React.FC<DateTimePickerFieldsProps> = ({
  label,
  helperText,
  value,
  onChange,
  isVisible,
  onVisibleChange,
  mode,
  onModeChange,
  minimumDate,
  error,
  clearable = true,
}) => {
  const { theme } = useTheme();
  const [webInput, setWebInput] = useState('');
  const [webError, setWebError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isVisible || Platform.OS !== 'web') {
      return;
    }
    setWebError(undefined);
    if (mode === 'date') {
      setWebInput(value ? formatShortDate(value) : '');
    } else {
      setWebInput(value ? formatTime(value) : '');
    }
  }, [isVisible, mode, value]);

  const handleNativeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event?.type === 'dismissed') {
      onVisibleChange(false);
      return;
    }

    onVisibleChange(Platform.OS === 'ios');

    if (selectedDate) {
      const currentDate = value || new Date();
      const mergedDate = mergeDateAndTime(currentDate, selectedDate, mode);
      onChange(mergedDate);

      if (mode === 'date' && Platform.OS === 'ios') {
        onModeChange('time');
        onVisibleChange(true);
      }
    }
  };

  const handleApplyWebInput = () => {
    const trimmed = webInput.trim();
    if (!trimmed) {
      setWebError(
        mode === 'date'
          ? 'Informe a data no formato DD/MM/AAAA.'
          : 'Informe a hora no formato HH:MM.'
      );
      return;
    }

    const baseDate = value || new Date();
    if (mode === 'date') {
      const parsed = parse(trimmed, 'dd/MM/yyyy', new Date());
      if (!isValid(parsed) || formatShortDate(parsed) !== trimmed) {
        setWebError('Data inválida. Use o formato DD/MM/AAAA.');
        return;
      }
      if (minimumDate && startOfDay(parsed) < startOfDay(minimumDate)) {
        setWebError('A data não pode ser anterior a hoje.');
        return;
      }
      onChange(mergeDateAndTime(baseDate, parsed, 'date'));
      setWebError(undefined);
      onVisibleChange(false);
      return;
    }

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) {
      setWebError('Hora inválida. Use o formato HH:MM (ex.: 14:30).');
      return;
    }
    const parsedTime = parse(trimmed, 'HH:mm', new Date());
    if (!isValid(parsedTime)) {
      setWebError('Hora inválida. Use o formato HH:MM.');
      return;
    }
    onChange(mergeDateAndTime(baseDate, parsedTime, 'time'));
    setWebError(undefined);
    onVisibleChange(false);
  };

  const openPicker = (targetMode: 'date' | 'time') => {
    if (Platform.OS === 'web' && isVisible && mode === targetMode) {
      onVisibleChange(false);
      return;
    }
    onModeChange(targetMode);
    onVisibleChange(true);
  };

  const borderColor = error ? theme.colors.danger : theme.colors.borderStrong;

  return (
    <View style={{ gap: theme.spacing.xxs }}>
      <AppText variant="bodyStrong" color="ink">
        {label}
      </AppText>

      {helperText ? (
        <AppText variant="caption" color="inkSecondary">
          {helperText}
        </AppText>
      ) : null}

      <View style={[styles.buttonsRow, { gap: theme.spacing.xs }]}>
        <Pressable
          onPress={() => openPicker('date')}
          accessibilityRole="button"
          accessibilityLabel={
            value ? `Alterar data: ${formatShortDate(value)}` : 'Selecionar data'
          }
          style={({ pressed }) => [
            styles.pickerButton,
            styles.dateButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor,
              borderRadius: theme.radius.sm,
              paddingHorizontal: theme.spacing.sm,
              gap: theme.spacing.xs,
              opacity: pressed ? theme.motion.pressOpacity : 1,
            },
          ]}
        >
          <Calendar size={18} strokeWidth={1.75} color={theme.colors.accent} />
          <AppText
            variant="body"
            color={value ? 'ink' : 'inkMuted'}
            numberOfLines={1}
          >
            {value ? formatShortDate(value) : 'Selecionar data'}
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => openPicker('time')}
          accessibilityRole="button"
          accessibilityLabel={
            value ? `Alterar hora: ${formatTime(value)}` : 'Selecionar hora'
          }
          style={({ pressed }) => [
            styles.pickerButton,
            styles.timeButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor,
              borderRadius: theme.radius.sm,
              paddingHorizontal: theme.spacing.sm,
              gap: theme.spacing.xs,
              opacity: pressed ? theme.motion.pressOpacity : 1,
            },
          ]}
        >
          <Clock size={18} strokeWidth={1.75} color={theme.colors.accent} />
          <AppText
            variant="body"
            color={value ? 'ink' : 'inkMuted'}
            numberOfLines={1}
          >
            {value ? formatTime(value) : 'Hora'}
          </AppText>
        </Pressable>

        {clearable && value ? (
          <IconButton
            icon={<X size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />}
            onPress={() => {
              onVisibleChange(false);
              onChange(undefined);
            }}
            accessibilityLabel="Limpar data e hora"
            variant="ghost"
          />
        ) : null}
      </View>

      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}

      {isVisible && Platform.OS === 'web' ? (
        <Surface
          tone="subtle"
          bordered
          padded="sm"
          radiusKey="sm"
          style={{ gap: theme.spacing.xs, marginTop: theme.spacing.xxs }}
        >
          <TextField
            label={mode === 'date' ? 'Data (DD/MM/AAAA)' : 'Hora (HH:MM)'}
            value={webInput}
            onChangeText={(text) => {
              setWebInput(text);
              if (webError) setWebError(undefined);
            }}
            placeholder={mode === 'date' ? 'DD/MM/AAAA' : 'HH:MM'}
            error={webError}
            returnKeyType="done"
            onSubmitEditing={handleApplyWebInput}
          />
          <View style={[styles.webActionsRow, { gap: theme.spacing.xs }]}>
            <Button
              label="Cancelar"
              variant="ghost"
              size="sm"
              onPress={() => onVisibleChange(false)}
            />
            <Button
              label="Aplicar"
              variant="secondary"
              size="sm"
              onPress={handleApplyWebInput}
            />
          </View>
        </Surface>
      ) : null}

      {isVisible && Platform.OS !== 'web' ? (
        <View style={{ gap: theme.spacing.xs }}>
          <DateTimePicker
            value={value || new Date()}
            mode={mode}
            display="default"
            themeVariant={theme.isDark ? 'dark' : 'light'}
            accentColor={theme.colors.accent}
            onChange={handleNativeChange}
            minimumDate={minimumDate}
          />
          {Platform.OS === 'ios' ? (
            <Button
              label="Concluir seleção"
              variant="ghost"
              size="sm"
              onPress={() => onVisibleChange(false)}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

export interface DateTimePickerSectionProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  isDatePickerVisible: boolean;
  setDatePickerVisibility: (visible: boolean) => void;
  datePickerMode: 'date' | 'time';
  setDatePickerMode: (mode: 'date' | 'time') => void;
  errors?: FieldErrors<any>;
}

const DateTimePickerSection: React.FC<DateTimePickerSectionProps> = ({
  setValue,
  watch,
  isDatePickerVisible,
  setDatePickerVisibility,
  datePickerMode,
  setDatePickerMode,
  errors,
}) => {
  const isRecurring = Boolean(watch('recurring'));
  const dueDate = watch('dueDate') as Date | undefined;

  return (
    <DateTimePickerFields
      label={isRecurring ? 'Prazo da primeira ocorrência' : 'Data e Hora (opcional)'}
      helperText={
        isRecurring
          ? 'Defina a data e hora da primeira ocorrência desta tarefa recorrente'
          : undefined
      }
      value={dueDate}
      onChange={(nextDate) => setValue('dueDate', nextDate)}
      isVisible={isDatePickerVisible}
      onVisibleChange={setDatePickerVisibility}
      mode={datePickerMode}
      onModeChange={setDatePickerMode}
      minimumDate={new Date()}
      error={errors?.dueDate?.message ? String(errors.dueDate.message) : undefined}
    />
  );
};

const styles = StyleSheet.create({
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
  },
  dateButton: {
    flex: 2,
  },
  timeButton: {
    flex: 1,
  },
  webActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

export default DateTimePickerSection;
