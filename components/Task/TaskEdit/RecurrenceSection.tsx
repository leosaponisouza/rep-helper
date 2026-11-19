// components/Task/TaskEdit/RecurrenceSection.tsx
import React, { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import {
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Info,
  Minus,
  Plus,
  Repeat,
  type LucideIcon,
} from 'lucide-react-native';
import { Control, Controller, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import {
  AppText,
  BottomSheetModal,
  Button,
  Chip,
  Divider,
  IconButton,
  ListRow,
  Surface,
  useTheme,
} from '../../../src/design-system';
import { RecurrenceType } from '../../../src/models/task.model';
import { formatShortDate } from '../../../src/utils/dateUtils';
import {
  RECURRENCE_TYPES,
  getRecurrenceDescriptionText,
  getRecurrencePatternLabel,
} from '../../../src/validation/taskSchemas';
import { DateTimePickerFields } from './DateTimePickerSection';

export interface RecurrenceSectionProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
}

const RECURRENCE_ICON_MAP: Record<RecurrenceType, LucideIcon> = {
  DAILY: Calendar,
  WEEKLY: CalendarDays,
  MONTHLY: CalendarRange,
  YEARLY: CalendarClock,
};

function getIntervalUnitLabel(recurrenceType: string): string {
  switch (recurrenceType) {
    case 'DAILY':
      return 'dia(s)';
    case 'WEEKLY':
      return 'semana(s)';
    case 'MONTHLY':
      return 'mês(es)';
    default:
      return 'ano(s)';
  }
}

const RecurrenceSection: React.FC<RecurrenceSectionProps> = ({
  control,
  setValue,
  watch,
}) => {
  const { theme } = useTheme();
  const [isRecurrenceModalVisible, setRecurrenceModalVisible] = useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);
  const [endDatePickerMode, setEndDatePickerMode] = useState<'date' | 'time'>('date');

  const recurrenceType = (watch('recurrenceType') as RecurrenceType) || 'WEEKLY';
  const recurrenceInterval = Number(watch('recurrenceInterval') || 1);
  const recurrenceEndDate = watch('recurrenceEndDate') as Date | undefined;

  return (
    <View>
      <Controller
        control={control}
        name="recurring"
        render={({ field: { onChange, value } }) => (
          <View style={{ gap: theme.spacing.sm }}>
            <Surface tone="surface" bordered padded="md" radiusKey="md">
              <View style={[styles.toggleRow, { gap: theme.spacing.sm }]}>
                <View style={styles.toggleTextWrapper}>
                  <AppText variant="bodyStrong" color="ink">
                    Tarefa Recorrente
                  </AppText>
                  <AppText variant="caption" color="inkSecondary">
                    Ative para criar uma tarefa que se repete automaticamente quando concluída
                  </AppText>
                </View>

                <Switch
                  value={Boolean(value)}
                  onValueChange={onChange}
                  accessibilityLabel="Tarefa recorrente"
                  trackColor={{
                    false: theme.colors.borderStrong,
                    true: theme.colors.accentSoft,
                  }}
                  thumbColor={value ? theme.colors.accent : theme.colors.surface}
                  ios_backgroundColor={theme.colors.subtle}
                />
              </View>
            </Surface>

            {value ? (
              <>
                <Surface tone="surface" bordered style={styles.configSurface}>
                  <ListRow
                    title={getRecurrencePatternLabel(
                      value,
                      recurrenceType,
                      recurrenceInterval
                    )}
                    subtitle={
                      recurrenceEndDate
                        ? `Configurar recorrência · Término em ${formatShortDate(recurrenceEndDate)}`
                        : 'Configurar recorrência'
                    }
                    onPress={() => setRecurrenceModalVisible(true)}
                    trailing={
                      <Repeat size={20} strokeWidth={1.75} color={theme.colors.success} />
                    }
                  />
                </Surface>

                <Surface
                  tone="subtle"
                  padded="sm"
                  radiusKey="sm"
                  style={[styles.infoBox, { gap: theme.spacing.xs }]}
                >
                  <Info size={16} strokeWidth={1.75} color={theme.colors.inkSecondary} />
                  <AppText variant="caption" color="inkSecondary" style={styles.infoText}>
                    {getRecurrenceDescriptionText(
                      value,
                      recurrenceType,
                      recurrenceInterval,
                      recurrenceEndDate
                    )}
                  </AppText>
                </Surface>
              </>
            ) : null}
          </View>
        )}
      />

      <BottomSheetModal
        visible={isRecurrenceModalVisible}
        onClose={() => {
          setEndDatePickerVisibility(false);
          setRecurrenceModalVisible(false);
        }}
        title="Configurar Recorrência"
        footer={
          <Button
            label="Concluir"
            variant="primary"
            fullWidth
            onPress={() => {
              setEndDatePickerVisibility(false);
              setRecurrenceModalVisible(false);
            }}
          />
        }
      >
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="bodyStrong" color="ink">
              Tipo de Recorrência
            </AppText>
            <AppText variant="caption" color="inkSecondary">
              Selecione com que frequência a tarefa deve se repetir
            </AppText>
            <View style={[styles.typeGrid, { gap: theme.spacing.xs }]}>
              {RECURRENCE_TYPES.map((type) => {
                const TypeIcon = RECURRENCE_ICON_MAP[type.key];
                const isSelected = recurrenceType === type.key;
                return (
                  <Chip
                    key={type.key}
                    label={type.label}
                    selected={isSelected}
                    leftIcon={
                      <TypeIcon
                        size={16}
                        strokeWidth={1.75}
                        color={
                          isSelected ? theme.colors.accent : theme.colors.inkSecondary
                        }
                      />
                    }
                    onPress={() => setValue('recurrenceType', type.key)}
                  />
                );
              })}
            </View>
          </View>

          <Divider />

          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="bodyStrong" color="ink">
              Intervalo
            </AppText>
            <AppText variant="caption" color="inkSecondary">
              Defina de quanto em quanto tempo a tarefa se repete
            </AppText>

            <View style={[styles.intervalRow, { gap: theme.spacing.sm }]}>
              <IconButton
                icon={<Minus size={18} strokeWidth={1.75} color={theme.colors.ink} />}
                onPress={() =>
                  setValue('recurrenceInterval', Math.max(1, recurrenceInterval - 1))
                }
                disabled={recurrenceInterval <= 1}
                accessibilityLabel="Diminuir intervalo"
                variant="subtle"
              />

              <AppText variant="monoValue" color="ink" style={styles.intervalValue}>
                {recurrenceInterval}
              </AppText>

              <IconButton
                icon={<Plus size={18} strokeWidth={1.75} color={theme.colors.ink} />}
                onPress={() => setValue('recurrenceInterval', recurrenceInterval + 1)}
                accessibilityLabel="Aumentar intervalo"
                variant="subtle"
              />

              <AppText variant="body" color="inkSecondary">
                {getIntervalUnitLabel(recurrenceType)}
              </AppText>
            </View>

            <AppText variant="caption" color="inkMuted">
              {getRecurrenceDescriptionText(true, recurrenceType, recurrenceInterval)}
            </AppText>
          </View>

          <Divider />

          <View style={{ gap: theme.spacing.xs }}>
            <DateTimePickerFields
              label="Data de Término (opcional)"
              helperText="Opcionalmente, defina quando a recorrência deve parar"
              value={recurrenceEndDate}
              onChange={(nextDate) => setValue('recurrenceEndDate', nextDate)}
              isVisible={isEndDatePickerVisible}
              onVisibleChange={setEndDatePickerVisibility}
              mode={endDatePickerMode}
              onModeChange={setEndDatePickerMode}
              minimumDate={new Date()}
            />

            {recurrenceEndDate ? (
              <AppText variant="caption" color="inkSecondary">
                A recorrência será interrompida após esta data
              </AppText>
            ) : (
              <AppText variant="caption" color="inkMuted">
                Sem data de término definida, a tarefa continuará se repetindo indefinidamente
              </AppText>
            )}
          </View>

          <Surface
            tone="subtle"
            padded="sm"
            radiusKey="sm"
            style={[styles.infoBox, { gap: theme.spacing.xs }]}
          >
            <Info size={16} strokeWidth={1.75} color={theme.colors.accent} />
            <AppText variant="caption" color="inkSecondary" style={styles.infoText}>
              Quando você concluir uma tarefa recorrente, uma nova instância será
              automaticamente criada com a próxima data de vencimento.
            </AppText>
          </Surface>
        </View>
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextWrapper: {
    flex: 1,
    gap: 2,
  },
  configSurface: {
    overflow: 'hidden',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intervalValue: {
    minWidth: 28,
    textAlign: 'center',
  },
});

export default RecurrenceSection;
