// app/(panel)/tasks/[id].tsx - Com suporte aprimorado para recorrência
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { isToday, isTomorrow, differenceInMinutes } from 'date-fns';
import { useTasks } from '../../../src/hooks/useTasks';
import { useAuth } from '../../../src/context/AuthContext';
import { Task } from '../../../src/models/task.model';
import { ErrorHandler } from '../../../src/utils/errorHandling';
import {
  parseISOPreservingTime,
  formatLocalDate,
  formatTime,
} from '../../../src/utils/dateUtils';
import { logger } from '../../../src/utils/logger';
import { TaskRecurrenceCard } from '../../../components/Task/TaskDetails/TaskRecurrenceCard';
import { TaskActionButtons } from '../../../components/Task/TaskDetails/TaskActionButtons';
import { TaskAssignedUsersCard } from '../../../components/Task/TaskDetails/TaskAssignedUsersCard';
import { ConfirmDeleteModal } from '../../../components/common/ConfirmDeleteModal';

const TaskDetailsScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    getTaskById,
    completeTask,
    cancelTask,
    deleteTask,
    updateTask,
    stopRecurrence,
  } = useTasks();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStoppingRecurrence, setIsStoppingRecurrence] = useState(false);

  const isCreator = task?.createdBy?.uid === user?.uid;
  const isAssigned = task?.assignedUsers?.some((u) => u.uid === user?.uid);
  const canChangeStatus = Boolean(isCreator || isAssigned);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];
  const scrollY = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const loadTaskDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const loadedTask = await getTaskById(id);
      if (loadedTask) {
        setTask(loadedTask);
      } else {
        setError('Tarefa não encontrada');
      }
    } catch (err) {
      logger.error('Error loading task details:', err);
      ErrorHandler.handle(err);
      setError('Não foi possível carregar os detalhes da tarefa');
    } finally {
      setLoading(false);
    }
  }, [id, getTaskById]);

  useEffect(() => {
    loadTaskDetails();
  }, [loadTaskDetails]);

  const isAssignedToCurrentUser = useMemo(() => {
    if (!task || !user) return false;
    return task.assignedUsers?.some((u) => u.uid === user.uid) || false;
  }, [task, user]);

  const canEditTask = isAssignedToCurrentUser;
  const isUserAdmin = user?.isAdmin === true;
  const canModifyTask = Boolean(canEditTask || isUserAdmin || isCreator);

  const formatTaskDate = useCallback((dateString?: string): string => {
    if (!dateString) return '';

    try {
      const date = parseISOPreservingTime(dateString);

      if (isToday(date)) {
        return `Hoje, ${formatTime(date)}`;
      } else if (isTomorrow(date)) {
        return `Amanhã, ${formatTime(date)}`;
      } else {
        return formatLocalDate(date, "EEEE, dd 'de' MMMM 'às' HH:mm");
      }
    } catch {
      return dateString;
    }
  }, []);

  const getTimeAgo = useCallback((dateString?: string | null): string => {
    if (!dateString) return '';
    try {
      const date = parseISOPreservingTime(dateString);
      const now = new Date();
      const diffMinutes = differenceInMinutes(now, date);

      if (diffMinutes < 1) return 'agora mesmo';
      if (diffMinutes < 60) return `há ${diffMinutes} minutos`;
      if (diffMinutes < 120) return 'há 1 hora';
      if (diffMinutes < 1440) return `há ${Math.floor(diffMinutes / 60)} horas`;
      if (diffMinutes < 2880) return 'há 1 dia';

      return formatLocalDate(date, "dd 'de' MMM");
    } catch {
      return '';
    }
  }, []);

  const isTaskCompleted = task?.status === 'COMPLETED';
  const isTaskCancelled = task?.status === 'CANCELLED';

  const handleToggleStatus = async () => {
    if (!task || !canChangeStatus) {
      Alert.alert(
        'Acesso Negado',
        'Apenas o criador da tarefa ou os usuários responsáveis podem alterar seu status.'
      );
      return;
    }

    try {
      setIsStatusChanging(true);
      if (task.status === 'IN_PROGRESS') {
        await completeTask(task.id);
      } else if (task.status === 'PENDING' || task.status === 'OVERDUE') {
        await updateTask(task.id, { status: 'IN_PROGRESS' });
      }
      await loadTaskDetails();
    } catch (err) {
      logger.error('Error toggling task status:', err);
      ErrorHandler.handle(err);
      Alert.alert('Erro', 'Não foi possível alterar o status da tarefa');
    } finally {
      setIsStatusChanging(false);
    }
  };

  const handleCancelTask = async () => {
    if (!task || !canChangeStatus) {
      Alert.alert(
        'Acesso Negado',
        'Apenas o criador da tarefa ou os usuários responsáveis podem cancelá-la.'
      );
      return;
    }

    try {
      setIsCancelling(true);
      await cancelTask(task.id);
      await loadTaskDetails();
    } catch (err) {
      logger.error('Error cancelling task:', err);
      ErrorHandler.handle(err);
      Alert.alert('Erro', 'Não foi possível cancelar a tarefa');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleStopRecurrence = async () => {
    if (!task || !canChangeStatus) {
      Alert.alert(
        'Acesso Negado',
        'Apenas o criador da tarefa ou os usuários responsáveis podem parar a recorrência.'
      );
      return;
    }

    try {
      setIsStoppingRecurrence(true);
      await stopRecurrence(task.id);
      await loadTaskDetails();
    } catch (err) {
      logger.error('Error stopping task recurrence:', err);
      ErrorHandler.handle(err);
      Alert.alert('Erro', 'Não foi possível parar a recorrência da tarefa');
    } finally {
      setIsStoppingRecurrence(false);
    }
  };

  const handleNavigateToParent = useCallback(
    (parentTaskId: number) => {
      router.push(`/(panel)/tasks/${parentTaskId}`);
    },
    [router]
  );

  const handleDeleteTask = async () => {
    if (!task || (!isCreator && !isUserAdmin)) {
      Alert.alert(
        'Acesso Negado',
        'Apenas o criador da tarefa pode excluí-la.'
      );
      return;
    }

    if (!showConfirmDelete) {
      setShowConfirmDelete(true);
      return;
    }

    try {
      setIsDeleting(true);
      await deleteTask(task.id);
      router.back();
    } catch (err) {
      logger.error('Error deleting task:', err);
      ErrorHandler.handle(err);
      Alert.alert('Erro', 'Não foi possível excluir a tarefa');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = useCallback(() => {
    setShowConfirmDelete(false);
  }, []);

  const handleShareTask = useCallback(async () => {
    if (!task) return;

    try {
      let message =
        `Tarefa: ${task.title}\n` +
        `Status: ${
          task.status === 'PENDING'
            ? 'Pendente'
            : task.status === 'IN_PROGRESS'
              ? 'Em andamento'
              : task.status === 'COMPLETED'
                ? 'Concluída'
                : task.status === 'OVERDUE'
                  ? 'Atrasada'
                  : 'Cancelada'
        }\n` +
        (task.dueDate ? `Prazo: ${formatTaskDate(task.dueDate)}\n` : '');

      if (task.recurring) {
        const recurrenceType =
          task.recurrenceType === 'DAILY'
            ? 'Diária'
            : task.recurrenceType === 'WEEKLY'
              ? 'Semanal'
              : task.recurrenceType === 'MONTHLY'
                ? 'Mensal'
                : 'Anual';

        const interval =
          task.recurrenceInterval && task.recurrenceInterval > 1
            ? ` (a cada ${task.recurrenceInterval} ${
                task.recurrenceType === 'DAILY'
                  ? 'dias'
                  : task.recurrenceType === 'WEEKLY'
                    ? 'semanas'
                    : task.recurrenceType === 'MONTHLY'
                      ? 'meses'
                      : 'anos'
              })`
            : '';

        message += `Recorrência: ${recurrenceType}${interval}\n`;
      }

      if (task.description) {
        message += `\n${task.description}`;
      }

      await Share.share({
        message,
        title: task.title,
      });
    } catch (err) {
      logger.error('Error sharing task:', err);
      Alert.alert('Erro', 'Não foi possível compartilhar a tarefa');
    }
  }, [task, formatTaskDate]);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 60],
    extrapolate: 'clamp',
  });

  const getDueStatusText = useCallback(() => {
    if (!task || !task.dueDate) return null;

    const dueDate = parseISOPreservingTime(task.dueDate);
    const now = new Date();

    if (isTaskCompleted) {
      if (task.completedAt) {
        const completedAt = parseISOPreservingTime(task.completedAt);
        return completedAt <= dueDate
          ? { text: 'Concluída dentro do prazo', color: '#4CAF50' }
          : { text: 'Concluída com atraso', color: '#FF9800' };
      }
      return { text: 'Concluída', color: '#4CAF50' };
    }

    if (isTaskCancelled) {
      return { text: 'Cancelada', color: '#9E9E9E' };
    }

    if (dueDate < now) {
      return { text: 'Atrasada', color: '#F44336' };
    }

    const diffTime = Math.abs(dueDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { text: 'Vence hoje', color: '#FF9800' };
    } else if (diffDays === 1) {
      return { text: 'Vence amanhã', color: '#FF9800' };
    } else if (diffDays <= 3) {
      return { text: `Vence em ${diffDays} dias`, color: '#FF9800' };
    } else {
      return { text: `Vence em ${diffDays} dias`, color: '#4CAF50' };
    }
  }, [task, isTaskCompleted, isTaskCancelled]);

  const formatDateWithTime = useCallback((dateString?: string | null) => {
    if (!dateString) return '--';
    return (
      formatLocalDate(dateString, "dd 'de' MMM 'de' yyyy 'às' HH:mm") ||
      dateString
    );
  }, []);

  if (loading && !task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#222" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B68EE" />
          <Text style={styles.loadingText}>
            Carregando detalhes da tarefa...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#222" />
        <Ionicons name="alert-circle" size={64} color="#FF6347" />
        <Text style={styles.errorTitle}>Erro</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTaskDetails}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#222" />
        <Ionicons name="checkmark-circle" size={64} color="#7B68EE" />
        <Text style={styles.errorTitle}>Tarefa não encontrada</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(panel)/tasks')}
        >
          <Text style={styles.backButtonText}>Voltar para Tarefas</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const dueStatus = getDueStatusText();
  const republicDisplayId = task.republicId || task.republic_id;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#222" />

      {/* Header animado */}
      <Animated.View
        style={[
          styles.animatedHeader,
          {
            opacity: headerOpacity,
            height: headerHeight,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#7B68EE" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {task.title}
        </Text>
        <View style={styles.headerRight}>
          {canModifyTask && (
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => router.push(`/(panel)/tasks/edit?id=${task.id}`)}
            >
              <Ionicons name="create-outline" size={24} color="#7B68EE" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Banner de tarefa atribuída ao usuário */}
      {isAssignedToCurrentUser && (
        <View style={styles.userAssignmentBanner}>
          <Ionicons name="person" size={18} color="#fff" />
          <Text style={styles.userAssignmentText}>
            Você está atribuído a esta tarefa
          </Text>
        </View>
      )}

      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#7B68EE" />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionIcon}
              onPress={handleShareTask}
            >
              <Ionicons name="share-outline" size={24} color="#7B68EE" />
            </TouchableOpacity>

            {canModifyTask && (
              <TouchableOpacity
                style={styles.headerActionIcon}
                onPress={() => router.push(`/(panel)/tasks/edit?id=${task.id}`)}
              >
                <Ionicons name="create-outline" size={24} color="#7B68EE" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Conteúdo principal */}
        <Animated.View
          style={[
            styles.taskContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Status da tarefa */}
          <View style={styles.taskStatusRow}>
            <View
              style={[
                styles.statusBadge,
                task.status === 'PENDING'
                  ? styles.pendingBadge
                  : task.status === 'IN_PROGRESS'
                    ? styles.inProgressBadge
                    : task.status === 'COMPLETED'
                      ? styles.completedBadge
                      : task.status === 'OVERDUE'
                        ? styles.overdueBadge
                        : styles.cancelledBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  task.status === 'PENDING'
                    ? styles.pendingText
                    : task.status === 'IN_PROGRESS'
                      ? styles.inProgressText
                      : task.status === 'COMPLETED'
                        ? styles.completedText
                        : task.status === 'OVERDUE'
                          ? styles.overdueText
                          : styles.cancelledText,
                ]}
              >
                {task.status === 'PENDING'
                  ? 'Pendente'
                  : task.status === 'IN_PROGRESS'
                    ? 'Em andamento'
                    : task.status === 'COMPLETED'
                      ? 'Concluída'
                      : task.status === 'OVERDUE'
                        ? 'Atrasada'
                        : 'Cancelada'}
              </Text>
            </View>
            <Text style={styles.taskUpdatedTime}>
              Atualizada {getTimeAgo(task.updatedAt || task.updated_at)}
            </Text>
          </View>

          {/* Título */}
          <Text style={styles.taskTitle}>
            {task.title}
            {task.recurring && (
              <Text style={styles.recurringIndicator}>
                {' '}
                <Ionicons name="repeat" size={18} color="#4CAF50" />
              </Text>
            )}
          </Text>

          {/* República */}
          {republicDisplayId && (
            <View style={styles.republicRow}>
              <Ionicons name="home" size={16} color="#7B68EE" />
              <Text style={styles.republicText}>
                República ID: {republicDisplayId}
              </Text>
            </View>
          )}

          {/* Informações de recorrência */}
          <TaskRecurrenceCard
            task={task}
            canModifyTask={canModifyTask}
            isStoppingRecurrence={isStoppingRecurrence}
            formatDateWithTime={formatDateWithTime}
            onNavigateToParent={handleNavigateToParent}
            onStopRecurrence={handleStopRecurrence}
          />

          {/* Action Buttons */}
          <TaskActionButtons
            status={task.status}
            canModifyTask={canModifyTask}
            canChangeStatus={canChangeStatus}
            isStatusChanging={isStatusChanging}
            isCancelling={isCancelling}
            onToggleStatus={handleToggleStatus}
            onCancelTask={handleCancelTask}
          />

          {/* Descrição */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>Descrição</Text>
            <Text style={styles.descriptionText}>
              {task.description || 'Nenhuma descrição fornecida.'}
            </Text>
          </View>

          {/* Task Details */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Detalhes</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="calendar-outline" size={20} color="#7B68EE" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Data de Criação</Text>
                <Text style={styles.detailValue}>
                  {formatDateWithTime(task.createdAt || task.created_at)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="person-outline" size={20} color="#7B68EE" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Criado por</Text>
                <Text style={styles.detailValue}>
                  {task.createdBy?.nickname ||
                    task.createdBy?.name ||
                    'Desconhecido'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="alarm-outline" size={20} color="#7B68EE" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Prazo</Text>
                <View style={styles.dueDateContainer}>
                  <Text style={styles.detailValue}>
                    {task.dueDate
                      ? formatDateWithTime(task.dueDate)
                      : 'Sem prazo'}
                  </Text>
                  {dueStatus && (
                    <View
                      style={[
                        styles.dueStatusBadge,
                        { backgroundColor: `${dueStatus.color}20` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dueStatusText,
                          { color: dueStatus.color },
                        ]}
                      >
                        {dueStatus.text}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {task.completedAt && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#4CAF50"
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Concluída em</Text>
                  <Text style={styles.detailValue}>
                    {formatDateWithTime(task.completedAt)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <FontAwesome5 name="tag" size={18} color="#7B68EE" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Categoria</Text>
                <Text style={styles.detailValue}>
                  {task.category || 'Sem categoria'}
                </Text>
              </View>
            </View>
          </View>

          {/* Responsáveis */}
          <TaskAssignedUsersCard
            assignedUsers={task.assignedUsers}
            currentUserId={user?.uid}
          />

          {/* Ações Administrativas (Exclusão) */}
          {canModifyTask && (
            <ConfirmDeleteModal
              title="Ações Administrativas"
              deleteLabel="Excluir tarefa"
              showConfirm={showConfirmDelete}
              loading={isDeleting}
              onPressDelete={handleDeleteTask}
              onCancelConfirm={handleCancelDelete}
            />
          )}
        </Animated.View>
      </Animated.ScrollView>

      {canModifyTask && !isDeleting && !showConfirmDelete && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/(panel)/tasks/edit?id=${task.id}`)}
        >
          <Feather name="edit-2" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#222',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: 'rgba(123, 104, 238, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#7B68EE',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(34, 34, 34, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerActionButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#222',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(123, 104, 238, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.3)',
    marginLeft: 8,
  },
  userAssignmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7B68EE',
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  userAssignmentText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  taskContainer: {
    backgroundColor: '#333',
    borderRadius: 16,
    margin: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  taskStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  pendingBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
  },
  pendingText: {
    color: '#FFC107',
  },
  inProgressBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
  },
  inProgressText: {
    color: '#2196F3',
  },
  completedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  completedText: {
    color: '#4CAF50',
  },
  overdueBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  overdueText: {
    color: '#F44336',
  },
  cancelledBadge: {
    backgroundColor: 'rgba(158, 158, 158, 0.2)',
  },
  cancelledText: {
    color: '#9E9E9E',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  taskUpdatedTime: {
    color: '#aaa',
    fontSize: 12,
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  recurringIndicator: {
    color: '#4CAF50',
  },
  republicRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  republicText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 6,
  },
  descriptionContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#444',
    borderRadius: 12,
  },
  descriptionLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
  },
  descriptionText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  sectionContainer: {
    marginTop: 20,
    backgroundColor: '#444',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7B68EE',
  },
  detailRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },
  detailIcon: {
    width: 35,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 4,
  },
  detailValue: {
    color: '#fff',
    fontSize: 16,
  },
  dueDateContainer: {
    flexDirection: 'column',
  },
  dueStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  dueStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  editButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7B68EE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7B68EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});

export default TaskDetailsScreen;
