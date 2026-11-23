// app/(panel)/tasks/[id].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Share, StyleSheet, View } from 'react-native';
import { differenceInMinutes, isToday, isTomorrow, isValid } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Home,
  Repeat,
  Share2,
  Tag,
  User,
} from 'lucide-react-native';
import { TaskActionButtons } from '../../../components/tasks/TaskDetails/TaskActionButtons';
import { TaskAssignedUsersCard } from '../../../components/tasks/TaskDetails/TaskAssignedUsersCard';
import { TaskRecurrenceCard } from '../../../components/tasks/TaskDetails/TaskRecurrenceCard';
import { useAuth } from '../../../src/context/AuthContext';
import {
  AppText,
  ConfirmSection,
  IconButton,
  ListRow,
  Screen,
  ScreenHeader,
  StateView,
  StatusText,
  Surface,
  useFeedback,
  useMotion,
  useTheme,
  type StatusTone,
} from '../../../src/design-system';
import { useTasks } from '../../../src/hooks/useTasks';
import { Task, TaskStatus } from '../../../src/models/task.model';
import {
  formatLocalDate,
  formatTime,
  parseISOPreservingTime,
} from '../../../src/utils/dateUtils';
import { ErrorHandler } from '../../../src/utils/errorHandling';
import { logger } from '../../../src/utils/logger';
import { getRecurrencePatternLabel } from '../../../src/validation/taskSchemas';

const TASK_STATUS_MAP: Record<TaskStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'Pendente', tone: 'warning' },
  IN_PROGRESS: { label: 'Em andamento', tone: 'accent' },
  COMPLETED: { label: 'Concluída', tone: 'success' },
  OVERDUE: { label: 'Atrasada', tone: 'danger' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
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

const TaskDetailsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const motion = useMotion();
  const { toast } = useFeedback();
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadedTaskId = task?.id;

  useEffect(() => {
    if (!loadedTaskId) return;
    if (!motion.shouldAnimate) {
      fadeAnim.setValue(1);
      return;
    }

    fadeAnim.setValue(0);
    const animation = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: motion.duration(theme.motion.duration.normal, { allowReducedFade: true }),
      easing: theme.motion.easing.standard,
      useNativeDriver: motion.useNativeDriver,
    });
    animation.start();

    return () => {
      animation.stop();
    };
  }, [loadedTaskId, fadeAnim, motion, theme.motion.duration.normal, theme.motion.easing.standard]);

  const loadTaskDetails = useCallback(async () => {
    if (!id) {
      setError('Identificador da tarefa não informado.');
      setLoading(false);
      return;
    }

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
      void ErrorHandler.handle(err);
      setError('Não foi possível carregar os detalhes da tarefa');
    } finally {
      setLoading(false);
    }
  }, [id, getTaskById]);

  useEffect(() => {
    void loadTaskDetails();
  }, [loadTaskDetails]);

  const isCreator = task?.createdBy?.uid === user?.uid;
  const isAssignedToCurrentUser = useMemo(() => {
    if (!task || !user) return false;
    return task.assignedUsers?.some((u) => u.uid === user.uid) || false;
  }, [task, user]);

  const canChangeStatus = Boolean(isCreator || isAssignedToCurrentUser);
  const isUserAdmin = user?.isAdmin === true;
  const canModifyTask = Boolean(isAssignedToCurrentUser || isUserAdmin || isCreator);
  const canDeleteTask = Boolean(isCreator || isUserAdmin);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(panel)/tasks');
    }
  }, [router]);

  const formatTaskDate = useCallback((dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = parseISOPreservingTime(dateString);
      if (!isValid(date)) return dateString;

      if (isToday(date)) {
        return `Hoje, ${formatTime(date)}`;
      }
      if (isTomorrow(date)) {
        return `Amanhã, ${formatTime(date)}`;
      }
      return formatLocalDate(date, "EEEE, dd 'de' MMMM 'às' HH:mm");
    } catch {
      return dateString;
    }
  }, []);

  const getTimeAgo = useCallback((dateString?: string | null): string => {
    if (!dateString) return '';
    try {
      const date = parseISOPreservingTime(dateString);
      if (!isValid(date)) return '';
      const diffMinutes = differenceInMinutes(new Date(), date);

      if (diffMinutes < 1) return 'agora mesmo';
      if (diffMinutes < 60) return `há ${diffMinutes} min`;
      if (diffMinutes < 120) return 'há 1 hora';
      if (diffMinutes < 1440) return `há ${Math.floor(diffMinutes / 60)} horas`;
      if (diffMinutes < 2880) return 'há 1 dia';

      return formatLocalDate(date, "dd 'de' MMM");
    } catch {
      return '';
    }
  }, []);

  const formatDateWithTime = useCallback((dateString?: string | null) => {
    if (!dateString) return '--';
    return (
      formatLocalDate(dateString, "dd 'de' MMM 'de' yyyy 'às' HH:mm") || dateString
    );
  }, []);

  const isTaskCompleted = task?.status === 'COMPLETED';
  const isTaskCancelled = task?.status === 'CANCELLED';

  const handleToggleStatus = async () => {
    if (!task || !canChangeStatus) {
      toast({
        title: 'Acesso negado',
        message: 'Apenas o criador da tarefa ou os usuários responsáveis podem alterar seu status.',
        tone: 'warning',
      });
      return;
    }

    try {
      setIsStatusChanging(true);
      if (task.status === 'IN_PROGRESS') {
        await completeTask(task.id);
        triggerSuccessHaptic();
        toast({
          title: 'Tarefa concluída',
          message: task.title,
          tone: 'success',
        });
      } else if (task.status === 'PENDING' || task.status === 'OVERDUE') {
        await updateTask(task.id, { status: 'IN_PROGRESS' });
        toast({
          title: 'Tarefa iniciada',
          message: task.title,
          tone: 'info',
        });
      }
      await loadTaskDetails();
    } catch (err) {
      logger.error('Error toggling task status:', err);
    } finally {
      setIsStatusChanging(false);
    }
  };

  const handleCancelTask = async () => {
    if (!task || !canChangeStatus) {
      toast({
        title: 'Acesso negado',
        message: 'Apenas o criador da tarefa ou os usuários responsáveis podem cancelá-la.',
        tone: 'warning',
      });
      return;
    }

    try {
      setIsCancelling(true);
      await cancelTask(task.id);
      toast({
        title: 'Tarefa cancelada',
        message: task.title,
        tone: 'info',
      });
      await loadTaskDetails();
    } catch (err) {
      logger.error('Error cancelling task:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleStopRecurrence = async () => {
    if (!task || !canChangeStatus) {
      toast({
        title: 'Acesso negado',
        message: 'Apenas o criador da tarefa ou os usuários responsáveis podem parar a recorrência.',
        tone: 'warning',
      });
      return;
    }

    try {
      setIsStoppingRecurrence(true);
      await stopRecurrence(task.id);
      toast({
        title: 'Recorrência interrompida',
        message: 'Não serão geradas novas instâncias automáticas.',
        tone: 'info',
      });
      await loadTaskDetails();
    } catch (err) {
      logger.error('Error stopping task recurrence:', err);
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
      toast({
        title: 'Acesso negado',
        message: 'Apenas o criador da tarefa ou administradores podem excluí-la.',
        tone: 'warning',
      });
      return;
    }

    if (!showConfirmDelete) {
      setShowConfirmDelete(true);
      return;
    }

    try {
      setIsDeleting(true);
      await deleteTask(task.id);
      triggerSuccessHaptic();
      toast({
        title: 'Tarefa excluída',
        message: 'A tarefa foi removida permanentemente.',
        tone: 'success',
      });
      router.back();
    } catch (err) {
      logger.error('Error deleting task:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = useCallback(() => {
    setShowConfirmDelete(false);
  }, []);

  const handleShareTask = useCallback(async () => {
    if (!task) return;

    const statusInfo = TASK_STATUS_MAP[task.status] ?? {
      label: task.status,
      tone: 'neutral' as StatusTone,
    };

    let message =
      `Tarefa: ${task.title}\n` +
      `Status: ${statusInfo.label}\n` +
      (task.dueDate ? `Prazo: ${formatTaskDate(task.dueDate)}\n` : '');

    if (task.recurring) {
      const pattern = getRecurrencePatternLabel(
        true,
        task.recurrenceType || 'WEEKLY',
        task.recurrenceInterval || 1
      );
      message += `Recorrência: ${pattern}\n`;
    }

    if (task.description) {
      message += `\n${task.description}`;
    }

    try {
      if (
        Platform.OS === 'web' &&
        typeof navigator !== 'undefined' &&
        !navigator.share &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(message);
        toast({
          title: 'Resumo copiado',
          message: 'Os detalhes da tarefa foram copiados para a área de transferência.',
          tone: 'success',
        });
        return;
      }

      await Share.share({
        message,
        title: task.title,
      });
    } catch (err) {
      logger.error('Error sharing task:', err);
      toast({
        title: 'Erro',
        message: 'Não foi possível compartilhar a tarefa.',
        tone: 'danger',
      });
    }
  }, [task, formatTaskDate, toast]);

  const dueStatus = useMemo((): { text: string; tone: StatusTone } | null => {
    if (!task || !task.dueDate) return null;

    const dueDate = parseISOPreservingTime(task.dueDate);
    if (!isValid(dueDate)) return null;
    const now = new Date();

    if (isTaskCompleted) {
      if (task.completedAt) {
        const completedAt = parseISOPreservingTime(task.completedAt);
        if (isValid(completedAt)) {
          return completedAt <= dueDate
            ? { text: 'Concluída dentro do prazo', tone: 'success' }
            : { text: 'Concluída com atraso', tone: 'warning' };
        }
      }
      return { text: 'Concluída', tone: 'success' };
    }

    if (isTaskCancelled) {
      return { text: 'Cancelada', tone: 'neutral' };
    }

    if (dueDate < now && !isToday(dueDate)) {
      return { text: 'Atrasada', tone: 'danger' };
    }

    if (isToday(dueDate)) {
      return dueDate < now
        ? { text: 'Atrasada (hoje)', tone: 'danger' }
        : { text: 'Vence hoje', tone: 'warning' };
    }

    if (isTomorrow(dueDate)) {
      return { text: 'Vence amanhã', tone: 'warning' };
    }

    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      text: `Vence em ${diffDays} dias`,
      tone: diffDays <= 3 ? 'warning' : 'success',
    };
  }, [task, isTaskCompleted, isTaskCancelled]);

  const baseHeader = (
    <ScreenHeader title="Detalhes da Tarefa" onBack={handleBack} />
  );

  if (loading && !task) {
    return (
      <Screen header={baseHeader}>
        <StateView kind="loading" title="Carregando detalhes da tarefa..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen header={baseHeader}>
        <StateView
          kind="error"
          title="Não foi possível carregar"
          description={error}
          actionLabel="Tentar novamente"
          onAction={() => void loadTaskDetails()}
        />
      </Screen>
    );
  }

  if (!task) {
    return (
      <Screen header={baseHeader}>
        <StateView
          kind="empty"
          title="Tarefa não encontrada"
          description="A tarefa solicitada não foi encontrada ou foi excluída."
          actionLabel="Voltar para Tarefas"
          onAction={() => router.replace('/(panel)/tasks')}
        />
      </Screen>
    );
  }

  const statusInfo = TASK_STATUS_MAP[task.status] ?? {
    label: task.status,
    tone: 'neutral' as StatusTone,
  };
  const updatedTimeLabel = getTimeAgo(task.updatedAt || task.updated_at);
  const republicDisplayId = task.republicId || task.republic_id;

  const header = (
    <ScreenHeader
      title="Detalhes da Tarefa"
      variant="compact"
      onBack={handleBack}
      rightActions={
        <>
          <IconButton
            icon={<Share2 size={20} strokeWidth={1.75} color={theme.colors.ink} />}
            onPress={() => void handleShareTask()}
            accessibilityLabel="Compartilhar tarefa"
            variant="ghost"
          />
          {canModifyTask ? (
            <IconButton
              icon={<Edit2 size={20} strokeWidth={1.75} color={theme.colors.accent} />}
              onPress={() => router.push(`/(panel)/tasks/edit?id=${task.id}`)}
              accessibilityLabel="Editar tarefa"
              variant="ghost"
            />
          ) : null}
        </>
      }
    />
  );

  return (
    <Screen
      scroll
      header={header}
      contentContainerStyle={{
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xxl,
      }}
    >
      <Animated.View style={{ opacity: fadeAnim, gap: theme.spacing.md }}>
        {isAssignedToCurrentUser ? (
          <Surface
            tone="subtle"
            bordered
            padded="sm"
            radiusKey="md"
            style={[styles.assignedBanner, { gap: theme.spacing.xs }]}
          >
            <User size={16} strokeWidth={1.75} color={theme.colors.accent} />
            <AppText variant="caption" color="accent" style={styles.bannerText}>
              Você está atribuído a esta tarefa
            </AppText>
          </Surface>
        ) : null}

        <Surface
          tone="surface"
          bordered
          padded="md"
          radiusKey="md"
          style={{ gap: theme.spacing.sm }}
        >
          <View style={[styles.statusHeaderRow, { gap: theme.spacing.xs }]}>
            <StatusText label={statusInfo.label} tone={statusInfo.tone} showDot />
            {updatedTimeLabel ? (
              <AppText variant="caption" color="inkMuted">
                Atualizada {updatedTimeLabel}
              </AppText>
            ) : null}
          </View>

          <AppText variant="title" color="ink" strikethrough={isTaskCompleted}>
            {task.title}
          </AppText>

          {task.recurring || republicDisplayId ? (
            <View style={[styles.metaRow, { gap: theme.spacing.md }]}>
              {task.recurring ? (
                <StatusText
                  label="Recorrente"
                  tone="success"
                  icon={<Repeat size={14} strokeWidth={1.75} color={theme.colors.success} />}
                />
              ) : null}

              {republicDisplayId ? (
                <View style={[styles.inlineMeta, { gap: theme.spacing.xxs }]}>
                  <Home size={14} strokeWidth={1.75} color={theme.colors.inkMuted} />
                  <AppText variant="caption" color="inkSecondary">
                    República ID: {republicDisplayId}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}

          <TaskActionButtons
            status={task.status}
            canModifyTask={canModifyTask}
            canChangeStatus={canChangeStatus}
            isStatusChanging={isStatusChanging}
            isCancelling={isCancelling}
            onToggleStatus={() => void handleToggleStatus()}
            onCancelTask={() => void handleCancelTask()}
          />
        </Surface>

        <Surface
          tone="surface"
          bordered
          padded="md"
          radiusKey="md"
          style={{ gap: theme.spacing.xs }}
        >
          <AppText variant="monoLabel" color="inkSecondary">
            Descrição
          </AppText>
          <AppText variant="body" color={task.description ? 'ink' : 'inkMuted'}>
            {task.description || 'Nenhuma descrição fornecida.'}
          </AppText>
        </Surface>

        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="monoLabel" color="inkSecondary">
            Detalhes
          </AppText>

          <Surface tone="surface" bordered style={styles.detailsSurface}>
            <ListRow
              title={formatDateWithTime(task.createdAt || task.created_at)}
              subtitle="Data de criação"
              showDivider
              leading={
                <Calendar size={18} strokeWidth={1.75} color={theme.colors.accent} />
              }
            />

            <ListRow
              title={
                task.createdBy?.nickname || task.createdBy?.name || 'Desconhecido'
              }
              subtitle="Criado por"
              showDivider
              leading={<User size={18} strokeWidth={1.75} color={theme.colors.accent} />}
            />

            <ListRow
              title={task.dueDate ? formatDateWithTime(task.dueDate) : 'Sem prazo'}
              subtitle="Prazo"
              showDivider
              leading={<Clock size={18} strokeWidth={1.75} color={theme.colors.accent} />}
              trailing={
                dueStatus ? (
                  <StatusText label={dueStatus.text} tone={dueStatus.tone} showDot />
                ) : undefined
              }
            />

            {task.completedAt ? (
              <ListRow
                title={formatDateWithTime(task.completedAt)}
                subtitle="Concluída em"
                showDivider
                leading={
                  <CheckCircle2
                    size={18}
                    strokeWidth={1.75}
                    color={theme.colors.success}
                  />
                }
              />
            ) : null}

            <ListRow
              title={task.category || 'Sem categoria'}
              subtitle="Categoria"
              leading={<Tag size={18} strokeWidth={1.75} color={theme.colors.accent} />}
            />
          </Surface>
        </View>

        <TaskRecurrenceCard
          task={task}
          canModifyTask={canModifyTask}
          isStoppingRecurrence={isStoppingRecurrence}
          formatDateWithTime={formatDateWithTime}
          onNavigateToParent={handleNavigateToParent}
          onStopRecurrence={() => void handleStopRecurrence()}
        />

        <TaskAssignedUsersCard
          assignedUsers={task.assignedUsers}
          currentUserId={user?.uid}
        />

        {canDeleteTask ? (
          <ConfirmSection
            title="Ações Administrativas"
            deleteLabel="Excluir tarefa"
            showConfirm={showConfirmDelete}
            loading={isDeleting}
            onPressDelete={() => void handleDeleteTask()}
            onCancelConfirm={handleCancelDelete}
          />
        ) : null}
      </Animated.View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  assignedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flexShrink: 1,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsSurface: {
    overflow: 'hidden',
  },
});

export default TaskDetailsScreen;
