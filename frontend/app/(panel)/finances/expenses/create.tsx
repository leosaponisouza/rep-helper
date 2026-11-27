// app/(panel)/finances/expenses/create.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { isValid, parse, startOfDay } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Calendar,
  Camera,
  Image as ImageIcon,
  Save,
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '../../../../src/context/AuthContext';
import {
  AppText,
  Button,
  Chip,
  IconButton,
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
  CreateExpenseRequest,
  ExpenseFormData,
} from '../../../../src/models/finances.model';
import { uploadImageToSupabase } from '../../../../src/services/supabase';
import { formatCurrencyBRL } from '../../../../src/utils/currencyUtils';
import {
  formatLocalDate,
  formatShortDate,
  parseISOPreservingTime,
} from '../../../../src/utils/dateUtils';
import { ErrorHandler } from '../../../../src/utils/errorHandling';
import { logger } from '../../../../src/utils/logger';

const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Aluguel',
  'Contas',
  'Manutenção',
  'Limpeza',
  'Eventos',
  'Outros',
];

const parseSafeDate = (isoOrDateString?: string): Date => {
  if (!isoOrDateString) return new Date();
  const parsed = parseISOPreservingTime(isoOrDateString);
  return isValid(parsed) ? parsed : new Date();
};

const amountToCentavosDigits = (amount: number): string => {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return String(Math.round(amount * 100));
};

const CreateExpenseScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast, confirm } = useFeedback();
  const params = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const { createExpense, updateExpense, getExpenseById } = useFinances();

  const isEditing = Boolean(params.id);

  const [formData, setFormData] = useState<ExpenseFormData>({
    description: '',
    amount: '',
    date: new Date().toISOString(),
    category: EXPENSE_CATEGORIES[0],
    notes: '',
  });

  const [descriptionError, setDescriptionError] = useState<string | undefined>(
    undefined
  );
  const [amountError, setAmountError] = useState<string | undefined>(undefined);
  const [categoryError, setCategoryError] = useState<string | undefined>(
    undefined
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [webDateInput, setWebDateInput] = useState('');
  const [webDateError, setWebDateError] = useState<string | undefined>(undefined);

  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingExpense, setLoadingExpense] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(panel)/finances/expenses');
    }
  }, [router]);

  const loadExpenseDetails = useCallback(async () => {
    if (!params.id) return;

    setLoadingExpense(true);
    setLoadError(null);
    try {
      const expense = await getExpenseById(Number(params.id));
      const parsedDate = parseSafeDate(expense.expenseDate);
      setFormData({
        description: expense.description,
        amount: amountToCentavosDigits(expense.amount),
        date: parsedDate.toISOString(),
        category: expense.category || EXPENSE_CATEGORIES[0],
        notes: expense.notes || '',
      });
      setReceiptUrl(expense.receiptUrl);
    } catch (error) {
      logger.error('Erro ao carregar detalhes da despesa:', error);
      void ErrorHandler.handle(error);
      setLoadError('Não foi possível carregar os detalhes da despesa.');
    } finally {
      setLoadingExpense(false);
    }
  }, [params.id, getExpenseById]);

  useEffect(() => {
    if (params.id) {
      void loadExpenseDetails();
    }
  }, [params.id, loadExpenseDetails]);

  const selectedDate = useMemo(
    () => parseSafeDate(formData.date),
    [formData.date]
  );

  const categoriesList = useMemo(() => {
    if (
      formData.category &&
      !EXPENSE_CATEGORIES.includes(formData.category)
    ) {
      return [...EXPENSE_CATEGORIES, formData.category];
    }
    return EXPENSE_CATEGORIES;
  }, [formData.category]);

  const handleChange = (
    field: keyof ExpenseFormData,
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

  const checkPermission = async (
    permissionType: 'camera' | 'mediaLibrary'
  ): Promise<boolean> => {
    try {
      const permissionResult =
        permissionType === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        toast({
          title: 'Permissão negada',
          message: `Precisamos de permissão para acessar sua ${
            permissionType === 'camera' ? 'câmera' : 'galeria'
          }.`,
          tone: 'warning',
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Erro ao solicitar permissão de ${permissionType}:`, error);
      toast({
        title: 'Erro de permissão',
        message: 'Não foi possível verificar as permissões de mídia.',
        tone: 'danger',
      });
      return false;
    }
  };

  const uploadImage = async (uri: string, fileSizeBytes?: number) => {
    if (!user?.uid) {
      toast({
        title: 'Erro',
        message: 'Usuário não autenticado.',
        tone: 'danger',
      });
      return null;
    }

    setUploadingImage(true);

    try {
      const { url, error } = await uploadImageToSupabase(
        uri,
        'receipts',
        user.uid,
        fileSizeBytes
      );

      if (error || !url) {
        throw error || new Error('Falha ao fazer upload da imagem');
      }

      setReceiptUrl(url);
      toast({
        title: 'Comprovante enviado',
        message: 'Imagem anexada com sucesso.',
        tone: 'success',
      });
      return url;
    } catch (error) {
      logger.error('Erro ao fazer upload da imagem:', error);
      toast({
        title: 'Erro no upload',
        message:
          error instanceof Error && error.message
            ? error.message
            : 'Falha ao fazer upload da imagem. Tente novamente.',
        tone: 'danger',
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const pickImage = async () => {
    if (!user?.uid) {
      toast({
        title: 'Erro',
        message: 'Usuário não autenticado.',
        tone: 'danger',
      });
      return;
    }

    const hasPermission = await checkPermission('mediaLibrary');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadImage(asset.uri, asset.fileSize);
      }
    } catch (error) {
      logger.error('Erro ao selecionar imagem:', error);
      toast({
        title: 'Erro',
        message: 'Não foi possível selecionar a imagem. Tente novamente.',
        tone: 'danger',
      });
    }
  };

  const takePhoto = async () => {
    if (!user?.uid) {
      toast({
        title: 'Erro',
        message: 'Usuário não autenticado.',
        tone: 'danger',
      });
      return;
    }

    const hasPermission = await checkPermission('camera');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadImage(asset.uri, asset.fileSize);
      }
    } catch (error) {
      logger.error('Erro ao capturar foto:', error);
      toast({
        title: 'Erro',
        message: 'Não foi possível capturar a foto. Tente novamente.',
        tone: 'danger',
      });
    }
  };

  const removeImage = async () => {
    const confirmed = await confirm({
      title: 'Remover comprovante',
      message: 'Tem certeza que deseja remover o comprovante anexado?',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      destructive: true,
    });
    if (confirmed) {
      setReceiptUrl(undefined);
    }
  };

  const validateForm = (): boolean => {
    let valid = true;

    if (!formData.description.trim()) {
      const msg = 'Por favor, informe uma descrição para a despesa.';
      setDescriptionError(msg);
      toast({ title: 'Atenção', message: msg, tone: 'warning' });
      valid = false;
    } else {
      setDescriptionError(undefined);
    }

    const amountValue = parseInt(formData.amount.toString(), 10);
    if (!formData.amount || !Number.isFinite(amountValue) || amountValue <= 0) {
      const msg = 'Por favor, informe um valor válido para a despesa.';
      setAmountError(msg);
      if (valid) {
        toast({ title: 'Atenção', message: msg, tone: 'warning' });
      }
      valid = false;
    } else {
      setAmountError(undefined);
    }

    if (!formData.category) {
      const msg = 'Por favor, selecione uma categoria para a despesa.';
      setCategoryError(msg);
      if (valid) {
        toast({ title: 'Atenção', message: msg, tone: 'warning' });
      }
      valid = false;
    } else {
      setCategoryError(undefined);
    }

    return valid;
  };

  const handleSaveExpense = async () => {
    if (!validateForm()) return;

    if (!user?.currentHouseId) {
      toast({
        title: 'Casa não identificada',
        message: 'Não foi possível identificar sua casa atual.',
        tone: 'danger',
      });
      return;
    }

    setLoading(true);

    try {
      const safeReceiptUrl =
        receiptUrl && /^https?:\/\//i.test(receiptUrl) ? receiptUrl : undefined;

      const expenseData: CreateExpenseRequest = {
        description: formData.description.trim(),
        amount: parseInt(formData.amount.toString(), 10) / 100,
        expenseDate: formData.date,
        category: formData.category,
        receiptUrl: safeReceiptUrl,
        houseId: user.currentHouseId,
        notes: formData.notes?.trim() || undefined,
      };

      if (isEditing && params.id) {
        await updateExpense(Number(params.id), expenseData);
        toast({
          title: 'Despesa atualizada',
          message: 'Despesa atualizada com sucesso!',
          tone: 'success',
        });
      } else {
        await createExpense(expenseData);
        toast({
          title: 'Despesa cadastrada',
          message: 'Despesa cadastrada com sucesso!',
          tone: 'success',
        });
      }

      handleBack();
    } catch (error) {
      logger.error('Erro ao salvar despesa:', error);
      void ErrorHandler.handle(error);
    } finally {
      setLoading(false);
    }
  };

  const screenTitle = isEditing ? 'Editar Despesa' : 'Nova Despesa';

  if (loadingExpense) {
    return (
      <Screen header={<ScreenHeader title={screenTitle} onBack={handleBack} />}>
        <StateView kind="loading" title="Carregando detalhes da despesa..." />
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
          onAction={() => void loadExpenseDetails()}
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
        placeholder="Descreva a despesa"
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
          Categoria
        </AppText>
        <View style={[styles.chipGrid, { gap: theme.spacing.xs }]}>
          {categoriesList.map((category) => (
            <Chip
              key={category}
              label={category}
              selected={formData.category === category}
              onPress={() => {
                handleChange('category', category);
                if (categoryError) setCategoryError(undefined);
              }}
            />
          ))}
        </View>
        {categoryError ? (
          <AppText variant="caption" color="danger">
            {categoryError}
          </AppText>
        ) : null}
      </View>

      <TextField
        label="Observações (opcional)"
        placeholder="Adicione informações adicionais sobre a despesa"
        value={formData.notes || ''}
        onChangeText={(text) => handleChange('notes', text)}
        multiline
        numberOfLines={4}
      />

      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="bodyStrong" color="ink">
          Comprovante (opcional)
        </AppText>

        {receiptUrl ? (
          <Surface
            tone="subtle"
            bordered
            radiusKey="md"
            style={[
              styles.receiptPreviewCard,
              { borderColor: theme.colors.line },
            ]}
          >
            <Image
              source={{ uri: receiptUrl }}
              style={styles.receiptImage}
              resizeMode="contain"
              accessibilityLabel="Pré-visualização do comprovante"
            />
            <View
              style={[
                styles.removeReceiptOverlay,
                { top: theme.spacing.xs, right: theme.spacing.xs },
              ]}
            >
              <IconButton
                icon={
                  <Trash2
                    size={18}
                    strokeWidth={1.75}
                    color={theme.colors.danger}
                  />
                }
                variant="danger"
                onPress={() => void removeImage()}
                accessibilityLabel="Remover comprovante"
              />
            </View>
          </Surface>
        ) : (
          <View style={[styles.receiptActions, { gap: theme.spacing.xs }]}>
            <View style={styles.receiptActionSlot}>
              <Button
                label="Galeria"
                variant="secondary"
                fullWidth
                loading={uploadingImage}
                onPress={() => void pickImage()}
                leftIcon={
                  <ImageIcon
                    size={18}
                    strokeWidth={1.75}
                    color={theme.colors.ink}
                  />
                }
              />
            </View>
            {Platform.OS !== 'web' ? (
              <View style={styles.receiptActionSlot}>
                <Button
                  label="Câmera"
                  variant="secondary"
                  fullWidth
                  loading={uploadingImage}
                  onPress={() => void takePhoto()}
                  leftIcon={
                    <Camera
                      size={18}
                      strokeWidth={1.75}
                      color={theme.colors.ink}
                    />
                  }
                />
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View style={{ marginTop: theme.spacing.xs }}>
        <Button
          label={isEditing ? 'Atualizar Despesa' : 'Registrar Despesa'}
          variant="primary"
          fullWidth
          loading={loading}
          disabled={uploadingImage}
          leftIcon={
            <Save size={18} strokeWidth={1.75} color={theme.colors.onAccent} />
          }
          onPress={() => void handleSaveExpense()}
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
  receiptPreviewCard: {
    height: 240,
    overflow: 'hidden',
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  removeReceiptOverlay: {
    position: 'absolute',
  },
  receiptActions: {
    flexDirection: 'row',
  },
  receiptActionSlot: {
    flex: 1,
  },
});

export default CreateExpenseScreen;
