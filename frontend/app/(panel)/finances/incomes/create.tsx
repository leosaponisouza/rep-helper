// app/(panel)/finances/incomes/create.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { isValid, parse, startOfDay } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Save } from 'lucide-react-native';
import { useAuth } from '../../../../src/context/AuthContext';
import {
  AppText,
  Button,
  Chip,
  Screen,
  ScreenHeader,
  StateView,
  Surface,
  TextField,
  useFeedback,
  useTheme,
} from '../../../../src/design-system';
import { useFinances } from '../../../../src/hooks/useFinances';
import {
  CreateIncomeRequest,
  IncomeFormData,
} from '../../../../src/models/finances.model';
import { formatCurrencyBRL } from '../../../../src/utils/currencyUtils';
import {
  formatLocalDate,
  formatShortDate,
  parseISOPreservingTime,
} from '../../../../src/utils/dateUtils';
import { ErrorHandler } from '../../../../src/utils/errorHandling';
import { logger } from '../../../../src/utils/logger';

const INCOME_SOURCES = ['Contribuição', 'Reembolso', 'Evento', 'Outros'];

const parseSafeDate = (isoOrDateString?: string): Date => {
  if (!isoOrDateString) return new Date();
  const parsed = parseISOPreservingTime(isoOrDateString);
  return isValid(parsed) ? parsed : new Date();
};

const amountToCentavosDigits = (amount: number): string => {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return String(Math.round(amount * 100));
};

const CreateIncomeScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const params = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const { createIncome, updateIncome, getIncomeById } = useFinances();

  const isEditing = Boolean(params.id);

  const [formData, setFormData] = useState<IncomeFormData>({
    description: '',
    amount: '',
    date: new Date().toISOString(),
    source: INCOME_SOURCES[0],
    notes: '',
  });

  const [descriptionError, setDescriptionError] = useState<string | undefined>(
    undefined
  );
  const [amountError, setAmountError] = useState<string | undefined>(undefined);
  const [sourceError, setSourceError] = useState<string | undefined>(undefined);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [webDateInput, setWebDateInput] = useState('');
  const [webDateError, setWebDateError] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [loadingIncome, setLoadingIncome] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(panel)/finances/incomes');
    }
  }, [router]);

  const loadIncomeDetails = useCallback(async () => {
    if (!params.id) return;

    setLoadingIncome(true);
    setLoadError(null);
    try {
      const income = await getIncomeById(Number(params.id));
      const parsedDate = parseSafeDate(income.incomeDate);
      setFormData({
        description: income.description,
        amount: amountToCentavosDigits(income.amount),
        date: parsedDate.toISOString(),
        source: income.source || INCOME_SOURCES[0],
        notes: income.notes || '',
      });
    } catch (error) {
      logger.error('Erro ao carregar detalhes da receita:', error);
      void ErrorHandler.handle(error);
      setLoadError('Não foi possível carregar os detalhes da receita.');
    } finally {
      setLoadingIncome(false);
    }
  }, [params.id, getIncomeById]);

  useEffect(() => {
    if (params.id) {
      void loadIncomeDetails();
    }
  }, [params.id, loadIncomeDetails]);

  const selectedDate = useMemo(
    () => parseSafeDate(formData.date),
    [formData.date]
  );

  const sourcesList = useMemo(() => {
    if (formData.source && !INCOME_SOURCES.includes(formData.source)) {
      return [...INCOME_SOURCES, formData.source];
    }
    return INCOME_SOURCES;
  }, [formData.source]);

  const handleChange = (
    field: keyof IncomeFormData,
    value: string | number | Date
  ) => {
    if (field === 'date' && value instanceof Date) {
      setFormData((prev) => ({ ...prev, date: value.toISOString() }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleAmountChange = (text: string) => {
    const rawDigits = text.replace(/\D/g, '');
    const parsedDigits = rawDigits ? parseInt(rawDigits, 10) : 0;
    const normalized = parsedDigits > 0 ? String(parsedDigits).slice(0, 12) : '';
    handleChange('amount', normalized);
    if (amountError) setAmountError(undefined);
  };

  const getFormattedAmount = () => {
    if (!formData.amount) return '';
    const numericValue = parseInt(formData.amount.toString(), 10) / 100;
    if (!Number.isFinite(numericValue) || numericValue === 0) return '';
    return formatCurrencyBRL(numericValue);
  };

  const getFormattedDate = () => {
    return (
      formatLocalDate(selectedDate, "dd 'de' MMMM 'de' yyyy") || 'Data inválida'
    );
  };

  const toggleDatePicker = () => {
    if (Platform.OS === 'web') {
      if (showDatePicker) {
        setShowDatePicker(false);
        return;
      }
      setWebDateInput(formatShortDate(selectedDate));
      setWebDateError(undefined);
    }
    setShowDatePicker(true);
  };

  const handleNativeDateChange = (
    event: DateTimePickerEvent,
    pickedDate?: Date
  ) => {
    if (event?.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }

    if (pickedDate) {
      handleChange('date', pickedDate);
    }
  };

  const handleApplyWebDate = () => {
    const trimmed = webDateInput.trim();
    if (!trimmed) {
      setWebDateError('Informe a data no formato DD/MM/AAAA.');
      return;
    }

    const parsed = parse(trimmed, 'dd/MM/yyyy', new Date());
    if (!isValid(parsed) || formatShortDate(parsed) !== trimmed) {
      setWebDateError('Data inválida. Use o formato DD/MM/AAAA.');
      return;
    }

    if (startOfDay(parsed) > startOfDay(new Date())) {
      setWebDateError('A data não pode ser futura.');
      return;
    }

    handleChange('date', parsed);
    setWebDateError(undefined);
    setShowDatePicker(false);
  };

  const validateForm = (): boolean => {
    let valid = true;

    if (!formData.description.trim()) {
      const msg = 'Por favor, informe uma descrição para a receita.';
      setDescriptionError(msg);
      toast({ title: 'Atenção', message: msg, tone: 'warning' });
      valid = false;
    } else {
      setDescriptionError(undefined);
    }

    const amountValue = parseInt(formData.amount.toString(), 10);
    if (!formData.amount || !Number.isFinite(amountValue) || amountValue <= 0) {
      const msg = 'Por favor, informe um valor válido para a receita.';
      setAmountError(msg);
      if (valid) {
        toast({ title: 'Atenção', message: msg, tone: 'warning' });
      }
      valid = false;
    } else {
      setAmountError(undefined);
    }

    if (!formData.source) {
      const msg = 'Por favor, selecione uma fonte para a receita.';
      setSourceError(msg);
      if (valid) {
        toast({ title: 'Atenção', message: msg, tone: 'warning' });
      }
      valid = false;
    } else {
      setSourceError(undefined);
    }

    return valid;
  };

  const handleSaveIncome = async () => {
    if (!validateForm()) return;

    if (!user?.currentRepublicId) {
      toast({
        title: 'República não identificada',
        message: 'Não foi possível identificar sua república atual.',
        tone: 'danger',
      });
      return;
    }

    setLoading(true);

    try {
      const incomeData: CreateIncomeRequest = {
        description: formData.description.trim(),
        amount: parseInt(formData.amount.toString(), 10) / 100,
        incomeDate: formData.date,
        source: formData.source,
        republicId: user.currentRepublicId,
        notes: formData.notes?.trim() || undefined,
      };

      if (isEditing && params.id) {
        await updateIncome(Number(params.id), incomeData);
        toast({
          title: 'Receita atualizada',
          message: 'Receita atualizada com sucesso!',
          tone: 'success',
        });
      } else {
        await createIncome(incomeData);
        toast({
          title: 'Receita cadastrada',
          message: 'Receita cadastrada com sucesso!',
          tone: 'success',
        });
      }

      handleBack();
    } catch (error) {
      logger.error('Erro ao salvar receita:', error);
      void ErrorHandler.handle(error);
    } finally {
      setLoading(false);
    }
  };

  const screenTitle = isEditing ? 'Editar Receita' : 'Nova Receita';

  if (loadingIncome) {
    return (
      <Screen header={<ScreenHeader title={screenTitle} onBack={handleBack} />}>
        <StateView kind="loading" title="Carregando detalhes da receita..." />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen header={<ScreenHeader title={screenTitle} onBack={handleBack} />}>
        <StateView
          kind="error"
          title="Não foi possível carregar"
          description={loadError}
          actionLabel="Tentar novamente"
          onAction={() => void loadIncomeDetails()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      keyboardAvoiding
      header={<ScreenHeader title={screenTitle} onBack={handleBack} />}
      contentContainerStyle={{
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xxl,
      }}
    >
      <TextField
        label="Descrição"
        placeholder="Descreva a receita"
        value={formData.description}
        onChangeText={(text) => {
          handleChange('description', text);
          if (descriptionError && text.trim()) {
            setDescriptionError(undefined);
          }
        }}
        error={descriptionError}
        multiline
        maxLength={100}
      />

      <TextField
        label="Valor"
        placeholder="R$ 0,00"
        keyboardType="numeric"
        value={getFormattedAmount()}
        onChangeText={handleAmountChange}
        error={amountError}
      />

      <View style={{ gap: theme.spacing.xxs }}>
        <AppText variant="bodyStrong" color="ink">
          Data
        </AppText>
        <Pressable
          onPress={toggleDatePicker}
          accessibilityRole="button"
          accessibilityLabel={`Selecionar data: ${getFormattedDate()}`}
          style={({ pressed }) => [
            styles.dateButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderStrong,
              borderRadius: theme.radius.sm,
              paddingHorizontal: theme.spacing.sm,
              gap: theme.spacing.xs,
              opacity: pressed ? theme.motion.pressOpacity : 1,
            },
          ]}
        >
          <Calendar size={18} strokeWidth={1.75} color={theme.colors.accent} />
          <AppText variant="body" color="ink">
            {getFormattedDate()}
          </AppText>
        </Pressable>

        {showDatePicker && Platform.OS === 'web' ? (
          <Surface
            tone="subtle"
            bordered
            padded="sm"
            radiusKey="sm"
            style={{ gap: theme.spacing.xs, marginTop: theme.spacing.xxs }}
          >
            <TextField
              label="Data (DD/MM/AAAA)"
              value={webDateInput}
              onChangeText={(text) => {
                setWebDateInput(text);
                if (webDateError) setWebDateError(undefined);
              }}
              placeholder="DD/MM/AAAA"
              error={webDateError}
              returnKeyType="done"
              onSubmitEditing={handleApplyWebDate}
            />
            <View style={[styles.webDateActions, { gap: theme.spacing.xs }]}>
              <Button
                label="Cancelar"
                variant="ghost"
                size="sm"
                onPress={() => setShowDatePicker(false)}
              />
              <Button
                label="Aplicar"
                variant="secondary"
                size="sm"
                onPress={handleApplyWebDate}
              />
            </View>
          </Surface>
        ) : null}

        {showDatePicker && Platform.OS !== 'web' ? (
          <View style={{ gap: theme.spacing.xs }}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              themeVariant={theme.isDark ? 'dark' : 'light'}
              accentColor={theme.colors.accent}
              onChange={handleNativeDateChange}
              maximumDate={new Date()}
            />
            {Platform.OS === 'ios' ? (
              <Button
                label="Concluir seleção"
                variant="ghost"
                size="sm"
                onPress={() => setShowDatePicker(false)}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="bodyStrong" color="ink">
          Fonte
        </AppText>
        <View style={[styles.chipGrid, { gap: theme.spacing.xs }]}>
          {sourcesList.map((source) => (
            <Chip
              key={source}
              label={source}
              selected={formData.source === source}
              onPress={() => {
                handleChange('source', source);
                if (sourceError) setSourceError(undefined);
              }}
            />
          ))}
        </View>
        {sourceError ? (
          <AppText variant="caption" color="danger">
            {sourceError}
          </AppText>
        ) : null}
      </View>

      <TextField
        label="Observações (opcional)"
        placeholder="Adicione informações adicionais sobre a receita"
        value={formData.notes || ''}
        onChangeText={(text) => handleChange('notes', text)}
        multiline
        numberOfLines={4}
      />

      <View style={{ marginTop: theme.spacing.xs }}>
        <Button
          label={isEditing ? 'Atualizar Receita' : 'Registrar Receita'}
          variant="primary"
          fullWidth
          loading={loading}
          leftIcon={
            <Save size={18} strokeWidth={1.75} color={theme.colors.onAccent} />
          }
          onPress={() => void handleSaveIncome()}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
  },
  webDateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

export default CreateIncomeScreen;
