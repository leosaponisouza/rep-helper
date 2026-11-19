// app/(panel)/tasks/create.tsx
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle } from 'lucide-react-native';
import { useForm } from 'react-hook-form';
import {
  CategorySection,
  DateTimePickerSection,
  RecurrenceSection,
  TitleDescriptionInputs,
  UserAssignmentSection,
} from '../../../components/tasks/TaskEdit';
import { useAuth } from '../../../src/context/AuthContext';
import {
  Button,
  Screen,
  ScreenHeader,
  useFeedback,
  useTheme,
} from '../../../src/design-system';
import { useRepublicMembers } from '../../../src/hooks/useRepublicMembers';
import { useTasks } from '../../../src/hooks/useTasks';
import { RecurrenceType } from '../../../src/models/task.model';
import { logger } from '../../../src/utils/logger';
import {
  TaskFormValues,
  getRecurrencePatternLabel,
  taskFormSchema,
} from '../../../src/validation/taskSchemas';

const INITIAL_FORM_VALUES: TaskFormValues = {
  title: '',
  description: '',
  dueDate: undefined,
  category: '',
  recurring: false,
  recurrenceType: 'WEEKLY',
  recurrenceInterval: 1,
  recurrenceEndDate: undefined,
};

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

const CreateTaskScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const { user } = useAuth();
  const { createTask, assignMultipleUsers } = useTasks();
  const { members: availableUsers } = useRepublicMembers(user?.currentRepublicId);

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: INITIAL_FORM_VALUES,
  });

  useEffect(() => {
    reset(INITIAL_FORM_VALUES);
    if (user?.uid) {
      setSelectedUsers([user.uid]);
    }
    return () => {
      reset(INITIAL_FORM_VALUES);
      setSelectedUsers([]);
    };
  }, [reset, user?.uid]);

  const onSubmit = async (data: TaskFormValues) => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'Atenção',
        message: 'Selecione pelo menos um responsável para a tarefa.',
        tone: 'warning',
      });
      return;
    }

    if (data.recurring && !data.dueDate) {
      toast({
        title: 'Atenção',
        message: 'Para tarefas recorrentes, é necessário definir a data da primeira ocorrência.',
        tone: 'warning',
      });
      return;
    }

    try {
      setIsLoading(true);

      const taskData = {
        title: data.title,
        description: data.description || '',
        republicId: user?.currentRepublicId || '',
        dueDate: data.dueDate ? data.dueDate.toISOString() : undefined,
        category: data.category,
        recurring: data.recurring,
        isRecurring: data.recurring,
        recurrenceType: data.recurring ? (data.recurrenceType as RecurrenceType) : undefined,
        recurrenceInterval: data.recurring ? data.recurrenceInterval : undefined,
        recurrenceEndDate:
          data.recurring && data.recurrenceEndDate
            ? data.recurrenceEndDate.toISOString()
            : undefined,
      };

      const createdTask = await createTask(taskData);

      if (createdTask && createdTask.id) {
        await assignMultipleUsers(createdTask.id, selectedUsers);
        triggerSuccessHaptic();

        if (data.recurring) {
          const patternLabel = getRecurrencePatternLabel(
            data.recurring,
            data.recurrenceType,
            data.recurrenceInterval
          ).toLowerCase();

          toast({
            title: 'Tarefa recorrente criada',
            message: `Nova instância será gerada automaticamente ${patternLabel} após conclusão.`,
            tone: 'success',
          });
        } else {
          toast({
            title: 'Tarefa criada',
            message: 'Tarefa criada com sucesso!',
            tone: 'success',
          });
        }

        router.replace('/(panel)/tasks');
      }
    } catch (error) {
      logger.error('Error creating task:', error);
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

  return (
    <Screen
      scroll
      keyboardAvoiding
      header={<ScreenHeader title="Criar Tarefa" onBack={handleBack} />}
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
        isDatePickerVisible={isDatePickerVisible}
        setDatePickerVisibility={setDatePickerVisibility}
        datePickerMode={datePickerMode}
        setDatePickerMode={setDatePickerMode}
        errors={errors}
      />

      <CategorySection control={control} setValue={setValue} watch={watch} />

      <RecurrenceSection control={control} setValue={setValue} watch={watch} />

      <View style={{ marginTop: theme.spacing.sm }}>
        <Button
          label="Criar Tarefa"
          variant="primary"
          fullWidth
          loading={isLoading}
          leftIcon={
            <PlusCircle size={18} strokeWidth={1.75} color={theme.colors.onAccent} />
          }
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </Screen>
  );
};

export default CreateTaskScreen;
