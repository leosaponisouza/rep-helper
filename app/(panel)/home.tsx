import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Circle,
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import NotificationBadge from '../../components/notifications/NotificationBadge';
import NotificationCenter from '../../components/notifications/NotificationCenter';
import { useAuth } from '../../src/context/AuthContext';
import {
  AppText,
  Avatar,
  Button,
  Divider,
  IconButton,
  ListRow,
  Screen,
  Skeleton,
  StateView,
  StatusText,
  Surface,
  useFeedback,
  useMotion,
  useTheme,
  type StatusTone,
} from '../../src/design-system';
import { useHome } from '../../src/hooks/useHome';
import { useNotifications } from '../../src/hooks/useNotifications';
import { Task, TaskStatus } from '../../src/models/task.model';
import * as republicService from '../../src/services/republicService';
import * as taskService from '../../src/services/taskService';
import { formatCurrencyBRL } from '../../src/utils/currencyUtils';
import {
  formatLocalDate,
  formatTime,
  parseISOPreservingTime,
} from '../../src/utils/dateUtils';
import { ErrorHandler } from '../../src/utils/errorHandling';
import { getDisplayName } from '../../src/utils/userUtils';

const navigateWithTimeout = (mainRoute: string, detailRoute?: string) => {
  router.push(mainRoute as any);

  if (detailRoute) {
    setTimeout(() => {
      router.push(detailRoute as any);
    }, 100);
  }
};

const TASK_STATUS_DISPLAY: Record<TaskStatus, { label: string; tone: StatusTone }> = {
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

const HomeScreen = () => {
  const { theme } = useTheme();
  const { reduceMotion } = useMotion();
  const { toast } = useFeedback();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [republicName, setRepublicName] = useState<string | null>(null);
  const [completingTaskIds, setCompletingTaskIds] = useState<number[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const {
    userTasks,
    loadingTasks,
    tasksError,
    upcomingEvents,
    loadingEvents,
    eventsError,
    financialSummary,
    loadingFinances,
    financesError,
    refreshData: refreshHomeData,
    refreshTasks,
    refreshEvents,
    refreshFinances,
  } = useHome();

  const { fetchNotifications, unreadCount } = useNotifications();

  useEffect(() => {
    let isActive = true;
    const republicId = user?.currentRepublicId;

    if (!republicId) {
      setRepublicName(null);
      return;
    }

    republicService
      .getRepublic(republicId)
      .then((republic) => {
        if (isActive && republic?.name) {
          setRepublicName(republic.name);
        }
      })
      .catch(() => {
        if (isActive) {
          setRepublicName(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [user?.currentRepublicId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshHomeData(), fetchNotifications()]);
    } catch (error) {
      console.error('Erro ao atualizar dados da home:', error);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [refreshHomeData, fetchNotifications]);

  const handleTaskPress = useCallback((taskId: number) => {
    navigateWithTimeout('/(panel)/tasks', `/(panel)/tasks/${taskId}`);
  }, []);

  const toggleNotifications = useCallback(() => {
    setShowNotifications((prev) => !prev);
  }, []);

  const handleCloseNotifications = useCallback(() => {
    setShowNotifications(false);
    void fetchNotifications();
  }, [fetchNotifications]);

  const handleToggleStatus = useCallback(
    async (task: Task): Promise<void> => {
      if (!task?.id || completingTaskIds.includes(task.id)) {
        return;
      }

      setCompletingTaskIds((prev) => [...prev, task.id]);
      try {
        await taskService.completeTask(task.id);
        triggerSuccessHaptic();
        toast({
          title: 'Tarefa concluída',
          message: task.title,
          tone: 'success',
        });
        await refreshTasks();
      } catch (error) {
        void ErrorHandler.handle(error);
      } finally {
        if (isMountedRef.current) {
          setCompletingTaskIds((prev) => prev.filter((id) => id !== task.id));
        }
      }
    },
    [completingTaskIds, refreshTasks, toast]
  );

  const filteredEvents = useMemo(() => {
    if (!upcomingEvents) return [];
    const now = new Date();
    return upcomingEvents
      .filter((event) => {
        if (!event.startDate) return false;
        try {
          return parseISOPreservingTime(event.startDate) > now;
        } catch {
          return false;
        }
      })
      .sort(
        (a, b) =>
          parseISOPreservingTime(a.startDate).getTime() -
          parseISOPreservingTime(b.startDate).getTime()
      );
  }, [upcomingEvents]);

  const displayName = getDisplayName(user);
  const firstName = getDisplayName(user, true);
  const todayLabel = formatLocalDate(new Date(), "EEEE, d 'de' MMM");
  const headerTitle = republicName || (firstName ? `Olá, ${firstName}` : 'RepHelper');
  const headerSubtitle = republicName && displayName
    ? `Bem-vindo, ${displayName}`
    : 'Resumo da sua república';

  const hasPositiveBalance = (financialSummary?.currentBalance ?? 0) >= 0;

  return (
    <View style={styles.root}>
      <Screen
        scroll
        width="wide"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
        contentContainerStyle={{
          gap: theme.spacing.lg,
          paddingBottom: 96,
        }}
      >
        {/* Cabeçalho editorial */}
        <View style={[styles.editorialHeader, { gap: theme.spacing.sm }]}>
          <View style={styles.headerTextBlock}>
            <AppText variant="monoLabel" color="inkMuted" numberOfLines={1}>
              {todayLabel}
            </AppText>
            <AppText variant="display" color="ink" numberOfLines={2}>
              {headerTitle}
            </AppText>
            <AppText variant="caption" color="inkSecondary" numberOfLines={1}>
              {headerSubtitle}
            </AppText>
          </View>

          <View style={[styles.headerActions, { gap: theme.spacing.xs }]}>
            <View style={styles.notificationWrapper}>
              <IconButton
                icon={<Bell size={20} strokeWidth={1.75} color={theme.colors.ink} />}
                onPress={toggleNotifications}
                accessibilityLabel={
                  unreadCount > 0
                    ? `Notificações, ${unreadCount} não ${unreadCount === 1 ? 'lida' : 'lidas'}`
                    : 'Notificações'
                }
                variant="subtle"
              />
              <NotificationBadge count={unreadCount} size="small" />
            </View>

            <Pressable
              onPress={() => navigateWithTimeout('/(panel)/settings', '/(panel)/settings/account')}
              accessibilityRole="button"
              accessibilityLabel="Abrir perfil da conta"
              style={({ pressed }) => [
                styles.avatarButton,
                {
                  borderRadius: theme.radius.full,
                  opacity: pressed ? (reduceMotion ? 0.9 : theme.motion.pressOpacity) : 1,
                },
              ]}
            >
              <Avatar
                uri={user?.profilePictureUrl}
                name={displayName}
                size="md"
              />
            </Pressable>
          </View>
        </View>

        {/* Indicadores rápidos */}
        <View style={[styles.metricsRow, { gap: theme.spacing.sm }]}>
          <Pressable
            onPress={() => navigateWithTimeout('/(panel)/tasks')}
            accessibilityRole="button"
            accessibilityLabel={`Ver ${userTasks?.length || 0} tarefas pendentes`}
            style={({ pressed }) => [
              styles.metricTouchable,
              { opacity: pressed ? theme.motion.pressOpacity : 1 },
            ]}
          >
            <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.xs }}>
              <View style={styles.metricTopRow}>
                <AppText variant="monoLabel" color="inkSecondary">
                  Tarefas
                </AppText>
                <CheckSquare size={18} strokeWidth={1.75} color={theme.colors.accent} />
              </View>
              <AppText variant="monoHero" color="ink">
                {userTasks?.length || 0}
              </AppText>
              <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                Pendentes para você
              </AppText>
            </Surface>
          </Pressable>

          <Pressable
            onPress={() => navigateWithTimeout('/(panel)/events')}
            accessibilityRole="button"
            accessibilityLabel={`Ver ${filteredEvents.length} próximos eventos`}
            style={({ pressed }) => [
              styles.metricTouchable,
              { opacity: pressed ? theme.motion.pressOpacity : 1 },
            ]}
          >
            <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.xs }}>
              <View style={styles.metricTopRow}>
                <AppText variant="monoLabel" color="inkSecondary">
                  Agenda
                </AppText>
                <Calendar size={18} strokeWidth={1.75} color={theme.colors.accent} />
              </View>
              <AppText variant="monoHero" color="ink">
                {filteredEvents.length}
              </AppText>
              <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                Próximos eventos
              </AppText>
            </Surface>
          </Pressable>
        </View>

        {/* Resumo Financeiro */}
        <View style={{ gap: theme.spacing.xs }}>
          <View style={styles.sectionHeaderRow}>
            <AppText variant="monoLabel" color="inkSecondary">
              Resumo financeiro
            </AppText>
            <Button
              label="Ver detalhes"
              variant="ghost"
              size="sm"
              onPress={() => navigateWithTimeout('/(panel)/finances')}
            />
          </View>

          <Surface tone="surface" bordered padded="md" style={{ gap: theme.spacing.sm }}>
            {loadingFinances && !financialSummary ? (
              <View style={{ gap: theme.spacing.sm }}>
                <Skeleton width="40%" height={14} />
                <Skeleton width="65%" height={32} />
                <Divider />
                <Skeleton width="100%" height={20} />
                <Skeleton width="100%" height={20} />
              </View>
            ) : financesError && !financialSummary ? (
              <StateView
                kind="error"
                title="Não foi possível carregar o resumo"
                description={financesError}
                actionLabel="Tentar novamente"
                onAction={() => void refreshFinances()}
              />
            ) : financialSummary ? (
              <>
                <View style={styles.balanceHeader}>
                  <View style={{ gap: theme.spacing.xxs, flex: 1 }}>
                    <AppText variant="monoLabel" color="inkMuted">
                      Saldo atual
                    </AppText>
                    <AppText
                      variant="monoHero"
                      color={hasPositiveBalance ? 'ink' : 'danger'}
                    >
                      {formatCurrencyBRL(financialSummary.currentBalance)}
                    </AppText>
                  </View>
                  <StatusText
                    label={hasPositiveBalance ? 'Em dia' : 'Negativo'}
                    tone={hasPositiveBalance ? 'success' : 'danger'}
                    showDot
                  />
                </View>

                <Divider />

                <View style={styles.financeRow}>
                  <View style={[styles.financeLabelGroup, { gap: theme.spacing.xs }]}>
                    <ArrowUpRight size={18} strokeWidth={1.75} color={theme.colors.danger} />
                    <AppText variant="body" color="inkSecondary">
                      Despesas do mês
                    </AppText>
                  </View>
                  <AppText variant="monoValue" color="danger">
                    {formatCurrencyBRL(financialSummary.totalExpensesCurrentMonth || 0)}
                  </AppText>
                </View>

                <Divider />

                <View style={styles.financeRow}>
                  <View style={[styles.financeLabelGroup, { gap: theme.spacing.xs }]}>
                    <ArrowDownLeft size={18} strokeWidth={1.75} color={theme.colors.success} />
                    <AppText variant="body" color="inkSecondary">
                      Receitas do mês
                    </AppText>
                  </View>
                  <AppText variant="monoValue" color="success">
                    {formatCurrencyBRL(financialSummary.totalIncomesCurrentMonth || 0)}
                  </AppText>
                </View>
              </>
            ) : (
              <StateView
                kind="empty"
                title="Sem dados financeiros"
                description="Ainda não há lançamentos financeiros para exibir."
              />
            )}
          </Surface>
        </View>

        {/* Minhas Tarefas */}
        <View style={{ gap: theme.spacing.xs }}>
          <View style={styles.sectionHeaderRow}>
            <AppText variant="monoLabel" color="inkSecondary">
              Minhas tarefas
            </AppText>
            <Button
              label="Ver todas"
              variant="ghost"
              size="sm"
              onPress={() => navigateWithTimeout('/(panel)/tasks')}
            />
          </View>

          <Surface tone="surface" bordered style={styles.listSurface}>
            {loadingTasks && userTasks.length === 0 ? (
              <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
                <Skeleton width="75%" height={18} />
                <Skeleton width="45%" height={14} />
                <Divider />
                <Skeleton width="65%" height={18} />
                <Skeleton width="50%" height={14} />
              </View>
            ) : tasksError && userTasks.length === 0 ? (
              <StateView
                kind="error"
                title="Não foi possível carregar as tarefas"
                description={tasksError}
                actionLabel="Tentar novamente"
                onAction={() => void refreshTasks()}
              />
            ) : userTasks && userTasks.length > 0 ? (
              userTasks.map((task, index) => {
                const statusInfo = TASK_STATUS_DISPLAY[task.status] ?? {
                  label: 'Pendente',
                  tone: 'neutral' as StatusTone,
                };
                const isCompleting = completingTaskIds.includes(task.id);
                const formattedDue = task.dueDate
                  ? formatLocalDate(parseISOPreservingTime(task.dueDate), "d 'de' MMM")
                  : null;
                const subtitleParts = [
                  formattedDue ? `Vence em ${formattedDue}` : null,
                  task.category || null,
                ].filter(Boolean);

                return (
                  <View key={`task-${task.id}`}>
                    <View style={[styles.taskRow, { paddingLeft: theme.spacing.xs }]}>
                      <IconButton
                        icon={
                          isCompleting ? (
                            <CheckCircle2
                              size={20}
                              strokeWidth={1.75}
                              color={theme.colors.success}
                            />
                          ) : (
                            <Circle
                              size={20}
                              strokeWidth={1.75}
                              color={theme.colors.borderStrong}
                            />
                          )
                        }
                        onPress={() => void handleToggleStatus(task)}
                        disabled={isCompleting}
                        accessibilityLabel={`Concluir tarefa ${task.title}`}
                        variant="ghost"
                      />

                      <View style={styles.taskListRow}>
                        <ListRow
                          title={task.title || 'Tarefa sem título'}
                          subtitle={subtitleParts.join(' · ') || 'Sem prazo definido'}
                          style={{ paddingLeft: theme.spacing.xxs }}
                          onPress={() => handleTaskPress(task.id)}
                          trailing={
                            <StatusText
                              label={statusInfo.label}
                              tone={statusInfo.tone}
                              showDot
                            />
                          }
                        />
                      </View>
                    </View>
                    {index < userTasks.length - 1 ? <Divider /> : null}
                  </View>
                );
              })
            ) : (
              <StateView
                kind="empty"
                title="Você não tem tarefas pendentes"
                description="Quando houver tarefas atribuídas a você, elas aparecerão aqui."
                actionLabel="Nova Tarefa"
                onAction={() =>
                  navigateWithTimeout('/(panel)/tasks', '/(panel)/tasks/create')
                }
              />
            )}
          </Surface>
        </View>

        {/* Próximos Eventos */}
        <View style={{ gap: theme.spacing.xs }}>
          <View style={styles.sectionHeaderRow}>
            <AppText variant="monoLabel" color="inkSecondary">
              Agenda
            </AppText>
            <Button
              label="Ver todos"
              variant="ghost"
              size="sm"
              onPress={() => navigateWithTimeout('/(panel)/events')}
            />
          </View>

          <Surface tone="surface" bordered style={styles.listSurface}>
            {loadingEvents && upcomingEvents.length === 0 ? (
              <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
                <Skeleton width="70%" height={18} />
                <Skeleton width="40%" height={14} />
                <Divider />
                <Skeleton width="60%" height={18} />
                <Skeleton width="45%" height={14} />
              </View>
            ) : eventsError && upcomingEvents.length === 0 ? (
              <StateView
                kind="error"
                title="Não foi possível carregar os eventos"
                description={eventsError}
                actionLabel="Tentar novamente"
                onAction={() => void refreshEvents()}
              />
            ) : filteredEvents.length > 0 ? (
              filteredEvents.map((event, index) => {
                const eventDate = parseISOPreservingTime(event.startDate);
                const eventTime = formatTime(eventDate);
                const subtitle = event.location
                  ? `${eventTime} · ${event.location}`
                  : eventTime;

                return (
                  <ListRow
                    key={`event-${event.id}`}
                    title={event.title}
                    subtitle={subtitle}
                    showDivider={index < filteredEvents.length - 1}
                    onPress={() =>
                      navigateWithTimeout('/(panel)/events', `/(panel)/events/${event.id}`)
                    }
                    leading={
                      <Surface
                        tone="subtle"
                        radiusKey="sm"
                        style={[styles.eventDateBadge, { paddingVertical: theme.spacing.xxs }]}
                      >
                        <AppText variant="monoValue" color="accent">
                          {String(eventDate.getDate()).padStart(2, '0')}
                        </AppText>
                        <AppText variant="monoLabel" color="inkSecondary">
                          {formatLocalDate(eventDate, 'MMM')}
                        </AppText>
                      </Surface>
                    }
                    trailing={
                      <ChevronRight
                        size={18}
                        strokeWidth={1.75}
                        color={theme.colors.inkMuted}
                      />
                    }
                  />
                );
              })
            ) : (
              <StateView
                kind="empty"
                title="Não há eventos programados"
                description="Agende um novo encontro ou compromisso da república."
                actionLabel="Novo Evento"
                onAction={() =>
                  navigateWithTimeout('/(panel)/events', '/(panel)/events/create')
                }
              />
            )}
          </Surface>
        </View>
      </Screen>

      <NotificationCenter
        visible={showNotifications}
        onClose={handleCloseNotifications}
      />

      <Pressable
        onPress={() => navigateWithTimeout('/(panel)/quick-actions')}
        accessibilityRole="button"
        accessibilityLabel="Abrir ações rápidas"
        style={({ pressed }) => [
          styles.fab,
          theme.elevation.floating,
          {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.full,
            bottom: theme.spacing.md,
            right: theme.spacing.md,
            opacity: pressed ? theme.motion.pressOpacity : 1,
            transform:
              pressed && !reduceMotion ? [{ scale: theme.motion.pressScale }] : undefined,
          },
        ]}
      >
        <Plus size={24} strokeWidth={2} color={theme.colors.onAccent} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  editorialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextBlock: {
    flex: 1,
    gap: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationWrapper: {
    position: 'relative',
  },
  avatarButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
  },
  metricTouchable: {
    flex: 1,
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  financeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  financeLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listSurface: {
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskListRow: {
    flex: 1,
    minWidth: 0,
  },
  eventDateBadge: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    minWidth: 56,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;
