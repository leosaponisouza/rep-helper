// app/(panel)/tasks/tasks-list.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { isValid } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckSquare, Plus } from 'lucide-react-native';
import TaskFilter, {
  type FilterOption,
  type TaskSortOption,
} from '../../../components/tasks/TaskFilter';
import TaskItem from '../../../components/tasks/TaskItem';
import { useAuth } from '../../../src/context/AuthContext';
import {
  Button,
  Divider,
  Screen,
  ScreenHeader,
  StateView,
  useFeedback,
  useTheme,
} from '../../../src/design-system';
import { useTasks } from '../../../src/hooks/useTasks';
import { Task } from '../../../src/models/task.model';
import { parseISOPreservingTime } from '../../../src/utils/dateUtils';
import { logger } from '../../../src/utils/logger';
import { COMMON_TASK_CATEGORIES } from '../../../src/validation/taskSchemas';

const TASK_FILTERS: FilterOption[] = [
  { key: 'my-tasks', label: 'Minhas Tarefas' },
  { key: 'all', label: 'Todas' },
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'IN_PROGRESS', label: 'Em Andamento' },
  { key: 'OVERDUE', label: 'Atrasadas' },
  { key: 'COMPLETED', label: 'Concluídas' },
  { key: 'created-by-me', label: 'Criadas por Mim' },
  { key: 'other-users', label: 'Outros Usuários' },
  { key: 'recurring', label: 'Recorrentes' },
];

function parseDateTimestamp(dateValue?: string | null): number | null {
  if (!dateValue) return null;
  const parsed = parseISOPreservingTime(dateValue);
  return isValid(parsed) ? parsed.getTime() : null;
}

const TasksListScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { toast } = useFeedback();
  const { filter: urlFilter } = useLocalSearchParams<{ filter?: string }>();
  const { user } = useAuth();

  const initialFilter = urlFilter || 'my-tasks';
  const [filter, setFilter] = useState<string>(initialFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<TaskSortOption>('dueDate_asc');
  const [pendingTaskIds, setPendingTaskIds] = useState<number[]>([]);

  const isMountedRef = useRef(true);
  const previousUrlFilterRef = useRef<string | undefined>(urlFilter);
  const taskOptionsRef = useRef({
    initialFilterStatus: initialFilter as any,
    pageSize: 20,
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const {
    tasks,
    allTasks,
    myTasks,
    loading,
    loadingMyTasks,
    error: tasksError,
    fetchTasks,
    fetchMyTasks,
    applyFilter,
    completeTask,
    updateTask,
    currentPage,
    isLastPage,
    loadMoreTasks,
  } = useTasks(taskOptionsRef.current);

  useEffect(() => {
    if (urlFilter && urlFilter !== previousUrlFilterRef.current) {
      previousUrlFilterRef.current = urlFilter;
      setFilter(urlFilter);
      applyFilter(urlFilter);
    }
  }, [urlFilter, applyFilter]);

  const handleFilterChange = useCallback(
    (newFilter: string) => {
      if (filter === newFilter) return;
      setFilter(newFilter);
      applyFilter(
        newFilter,
        selectedCategory ? { category: selectedCategory } : undefined
      );
    },
    [applyFilter, filter, selectedCategory]
  );

  const handleCategoryChange = useCallback(
    (nextCategory: string | null) => {
      setSelectedCategory(nextCategory);
      applyFilter(filter, nextCategory ? { category: nextCategory } : undefined);
    },
    [applyFilter, filter]
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSortOption('dueDate_asc');
    setFilter('my-tasks');
    applyFilter('my-tasks');
  }, [applyFilter]);

  const availableCategories = useMemo(() => {
    const categorySet = new Set<string>(COMMON_TASK_CATEGORIES);
    [...tasks, ...allTasks, ...myTasks].forEach((task) => {
      if (task.category && task.category.trim()) {
        categorySet.add(task.category.trim());
      }
    });
    return Array.from(categorySet);
  }, [tasks, allTasks, myTasks]);

  const displayTasks = useMemo((): Task[] => {
    const baseList = tasks ? [...tasks] : [];
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filtered = baseList.filter((task) => {
      if (selectedCategory && task.category !== selectedCategory) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const inTitle = task.title?.toLowerCase().includes(normalizedSearch);
      const inDescription = task.description?.toLowerCase().includes(normalizedSearch);
      const inCategory = task.category?.toLowerCase().includes(normalizedSearch);
      return Boolean(inTitle || inDescription || inCategory);
    });

    filtered.sort((a, b) => {
      if (sortOption === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '', 'pt-BR');
      }
      if (sortOption === 'createdAt_desc') {
        const aTime = parseDateTimestamp(a.createdAt || a.created_at) ?? 0;
        const bTime = parseDateTimestamp(b.createdAt || b.created_at) ?? 0;
        return bTime - aTime;
      }

      const aDue = parseDateTimestamp(a.dueDate);
      const bDue = parseDateTimestamp(b.dueDate);
      if (aDue === null && bDue === null) return 0;
      if (aDue === null) return 1;
      if (bDue === null) return -1;
      return sortOption === 'dueDate_asc' ? aDue - bDue : bDue - aDue;
    });

    return filtered;
  }, [tasks, searchQuery, selectedCategory, sortOption]);

  const isLoading = useMemo(
    () => (filter === 'my-tasks' ? loadingMyTasks : loading),
    [filter, loadingMyTasks, loading]
  );

  const refreshTasks = useCallback(() => {
    if (isLoading) return;
    if (filter === 'my-tasks') {
      void fetchMyTasks(true, 0);
    } else {
      void fetchTasks(true, 0);
    }
  }, [fetchMyTasks, fetchTasks, filter, isLoading]);

  const hasFocusedOnceRef = useRef(false);
  const refreshTasksRef = useRef(refreshTasks);
  refreshTasksRef.current = refreshTasks;

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      refreshTasksRef.current();
    }, [])
  );

  const handleToggleStatus = useCallback(
    async (task: Task) => {
      if (!task?.id || pendingTaskIds.includes(task.id)) {
        return;
      }

      setPendingTaskIds((prev) => [...prev, task.id]);
      try {
        if (task.status === 'IN_PROGRESS') {
          await completeTask(task.id);
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
      } catch (error) {
        logger.error('Error toggling task status:', error);
      } finally {
        if (isMountedRef.current) {
          setPendingTaskIds((prev) => prev.filter((id) => id !== task.id));
        }
      }
    },
    [pendingTaskIds, completeTask, updateTask, toast]
  );

  const handleNavigateToTask = useCallback(
    (taskId: number) => {
      router.push(`/(panel)/tasks/${taskId}`);
    },
    [router]
  );

  const renderTaskItem = useCallback(
    ({ item, index }: { item: Task; index: number }) => {
      const isFirst = index === 0;
      const isLast = index === displayTasks.length - 1;

      return (
        <View
          style={[
            styles.itemFrame,
            {
              borderColor: theme.colors.line,
              backgroundColor: theme.colors.surface,
              borderTopWidth: isFirst ? 1 : 0,
              borderBottomWidth: isLast ? 1 : 0,
              borderTopLeftRadius: isFirst ? theme.radius.md : 0,
              borderTopRightRadius: isFirst ? theme.radius.md : 0,
              borderBottomLeftRadius: isLast ? theme.radius.md : 0,
              borderBottomRightRadius: isLast ? theme.radius.md : 0,
            },
          ]}
        >
          <TaskItem
            item={item}
            onToggleStatus={handleToggleStatus}
            currentUserId={user?.uid}
            pendingTaskIds={pendingTaskIds}
            onPress={handleNavigateToTask}
            showDivider={!isLast}
          />
        </View>
      );
    },
    [
      displayTasks.length,
      theme.colors.line,
      theme.colors.surface,
      theme.radius.md,
      handleToggleStatus,
      user?.uid,
      pendingTaskIds,
      handleNavigateToTask,
    ]
  );

  const keyExtractor = useCallback((item: Task) => String(item.id), []);

  const hasActiveLocalFilter = Boolean(searchQuery.trim() || selectedCategory);

  const renderEmptyComponent = useCallback(() => {
    if (hasActiveLocalFilter) {
      return (
        <StateView
          kind="empty"
          icon={<CheckSquare size={32} strokeWidth={1.75} color={theme.colors.inkMuted} />}
          title="Nenhuma tarefa encontrada"
          description="Tente ajustar sua busca ou remover os filtros aplicados."
          actionLabel="Limpar filtros"
          onAction={handleResetFilters}
        />
      );
    }

    const emptyTitle =
      filter === 'my-tasks'
        ? 'Nenhuma tarefa atribuída a você'
        : filter === 'recurring'
          ? 'Nenhuma tarefa recorrente'
          : 'Nenhuma tarefa encontrada';

    const emptyDescription =
      filter === 'my-tasks'
        ? 'As tarefas atribuídas a você aparecerão aqui.'
        : filter === 'recurring'
          ? 'Crie tarefas recorrentes para visualizá-las aqui.'
          : 'Crie sua primeira tarefa para organizar as atividades da casa.';

    return (
      <StateView
        kind="empty"
        icon={<CheckSquare size={32} strokeWidth={1.75} color={theme.colors.inkMuted} />}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel="Nova Tarefa"
        onAction={() => router.push('/(panel)/tasks/create')}
      />
    );
  }, [
    hasActiveLocalFilter,
    theme.colors.inkMuted,
    handleResetFilters,
    filter,
    router,
  ]);

  const subtitle = useMemo(() => {
    if (isLoading && displayTasks.length === 0) return 'Carregando...';
    const count = displayTasks.length;
    return `${count} ${count === 1 ? 'tarefa' : 'tarefas'}`;
  }, [isLoading, displayTasks.length]);

  const header = (
    <ScreenHeader
      title="Tarefas"
      subtitle={subtitle}
      rightActions={
        <Button
          label="Nova"
          variant="primary"
          size="sm"
          leftIcon={<Plus size={16} strokeWidth={1.75} color={theme.colors.onAccent} />}
          onPress={() => router.push('/(panel)/tasks/create')}
        />
      }
    />
  );

  return (
    <Screen width="wide" padded={false} header={header}>
      <View
        style={{
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
        }}
      >
        <TaskFilter
          filters={TASK_FILTERS}
          activeFilter={filter}
          onFilterChange={handleFilterChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          categories={availableCategories}
          sortOption={sortOption}
          onSortChange={setSortOption}
          onResetFilters={handleResetFilters}
        />
      </View>

      <Divider />

      {isLoading && displayTasks.length === 0 ? (
        <StateView kind="loading" title="Carregando tarefas..." />
      ) : tasksError && filter !== 'my-tasks' && displayTasks.length === 0 ? (
        <StateView
          kind="error"
          title="Não foi possível carregar as tarefas"
          description={tasksError}
          actionLabel="Tentar novamente"
          onAction={refreshTasks}
        />
      ) : (
        <FlatList<Task>
          data={displayTasks}
          extraData={pendingTaskIds}
          keyExtractor={keyExtractor}
          renderItem={renderTaskItem}
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={
            isLoading && displayTasks.length > 0 ? (
              <View style={{ paddingVertical: theme.spacing.md }}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoading && pendingTaskIds.length === 0 && currentPage === 0}
              onRefresh={refreshTasks}
              colors={[theme.colors.accent]}
              tintColor={theme.colors.accent}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            {
              padding: theme.spacing.md,
              paddingBottom: theme.spacing.xxl,
            },
          ]}
          removeClippedSubviews={Platform.OS !== 'web'}
          maxToRenderPerBatch={8}
          windowSize={5}
          initialNumToRender={8}
          onEndReached={() => {
            if (!isLoading && !isLastPage && !loading) {
              loadMoreTasks();
            }
          }}
          onEndReachedThreshold={0.5}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  itemFrame: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  listContent: {
    flexGrow: 1,
  },
});

export default TasksListScreen;
