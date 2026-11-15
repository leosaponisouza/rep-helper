// components/Task/TaskEdit/DateTimePickerSection.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Control, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import {
  formatShortDate,
  formatTime,
  mergeDateAndTime,
} from '../../../src/utils/dateUtils';

interface DateTimePickerSectionProps {
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
  const isRecurring = watch('recurring');
  const dueDate = watch('dueDate') as Date | undefined;

  const handleDatePickerChange = (_event: unknown, selectedDate?: Date) => {
    setDatePickerVisibility(Platform.OS === 'ios');

    if (selectedDate) {
      const currentDate = dueDate || new Date();
      const mergedDate = mergeDateAndTime(currentDate, selectedDate, datePickerMode);
      setValue('dueDate', mergedDate);

      if (datePickerMode === 'date' && Platform.OS === 'ios') {
        setDatePickerMode('time');
        setDatePickerVisibility(true);
      }
    }
  };

  const showDatePicker = () => {
    setDatePickerMode('date');
    setDatePickerVisibility(true);
  };

  const showTimePicker = () => {
    setDatePickerMode('time');
    setDatePickerVisibility(true);
  };

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {isRecurring ? 'Prazo da primeira ocorrência' : 'Data e Hora (opcional)'}
      </Text>
      {isRecurring && (
        <Text style={styles.helperText}>
          Defina a data e hora da primeira ocorrência desta tarefa recorrente
        </Text>
      )}
      <View style={styles.dateTimeContainer}>
        <TouchableOpacity style={styles.dateButton} onPress={showDatePicker}>
          <View style={styles.dateButtonContent}>
            <Ionicons name="calendar" size={20} color="#7B68EE" />
            <Text style={styles.dateTimeText}>
              {dueDate ? formatShortDate(dueDate) : 'Selecionar data'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.timeButton} onPress={showTimePicker}>
          <View style={styles.dateButtonContent}>
            <Ionicons name="time" size={20} color="#7B68EE" />
            <Text style={styles.dateTimeText}>
              {dueDate ? formatTime(dueDate) : 'Hora'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {errors?.dueDate?.message && (
        <Text style={styles.errorText}>{String(errors.dueDate.message)}</Text>
      )}

      {isDatePickerVisible && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode={datePickerMode}
          display="default"
          onChange={handleDatePickerChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginTop: 20,
  },
  inputLabel: {
    color: '#fff',
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '500',
  },
  helperText: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 0.65,
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 8,
  },
  timeButton: {
    flex: 0.35,
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: {
    color: '#FF6347',
    fontSize: 12,
    marginTop: 6,
  },
});

export default DateTimePickerSection;
