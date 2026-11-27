// app/(panel)/events/edit/[id].tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';
import { addHours, isBefore, isValid, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, MapPin, Save, Users } from 'lucide-react-native';
import InviteUsersSection from '../../../../components/events/InviteUsersSection';
import { DateTimePickerFields } from '../../../../components/tasks/TaskEdit/DateTimePickerSection';
import { useAuth } from '../../../../src/context/AuthContext';
import {
  Button,
  Screen,
  ScreenHeader,
  StateView,
  TextField,
  useFeedback,
  useTheme,
} from '../../../../src/design-system';
import { useEvents } from '../../../../src/hooks/useEvents';
import { EventsService } from '../../../../src/services/events';
import { formatToBackendDateTime } from '../../../../src/utils/dateUtils';
import { ErrorHandler } from '../../../../src/utils/errorHandling';
import { logger } from '../../../../src/utils/logger';

const triggerSuccessHaptic = () => {
  if (Platform.OS === 'web') return;
  try {
    void Promise.resolve(
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    ).catch(() => {});
  } catch {
    // Ignore haptics errors on unsupported devices
  }
};

const EditEventScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { updateEvent, inviteUsers } = useEvents();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [titleError, setTitleError] = useState<string | undefined>(undefined);
  const [endDateError, setEndDateError] = useState<string | undefined>(undefined);

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startPickerMode, setStartPickerMode] = useState<'date' | 'time'>('date');
  const [endPickerMode, setEndPickerMode] = useState<'date' | 'time'>('date');

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (id) {
      router.replace(`/(panel)/events/${id}`);
    } else {
      router.replace('/(panel)/events');
    }
  }, [router, id]);

  const fetchEventDetails = useCallback(async () => {
    if (!id) {
      setLoadError('Identificador do evento não informado.');
      setInitialLoading(false);
      return;
    }

    try {
      setInitialLoading(true);
      setLoadError(null);
      const eventData = await EventsService.getEventById(id);

      if (!eventData) {
        setLoadError('Evento não encontrado.');
        toast({
          title: 'Não encontrado',
          message: 'Evento não encontrado.',
          tone: 'warning',
        });
        return;
      }

      const isCreator = Boolean(user && user.uid === eventData.creatorId);
      if (!isCreator) {
        setLoadError('Você não tem permissão para editar este evento.');
        toast({
          title: 'Acesso negado',
          message: 'Você não tem permissão para editar este evento.',
          tone: 'warning',
        });
        return;
      }

      setTitle(eventData.title);
      setDescription(eventData.description || '');
      setLocation(eventData.location || '');

      const parsedStart = parseISO(eventData.startDate);
      const parsedEnd = parseISO(eventData.endDate);
      if (isValid(parsedStart)) {
        setStartDate(parsedStart);
      }
      if (isValid(parsedEnd)) {
        setEndDate(parsedEnd);
      }

      if (eventData.invitations) {
        setSelectedParticipants(
          eventData.invitations.map((invitation) => invitation.userId)
        );
      }
    } catch (error: any) {
      logger.error('Erro ao carregar evento para edição:', error);
      const errorMessage =
        error?.message ||
        error?.originalError?.message ||
        'Não foi possível carregar o evento.';
      setLoadError(errorMessage);
      void ErrorHandler.handle(error);
    } finally {
      setInitialLoading(false);
    }
  }, [id, user, toast]);

  useEffect(() => {
    void fetchEventDetails();
  }, [fetchEventDetails]);

  const handleStartDateChange = useCallback(
    (nextDate?: Date) => {
      if (!nextDate) return;
      setStartDate(nextDate);
      if (isBefore(endDate, nextDate)) {
        setEndDate(addHours(nextDate, 2));
        setEndDateError(undefined);
      }
    },
    [endDate]
  );

  const handleEndDateChange = useCallback(
    (nextDate?: Date) => {
      if (!nextDate) return;
      if (isBefore(nextDate, startDate)) {
        const message = 'A data/hora de término não pode ser anterior ao início.';
        setEndDateError(message);
        toast({
          title: 'Atenção',
          message,
          tone: 'warning',
        });
        return;
      }
      setEndDateError(undefined);
      setEndDate(nextDate);
    },
    [startDate, toast]
  );

  const validateForm = useCallback(() => {
    let valid = true;

    if (!title.trim()) {
      setTitleError('Por favor, informe um título para o evento.');
      toast({
        title: 'Atenção',
        message: 'Por favor, informe um título para o evento.',
        tone: 'warning',
      });
      valid = false;
    } else {
      setTitleError(undefined);
    }

    if (isBefore(endDate, startDate)) {
      const message = 'A data/hora de término deve ser após a data/hora de início.';
      setEndDateError(message);
      if (valid) {
        toast({
          title: 'Atenção',
          message,
          tone: 'warning',
        });
      }
      valid = false;
    } else {
      setEndDateError(undefined);
    }

    return valid;
  }, [title, startDate, endDate, toast]);

  const handleUpdateEvent = useCallback(async () => {
    Keyboard.dismiss();

    if (!validateForm() || !id) return;

    setLoading(true);

    try {
      const eventData = {
        title: title.trim(),
        description: description.trim() || '',
        startDate: formatToBackendDateTime(startDate),
        endDate: formatToBackendDateTime(endDate),
        location: location.trim() || '',
      };

      await updateEvent(parseInt(id, 10), eventData);

      if (selectedParticipants.length > 0) {
        await inviteUsers(parseInt(id, 10), selectedParticipants);
      }

      triggerSuccessHaptic();
      toast({
        title: 'Evento atualizado',
        message: 'Evento atualizado com sucesso!',
        tone: 'success',
      });

      router.replace(`/(panel)/events/${id}`);
    } catch (error: any) {
      // EventsService.updateEvent / inviteUsers already display API error toasts via ErrorHandler.handle
      logger.error('Erro ao atualizar evento:', error);
    } finally {
      setLoading(false);
    }
  }, [
    title,
    description,
    startDate,
    endDate,
    location,
    validateForm,
    id,
    updateEvent,
    selectedParticipants,
    inviteUsers,
    toast,
    router,
  ]);

  const header = <ScreenHeader title="Editar Evento" onBack={handleBack} />;

  if (initialLoading) {
    return (
      <Screen header={header}>
        <StateView kind="loading" title="Carregando evento..." />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen header={header}>
        <StateView
          kind="error"
          title="Não foi possível carregar"
          description={loadError}
          actionLabel="Voltar"
          onAction={handleBack}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      keyboardAvoiding
      header={header}
      contentContainerStyle={{
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xxl,
      }}
    >
      <TextField
        label="Título do Evento *"
        placeholder="Digite o título do evento"
        value={title}
        onChangeText={(text) => {
          setTitle(text);
          if (titleError && text.trim()) {
            setTitleError(undefined);
          }
        }}
        error={titleError}
        maxLength={100}
        returnKeyType="next"
        leftIcon={<Calendar size={18} strokeWidth={1.75} color={theme.colors.accent} />}
      />

      <TextField
        label="Descrição (opcional)"
        placeholder="Descreva mais sobre o evento"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <DateTimePickerFields
        label="Data e Hora de Início *"
        value={startDate}
        onChange={handleStartDateChange}
        isVisible={showStartDatePicker}
        onVisibleChange={(visible) => {
          setShowStartDatePicker(visible);
          if (visible) setShowEndDatePicker(false);
        }}
        mode={startPickerMode}
        onModeChange={setStartPickerMode}
        clearable={false}
      />

      <DateTimePickerFields
        label="Data e Hora de Término *"
        value={endDate}
        onChange={handleEndDateChange}
        isVisible={showEndDatePicker}
        onVisibleChange={(visible) => {
          setShowEndDatePicker(visible);
          if (visible) setShowStartDatePicker(false);
        }}
        mode={endPickerMode}
        onModeChange={setEndPickerMode}
        error={endDateError}
        clearable={false}
      />

      <TextField
        label="Local (opcional)"
        placeholder="Local do evento"
        value={location}
        onChangeText={setLocation}
        returnKeyType="done"
        leftIcon={<MapPin size={18} strokeWidth={1.75} color={theme.colors.accent} />}
      />

      {user?.currentHouseId ? (
        <InviteUsersSection
          houseId={user.currentHouseId}
          selectedIds={selectedParticipants}
          onSelectionChange={setSelectedParticipants}
        />
      ) : null}

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
        <Button
          label="Gerenciar Convidados"
          variant="secondary"
          fullWidth
          leftIcon={<Users size={18} strokeWidth={1.75} color={theme.colors.accent} />}
          onPress={() => router.push(`/(panel)/events/invitations/${id}`)}
          accessibilityLabel="Gerenciar convidados"
        />

        <Button
          label="Atualizar Evento"
          variant="primary"
          fullWidth
          loading={loading}
          leftIcon={
            <Save size={18} strokeWidth={1.75} color={theme.colors.onAccent} />
          }
          onPress={() => void handleUpdateEvent()}
          accessibilityLabel="Atualizar evento"
          accessibilityHint="Salva as alterações feitas no evento"
        />
      </View>
    </Screen>
  );
};

export default EditEventScreen;
