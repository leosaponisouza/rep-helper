// app/(panel)/events/create.tsx
import React, { useCallback, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Switch, View } from 'react-native';
import { addHours, isBefore, isValid, setHours, setMinutes } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Check, MapPin } from 'lucide-react-native';
import InviteUsersSection from '../../../components/events/InviteUsersSection';
import { DateTimePickerFields } from '../../../components/tasks/TaskEdit/DateTimePickerSection';
import { useAuth } from '../../../src/context/AuthContext';
import {
  AppText,
  Button,
  Screen,
  ScreenHeader,
  Surface,
  TextField,
  useFeedback,
  useTheme,
} from '../../../src/design-system';
import { useEvents } from '../../../src/hooks/useEvents';
import { formatToBackendDateTime } from '../../../src/utils/dateUtils';
import { logger } from '../../../src/utils/logger';

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

const CreateEventScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const params = useLocalSearchParams<{ date?: string }>();
  const { user } = useAuth();
  const { createEvent, inviteUsers } = useEvents();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [titleError, setTitleError] = useState<string | undefined>(undefined);
  const [endDateError, setEndDateError] = useState<string | undefined>(undefined);

  const [startDate, setStartDate] = useState<Date>(() => {
    if (params.date) {
      try {
        const [year, month, day] = params.date.split('-').map(Number);
        if (
          Number.isFinite(year) &&
          Number.isFinite(month) &&
          Number.isFinite(day)
        ) {
          const baseDate = new Date(year, month - 1, day);
          if (isValid(baseDate)) {
            const now = new Date();
            const roundedHour = Math.ceil(now.getHours());
            return setHours(setMinutes(baseDate, 0), roundedHour);
          }
        }
      } catch (error) {
        logger.error('Erro ao converter parâmetro de data:', error);
      }
    }
    return new Date();
  });

  const [endDate, setEndDate] = useState<Date>(() => addHours(startDate, 2));

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startPickerMode, setStartPickerMode] = useState<'date' | 'time'>('date');
  const [endPickerMode, setEndPickerMode] = useState<'date' | 'time'>('date');

  const [loading, setLoading] = useState(false);
  const [requireRsvp, setRequireRsvp] = useState(true);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(panel)/events');
    }
  }, [router]);

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
        const message = 'A data/hora de término deve ser posterior ao início.';
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

  const handleCreateEvent = useCallback(async () => {
    Keyboard.dismiss();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const eventData = {
        title: title.trim(),
        description: description.trim() || '',
        startDate: formatToBackendDateTime(startDate),
        endDate: formatToBackendDateTime(endDate),
        location: location.trim() || '',
        houseId: user?.currentHouseId || '',
        requireRsvp,
      };

      const createdEvent = await createEvent(eventData);
      let inviteFailed = false;

      if (
        requireRsvp &&
        selectedParticipants.length > 0 &&
        createdEvent &&
        createdEvent.id
      ) {
        try {
          await inviteUsers(createdEvent.id, selectedParticipants);
        } catch (error) {
          // EventsService.inviteUsers already displays the API error toast via ErrorHandler.handle
          logger.error('Erro ao convidar participantes:', error);
          inviteFailed = true;
        }
      }

      triggerSuccessHaptic();
      toast({
        title: 'Evento criado',
        message: inviteFailed
          ? 'Evento salvo, mas os convites não puderam ser enviados.'
          : 'Evento criado com sucesso!',
        tone: inviteFailed ? 'warning' : 'success',
      });

      router.replace('/(panel)/events');
    } catch (error: any) {
      // EventsService.createEvent already displays the API error toast via ErrorHandler.handle
      logger.error('Erro ao criar evento:', error);
    } finally {
      setLoading(false);
    }
  }, [
    title,
    description,
    startDate,
    endDate,
    location,
    user?.currentHouseId,
    requireRsvp,
    selectedParticipants,
    validateForm,
    createEvent,
    inviteUsers,
    toast,
    router,
  ]);

  return (
    <Screen
      scroll
      keyboardAvoiding
      header={<ScreenHeader title="Criar Evento" onBack={handleBack} />}
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
        minimumDate={new Date()}
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

      <Surface
        tone="surface"
        bordered
        padded="md"
        radiusKey="md"
        style={[styles.rsvpRow, { gap: theme.spacing.sm }]}
      >
        <View style={styles.rsvpTextBlock}>
          <AppText variant="bodyStrong" color="ink">
            Pedir confirmação de presença dos moradores
          </AppText>
          <AppText variant="caption" color="inkSecondary">
            {requireRsvp
              ? 'Os moradores poderão confirmar ou recusar presença'
              : 'Apenas registra um aviso informativo na agenda da casa'}
          </AppText>
        </View>
        <Switch
          value={requireRsvp}
          onValueChange={setRequireRsvp}
          accessibilityLabel="Pedir confirmação de presença dos moradores"
          trackColor={{
            false: theme.colors.borderStrong,
            true: theme.colors.accentSoft,
          }}
          thumbColor={requireRsvp ? theme.colors.accent : theme.colors.surface}
          ios_backgroundColor={theme.colors.subtle}
        />
      </Surface>

      {requireRsvp && user?.currentHouseId ? (
        <InviteUsersSection
          houseId={user.currentHouseId}
          selectedIds={selectedParticipants}
          onSelectionChange={setSelectedParticipants}
        />
      ) : null}

      <View style={{ marginTop: theme.spacing.xs }}>
        <Button
          label="Criar Evento"
          variant="primary"
          fullWidth
          loading={loading}
          leftIcon={
            <Check size={18} strokeWidth={1.75} color={theme.colors.onAccent} />
          }
          onPress={() => void handleCreateEvent()}
          accessibilityLabel="Criar evento"
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  rsvpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rsvpTextBlock: {
    flex: 1,
    gap: 2,
  },
});

export default CreateEventScreen;
