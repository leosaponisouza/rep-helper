// components/Task/TaskEdit/RecurrenceSection.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Control, Controller, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { RecurrenceType } from '../../../src/models/task.model';
import {
  RECURRENCE_TYPES,
  getRecurrencePatternLabel,
  getRecurrenceDescriptionText,
} from '../../../src/validation/taskSchemas';
import {
  formatShortDate,
  formatTime,
  mergeDateAndTime,
} from '../../../src/utils/dateUtils';

interface RecurrenceSectionProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
}

const RecurrenceSection: React.FC<RecurrenceSectionProps> = ({
  control,
  setValue,
  watch,
}) => {
  const [isRecurrenceModalVisible, setRecurrenceModalVisible] = useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);
  const [endDatePickerMode, setEndDatePickerMode] = useState<'date' | 'time'>('date');

  const isRecurring = watch('recurring');
  const recurrenceType = watch('recurrenceType') || 'WEEKLY';
  const recurrenceInterval = watch('recurrenceInterval') || 1;
  const recurrenceEndDate = watch('recurrenceEndDate') as Date | undefined;

  const handleEndDatePickerChange = (_event: unknown, selectedDate?: Date) => {
    setEndDatePickerVisibility(Platform.OS === 'ios');

    if (selectedDate) {
      const currentDate = recurrenceEndDate || new Date();
      const merged = mergeDateAndTime(currentDate, selectedDate, endDatePickerMode);
      setValue('recurrenceEndDate', merged);

      if (endDatePickerMode === 'date' && Platform.OS === 'ios') {
        setEndDatePickerMode('time');
        setEndDatePickerVisibility(true);
      }
    }
  };

  const showEndDatePicker = () => {
    setEndDatePickerMode('date');
    setEndDatePickerVisibility(true);
  };

  const showEndTimePicker = () => {
    setEndDatePickerMode('time');
    setEndDatePickerVisibility(true);
  };

  return (
    <View>
      <Controller
        control={control}
        name="recurring"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputContainer}>
            <View style={styles.recurrenceToggleContainer}>
              <View style={styles.toggleTextWrapper}>
                <Text style={styles.inputLabel}>Tarefa Recorrente</Text>
                <Text style={styles.recurrenceDescription}>
                  Ative para criar uma tarefa que se repete automaticamente quando concluída
                </Text>
              </View>
              <Switch
                value={Boolean(value)}
                onValueChange={onChange}
                trackColor={{ false: '#444', true: 'rgba(76, 175, 80, 0.4)' }}
                thumbColor={value ? '#4CAF50' : '#aaa'}
              />
            </View>

            {value && (
              <>
                <TouchableOpacity
                  style={styles.recurrenceConfigButton}
                  onPress={() => setRecurrenceModalVisible(true)}
                >
                  <View style={styles.recurrenceConfigContent}>
                    <View>
                      <Text style={styles.recurrenceConfigLabel}>Configurar Recorrência</Text>
                      <Text style={styles.recurrenceConfigValue}>
                        {getRecurrencePatternLabel(value, recurrenceType, recurrenceInterval)}
                      </Text>
                      {recurrenceEndDate && (
                        <Text style={styles.recurrenceEndDateText}>
                          Término em: {formatShortDate(recurrenceEndDate)}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="repeat" size={24} color="#4CAF50" />
                  </View>
                </TouchableOpacity>

                <View style={styles.recurrenceExplanationContainer}>
                  <Ionicons name="information-circle" size={18} color="#aaa" />
                  <Text style={styles.recurrenceExplanationText}>
                    {getRecurrenceDescriptionText(
                      value,
                      recurrenceType,
                      recurrenceInterval,
                      recurrenceEndDate
                    )}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={isRecurrenceModalVisible}
        onRequestClose={() => setRecurrenceModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configurar Recorrência</Text>
              <Text style={styles.modalSubtitle}>
                Defina como esta tarefa deve se repetir após ser concluída
              </Text>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.sectionBlock}>
                <Text style={styles.recurrenceLabel}>Tipo de Recorrência</Text>
                <Text style={styles.recurrenceDescription}>
                  Selecione com que frequência a tarefa deve se repetir
                </Text>
                <View style={styles.recurrenceTypeGrid}>
                  {RECURRENCE_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.recurrenceTypeChip,
                        recurrenceType === type.key && styles.selectedRecurrenceTypeChip,
                      ]}
                      onPress={() => setValue('recurrenceType', type.key as RecurrenceType)}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={18}
                        color={recurrenceType === type.key ? '#fff' : '#aaa'}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.recurrenceTypeText,
                          recurrenceType === type.key && styles.selectedRecurrenceTypeText,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.recurrenceLabel}>Intervalo</Text>
                <Text style={styles.recurrenceDescription}>
                  Defina com que frequência a tarefa deve se repetir
                </Text>

                <View style={styles.recurrenceIntervalRow}>
                  <TouchableOpacity
                    style={[
                      styles.intervalButton,
                      recurrenceInterval <= 1 && styles.intervalButtonDisabled,
                    ]}
                    onPress={() =>
                      setValue('recurrenceInterval', Math.max(1, recurrenceInterval - 1))
                    }
                    disabled={recurrenceInterval <= 1}
                  >
                    <Ionicons name="remove" size={20} color="#fff" />
                  </TouchableOpacity>

                  <View style={styles.intervalValueContainer}>
                    <Text style={styles.intervalValue}>{recurrenceInterval}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.intervalButton}
                    onPress={() => setValue('recurrenceInterval', recurrenceInterval + 1)}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>

                  <Text style={styles.intervalText}>
                    {recurrenceType === 'DAILY'
                      ? 'dia(s)'
                      : recurrenceType === 'WEEKLY'
                      ? 'semana(s)'
                      : recurrenceType === 'MONTHLY'
                      ? 'mês(es)'
                      : 'ano(s)'}
                  </Text>
                </View>

                <Text style={styles.recurrenceHelperText}>
                  {getRecurrenceDescriptionText(true, recurrenceType, recurrenceInterval)}
                </Text>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.recurrenceLabel}>Data de Término (opcional)</Text>
                <Text style={styles.recurrenceDescription}>
                  Opcionalmente, defina quando a recorrência deve parar
                </Text>

                <View style={styles.dateTimeContainer}>
                  <TouchableOpacity style={styles.dateButton} onPress={showEndDatePicker}>
                    <View style={styles.dateButtonContent}>
                      <Ionicons name="calendar" size={20} color="#7B68EE" />
                      <Text style={styles.dateTimeText}>
                        {recurrenceEndDate ? formatShortDate(recurrenceEndDate) : 'Selecionar data'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.timeButton} onPress={showEndTimePicker}>
                    <View style={styles.dateButtonContent}>
                      <Ionicons name="time" size={20} color="#7B68EE" />
                      <Text style={styles.dateTimeText}>
                        {recurrenceEndDate ? formatTime(recurrenceEndDate) : 'Hora'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {recurrenceEndDate ? (
                  <View>
                    <Text style={styles.recurrenceHelperText}>
                      A recorrência será interrompida após esta data
                    </Text>
                    <TouchableOpacity
                      style={styles.clearEndDateButton}
                      onPress={() => setValue('recurrenceEndDate', undefined)}
                    >
                      <Text style={styles.clearEndDateText}>Remover data de término</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.recurrenceHelperText}>
                    Sem data de término definida, a tarefa continuará se repetindo indefinidamente
                  </Text>
                )}
              </View>

              <View style={styles.recurrenceInfoContainer}>
                <Ionicons name="information-circle" size={20} color="#7B68EE" />
                <Text style={styles.recurrenceInfoText}>
                  Quando você concluir uma tarefa recorrente, uma nova instância será
                  automaticamente criada com a próxima data de vencimento.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setRecurrenceModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isEndDatePickerVisible && (
        <DateTimePicker
          value={recurrenceEndDate || new Date()}
          mode={endDatePickerMode}
          display="default"
          onChange={handleEndDatePickerChange}
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
    marginBottom: 4,
    fontSize: 15,
    fontWeight: '500',
  },
  toggleTextWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  recurrenceToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  recurrenceDescription: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 8,
  },
  recurrenceConfigButton: {
    marginTop: 12,
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  recurrenceConfigContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recurrenceConfigLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  recurrenceConfigValue: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  recurrenceEndDateText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
  recurrenceExplanationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  recurrenceExplanationText: {
    color: '#aaa',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#333',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  modalSubtitle: {
    color: '#aaa',
    fontSize: 14,
  },
  modalScrollView: {
    maxHeight: 450,
    padding: 16,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  recurrenceLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  recurrenceTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  recurrenceTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedRecurrenceTypeChip: {
    backgroundColor: '#7B68EE',
  },
  recurrenceTypeText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedRecurrenceTypeText: {
    fontWeight: 'bold',
  },
  recurrenceIntervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  intervalButton: {
    backgroundColor: '#7B68EE',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intervalButtonDisabled: {
    backgroundColor: '#555',
  },
  intervalValueContainer: {
    paddingHorizontal: 16,
  },
  intervalValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  intervalText: {
    color: '#fff',
    fontSize: 15,
    marginLeft: 12,
  },
  recurrenceHelperText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dateButton: {
    flex: 0.65,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 8,
  },
  timeButton: {
    flex: 0.35,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#444',
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  clearEndDateButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearEndDateText: {
    color: '#FF6347',
    fontSize: 13,
    fontWeight: '500',
  },
  recurrenceInfoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(123, 104, 238, 0.1)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  recurrenceInfoText: {
    color: '#ccc',
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },
  modalCloseButton: {
    margin: 16,
    backgroundColor: '#7B68EE',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RecurrenceSection;
