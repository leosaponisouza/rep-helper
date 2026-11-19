// app/(panel)/tasks/edit.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { isValid } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react-native';
import { useForm } from 'react-hook-form';
import {
  CategorySection,
  DateTimePickerSection,
  TitleDescriptionInputs,
  UserAssignmentSection,
} from '../../../components/Task/TaskEdit';
import { useAuth } from '../../../src/context/AuthContext';
import {
  Button,
  Screen,
  ScreenHeader,
  StateView,
  useFeedback,
  useTheme,
} from '../../../src/design-system';
import { useRepublicMembers } from '../../../src/hooks/useRepublicMembers';
import { useTasks } from '../../../src/hooks/useTasks';
import { parseISOPreservingTime } from '../../../src/utils/dateUtils';
import { ErrorHandler } from '../../../src/utils/errorHandling';
import { TaskFormValues, taskFormSchema } from '../../../src/validation/taskSchemas';

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

const EditTaskScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { getTaskById, updateTask, assignMultipleUsers } = useTasks();
  const { members: availableUsers } = useRepublicMembers(user?.currentRepublicId);

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingTask, setIsFetchingTask] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: undefined,
      category: '',
    },
  });

  const fetchTaskDetails = useCallback(async () => {
    if (!id) {
      setLoadError('Identificador da tarefa não informado.');
      setIsFetchingTask(false);
      return;
    }

    try {
      setIsFetchingTask(true);
      setLoadError(null);
      const task = await getTaskById(id);

      setValue('title', task.title);
      setValue('description', task.description || '');
      setValue('category', task.category || '');

      if (task.dueDate) {
        const parsedDue = parseISOPreservingTime(task.dueDate);
        if (isValid(parsedDue)) {
          setValue('dueDate', parsedDue);
        }
      }

      if (task.assignedUsers && task.assignedUsers.length > 0) {
        const userIds = task.assignedUsers.map((assignedUser) => String(assignedUser.uid));
        setSelectedUsers(userIds);
      }
    } catch (error) {
      void ErrorHandler.handle(error);
      setLoadError('Não foi possível carregar os dados da tarefa.');
    } finally {
      setIsFetchingTask(false);
    }
  }, [id, getTaskById, setValue]);

  useEffect(() => {
    void fetchTaskDetails();
  }, [fetchTaskDetails]);

  const onSubmit = async (data: TaskFormValues) => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'Atenção',
        message: 'Selecione pelo menos um responsável para a tarefa.',
        tone: 'warning',
      });
      return;
    }

    try {
      setIsLoading(true);

      const taskData = {
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate ? data.dueDate.toISOString() : undefined,
        category: data.category,
      };

      await updateTask(Number(id), taskData);
      await assignMultipleUsers(Number(id), selectedUsers);
      triggerSuccessHaptic();

      toast({
        title: 'Tarefa atualizada',
        message: 'As alterações foram salvas com sucesso.',
        tone: 'success',
      });

      router.replace('/(panel)/tasks');
    } catch (error) {
      void ErrorHandler.handle(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(panel)/tasks');
    }
  };

  const header = <ScreenHeader title="Editar Tarefa" onBack={handleBack} />;

  if (isFetchingTask) {
    return (
      <Screen header={header}>
        <StateView kind="loading" title="Carregando tarefa..." />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen header={header}>
        <StateView
          kind="error"
          title="Erro ao carregar tarefa"
          description={loadError}
          actionLabel="Tentar novamente"
          onAction={() => void fetchTaskDetails()}
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
      <TitleDescriptionInputs control={control} errors={errors} />

      <UserAssignmentSection
        selectedUsers={selectedUsers}
        availableUsers={availableUsers}
        currentUserId={user?.uid}
        onChangeSelectedUsers={setSelectedUsers}
      />

      <DateTimePickerSection
        control={control}
        setValue={setValue}
        watch={watch}
        setDatePickerVisibility={setDatePickerVisibility}
        isDatePickerVisible={isDatePickerVisible}
        datePickerMode={datePickerMode}
        setDatePickerMode={setDatePickerMode}
        errors={errors}
      />

      <CategorySection control={control} setValue={setValue} watch={watch} />

      <View style={{ marginTop: theme.spacing.sm }}>
        <Button
          label="Salvar Alterações"
          variant="primary"
          fullWidth
          loading={isLoading}
          leftIcon={<Save size={18} strokeWidth={1.75} color={theme.colors.onAccent} />}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </Screen>
  );
};

export default EditTaskScreen;
