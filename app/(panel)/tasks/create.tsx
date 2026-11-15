// app/(panel)/tasks/create.tsx
import React, { useState, useEffect } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorHandler } from '../../../src/utils/errorHandling';
import { useAuth } from '../../../src/context/AuthContext';
import { useTasks } from '../../../src/hooks/useTasks';
import { useRepublicMembers } from '../../../src/hooks/useRepublicMembers';
import { RecurrenceType } from '../../../src/models/task.model';
import {
  taskFormSchema,
  TaskFormValues,
  getRecurrencePatternLabel,
} from '../../../src/validation/taskSchemas';
import {
  HeaderBar,
  TitleDescriptionInputs,
  UserAssignmentSection,
  DateTimePickerSection,
  CategorySection,
  RecurrenceSection,
} from '@/components/Task/TaskEdit';

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

const CreateTaskScreen = () => {
  const router = useRouter();
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
    try {
      if (selectedUsers.length === 0) {
        Alert.alert('Atenção', 'Selecione pelo menos um responsável para a tarefa.');
        return;
      }

      if (data.recurring && !data.dueDate) {
        Alert.alert(
          'Atenção',
          'Para tarefas recorrentes, é necessário definir a data da primeira ocorrência.'
        );
        return;
      }

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

        if (data.recurring) {
          const patternLabel = getRecurrencePatternLabel(
            data.recurring,
            data.recurrenceType,
            data.recurrenceInterval
          ).toLowerCase();

          Alert.alert(
            'Tarefa Recorrente Criada',
            `A tarefa recorrente foi criada com sucesso! Após ser concluída, uma nova instância será criada automaticamente ${patternLabel}.`,
            [{ text: 'OK', onPress: () => router.replace('/(panel)/tasks') }]
          );
        } else {
          Alert.alert('Sucesso', 'Tarefa criada com sucesso!', [
            { text: 'OK', onPress: () => router.replace('/(panel)/tasks') },
          ]);
        }
      }
    } catch (error) {
      ErrorHandler.handle(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#222" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <HeaderBar title="Criar Tarefa" onBack={() => router.back()} />

        <ScrollView
          style={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
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

          <CategorySection
            control={control}
            setValue={setValue}
            watch={watch}
          />

          <RecurrenceSection
            control={control}
            setValue={setValue}
            watch={watch}
          />

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="add-circle"
                  size={20}
                  color="#fff"
                  style={styles.submitButtonIcon}
                />
                <Text style={styles.submitButtonText}>Criar Tarefa</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#222',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#222',
    paddingHorizontal: 20,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#7B68EE',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
    shadowColor: '#7B68EE',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#5a5a5a',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  submitButtonIcon: {
    marginRight: 5,
  },
});

export default CreateTaskScreen;
