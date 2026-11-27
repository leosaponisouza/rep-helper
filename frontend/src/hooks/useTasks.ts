// src/hooks/useTasks.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ErrorHandler } from '../utils/errorHandling';
import { useAuth } from '../context/AuthContext';
import { Task, CreateTaskDTO, UpdateTaskDTO } from '../models/task.model';
import { TaskFilterRequest } from '../models/taskFilter.model';
import * as taskService from '../services/taskService';
import { logger } from '../utils/logger';

interface UseTasksOptions {
  houseId?: string;
  initialFilterStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED' | 'all' | 'my-tasks' | 'recurring' | 'created-by-me' | 'other-users';
  pageSize?: number;
  initialSortBy?: string;
  initialSortDirection?: 'ASC' | 'DESC';
}

export const useTasks = (options: UseTasksOptions = {}) => {
  const { user } = useAuth();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMyTasks, setLoadingMyTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(
    options.initialFilterStatus
  );

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(options.pageSize || 20);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [isLastPage, setIsLastPage] = useState<boolean>(false);

  // Estados para ordenação
  const [sortBy, setSortBy] = useState<string>(options.initialSortBy || 'dueDate');
  const [sortDirection, setSortDirection] = useState<string>(options.initialSortDirection || 'ASC');

  // Estado para filtros avançados
  const [activeFilter, setActiveFilter] = useState<TaskFilterRequest>({});

  // Referências para controlar requisições simultâneas
  const isFetchingTasks = useRef(false);
  const isFetchingMyTasks = useRef(false);
  const pendingRefresh = useRef(false);
  const currentPageRef = useRef(0);
  const isInitialized = useRef(false);

  // Cache de tarefas para atualização otimista
  const tasksCache = useRef<Map<number, Task>>(new Map());

  // Filtra as tarefas localmente baseado no status atual
  const tasks = useMemo(() => {
    if (filterStatus === 'my-tasks') {
      if (options.initialFilterStatus && options.initialFilterStatus !== 'all' && options.initialFilterStatus !== 'my-tasks') {
        return myTasks.filter(task => task.status === options.initialFilterStatus);
      }
      return myTasks;
    }

    if (filterStatus === 'recurring') {
      return allTasks.filter(task => task.recurring);
    }

    if (filterStatus === 'created-by-me' && user?.uid) {
      return allTasks.filter(task => task.createdBy?.uid === user.uid);
    }

    if (filterStatus === 'other-users' && user?.uid) {
      return allTasks.filter(task => task.createdBy?.uid !== user.uid);
    }

    if (!filterStatus || filterStatus === 'all') {
      return allTasks;
    }

    return allTasks.filter(task => task.status === filterStatus);
  }, [allTasks, myTasks, filterStatus, options.initialFilterStatus, user?.uid]);

  const fetchTasks = useCallback(async (force = false, page?: number, filter?: TaskFilterRequest) => {
    if (isFetchingTasks.current && !force) {
      pendingRefresh.current = true;
      return;
    }

    try {
      isFetchingTasks.current = true;
      setLoading(true);
      setError(null);

      const taskFilter = filter || activeFilter;
      const pageToFetch = page !== undefined ? page : currentPageRef.current;

      const response = await taskService.getTasksWithFilters(
        taskFilter,
        options.houseId,
        pageToFetch,
        pageSize,
        sortBy,
        sortDirection
      );

      response.content.forEach((task: Task) => {
        tasksCache.current.set(task.id, task);
      });

      currentPageRef.current = response.page;

      setCurrentPage(response.page);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
      setIsLastPage(response.last);

      if (pageToFetch === 0 || force) {
        setAllTasks(response.content);
      } else {
        setAllTasks(prev => [...prev, ...response.content]);
      }
    } catch (err) {
      const parsedError = await ErrorHandler.parseError(err);
      setError(parsedError.message);
      ErrorHandler.logError(parsedError);
    } finally {
      setLoading(false);
      isFetchingTasks.current = false;

      if (pendingRefresh.current) {
        pendingRefresh.current = false;
        fetchTasks(true);
      }
    }
  }, [options.houseId, pageSize, sortBy, sortDirection, activeFilter]);

  const fetchMyTasks = useCallback(async (force = false, page?: number, filter?: TaskFilterRequest) => {
    if (isFetchingMyTasks.current && !force) {
      return;
    }

    try {
      isFetchingMyTasks.current = true;
      setLoadingMyTasks(true);

      const taskFilter = filter || activeFilter;
      const pageToFetch = page !== undefined ? page : currentPageRef.current;

      const response = await taskService.getAssignedTasksWithFilters(
        taskFilter,
        pageToFetch,
        pageSize,
        sortBy,
        sortDirection
      );

      response.content.forEach((task: Task) => {
        tasksCache.current.set(task.id, task);
      });

      currentPageRef.current = response.page;

      setCurrentPage(response.page);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
      setIsLastPage(response.last);

      if (pageToFetch === 0 || force) {
        setMyTasks(response.content);
      } else {
        setMyTasks(prev => [...prev, ...response.content]);
      }
    } catch (err) {
      logger.error('Erro ao buscar tarefas atribuídas:', err);
    } finally {
      setLoadingMyTasks(false);
      isFetchingMyTasks.current = false;
    }
  }, [pageSize, sortBy, sortDirection, activeFilter]);

  useEffect(() => {
    if (isInitialized.current) return;

    const loadInitialData = async () => {
      const initialFilter: TaskFilterRequest = {};

      if (options.initialFilterStatus &&
          !['all', 'my-tasks', 'recurring', 'created-by-me', 'other-users'].includes(options.initialFilterStatus)) {
        initialFilter.status = options.initialFilterStatus;
      }

      if (options.initialFilterStatus === 'recurring') {
        initialFilter.isRecurring = true;
      }

      if (options.initialFilterStatus === 'created-by-me' && user?.uid) {
        initialFilter.createdBy = user.uid;
      }

      setActiveFilter(initialFilter);

      try {
        if (options.initialFilterStatus === 'my-tasks') {
          await fetchMyTasks(true, 0, initialFilter);
        } else {
          await fetchTasks(true, 0, initialFilter);
        }
      } catch (error) {
        logger.error('Erro ao carregar tarefas iniciais:', error);
      } finally {
        isInitialized.current = true;
      }
    };

    loadInitialData();

    return () => {
      tasksCache.current.clear();
      isInitialized.current = false;
    };
  }, []);

  const applyFilter = useCallback((status?: string, additionalFilters?: TaskFilterRequest) => {
    const newFilter: TaskFilterRequest = { ...additionalFilters };

    if (status && !['all', 'my-tasks', 'recurring', 'created-by-me', 'other-users'].includes(status)) {
      newFilter.status = status;
    }

    if (status === 'recurring') {
      newFilter.isRecurring = true;
    }

    setActiveFilter(newFilter);
    setFilterStatus(status);

    currentPageRef.current = 0;
    setCurrentPage(0);

    if (status === 'my-tasks') {
      fetchMyTasks(true, 0, newFilter);
    } else {
      fetchTasks(true, 0, newFilter);
    }
  }, [fetchTasks, fetchMyTasks]);

  const loadMoreTasks = useCallback(() => {
    if (isLastPage || loading) return;

    const nextPage = currentPageRef.current + 1;
    currentPageRef.current = nextPage;
    setCurrentPage(nextPage);

    if (filterStatus === 'my-tasks') {
      fetchMyTasks(false, nextPage);
    } else {
      fetchTasks(false, nextPage);
    }
  }, [isLastPage, loading, filterStatus, fetchTasks, fetchMyTasks]);

  const changeSorting = useCallback((newSortBy: string, newSortDirection: 'ASC' | 'DESC' = 'ASC') => {
    setSortBy(newSortBy);
    setSortDirection(newSortDirection);

    currentPageRef.current = 0;
    setCurrentPage(0);

    if (filterStatus === 'my-tasks') {
      fetchMyTasks(true, 0);
    } else {
      fetchTasks(true, 0);
    }
  }, [fetchTasks, fetchMyTasks, filterStatus]);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);

    currentPageRef.current = 0;
    setCurrentPage(0);

    if (filterStatus === 'my-tasks') {
      fetchMyTasks(true, 0);
    } else {
      fetchTasks(true, 0);
    }
  }, [fetchTasks, fetchMyTasks, filterStatus]);

  const refreshLists = useCallback(async () => {
    try {
      await Promise.all([
        fetchTasks(true),
        fetchMyTasks(true),
      ]);
    } catch (error) {
      logger.error('Erro ao atualizar listas:', error);
    }
  }, [fetchTasks, fetchMyTasks]);

  const getTaskById = useCallback(async (taskId: number | string): Promise<Task> => {
    return taskService.getTaskById(taskId);
  }, []);

  const createTask = async (taskData: CreateTaskDTO) => {
    try {
      const newTask = await taskService.createTask(taskData);
      await refreshLists();
      return newTask;
    } catch (error) {
      ErrorHandler.handle(error);
      throw error;
    }
  };

  const updateTask = async (taskId: number, updateData: UpdateTaskDTO) => {
    try {
      const updatedTask = await taskService.updateTask(taskId, updateData);
      await refreshLists();
      return updatedTask;
    } catch (error) {
      ErrorHandler.handle(error);
      throw error;
    }
  };

  const assignMultipleUsers = async (taskId: number, userIds: string[]) => {
    try {
      const currentTask = tasksCache.current.get(taskId) ||
                         allTasks.find(t => t.id === taskId) ||
                         myTasks.find(t => t.id === taskId);

      if (currentTask) {
        const updatedTask: Task = { ...currentTask, assigned_users: userIds };

        tasksCache.current.set(taskId, updatedTask);

        setAllTasks(prev => prev.map(task =>
          task.id === taskId ? updatedTask : task
        ));

        if (userIds.includes(user?.uid || '')) {
          const taskInMyTasks = myTasks.some(t => t.id === taskId);
          if (!taskInMyTasks) {
            setMyTasks(prev => [...prev, updatedTask]);
          } else {
            setMyTasks(prev => prev.map(task =>
              task.id === taskId ? updatedTask : task
            ));
          }
        } else {
          setMyTasks(prev => prev.filter(task => task.id !== taskId));
        }
      }

      await taskService.assignMultipleUsers(taskId, userIds);
      await refreshLists();

      return true;
    } catch (err) {
      await refreshLists();

      const parsedError = await ErrorHandler.parseError(err);
      ErrorHandler.handle(err);
      throw parsedError;
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      await taskService.deleteTask(taskId);
      await refreshLists();
    } catch (error) {
      ErrorHandler.handle(error);
      throw error;
    }
  };

  const completeTask = async (taskId: number) => {
    try {
      await taskService.completeTask(taskId);
      await refreshLists();
    } catch (error) {
      ErrorHandler.handle(error);
      throw error;
    }
  };

  const cancelTask = async (taskId: number) => {
    try {
      await taskService.cancelTask(taskId);
      await refreshLists();
    } catch (error) {
      ErrorHandler.handle(error);
      throw error;
    }
  };

  const assignTask = async (taskId: number, userId: string) => {
    try {
      await taskService.assignTask(taskId, userId);
      await refreshLists();
    } catch (error) {
      ErrorHandler.handle(error);
      throw error;
    }
  };

  const unassignTask = async (taskId: number, userId: string) => {
    try {
      await taskService.unassignTask(taskId, userId);
      await refreshLists();
    } catch (error) {
      ErrorHandler.handle(error);
      throw error;
    }
  };

  const stopRecurrence = async (taskId: number) => {
    try {
      await taskService.stopRecurrence(taskId);
      await refreshLists();
    } catch (error) {
      ErrorHandler.handle(error);
      throw error;
    }
  };

  return {
    tasks,
    allTasks,
    myTasks,
    loading,
    loadingMyTasks,
    error,

    // Paginação
    currentPage,
    pageSize,
    totalPages,
    totalElements,
    isLastPage,
    loadMoreTasks,
    changePageSize,

    // Ordenação
    sortBy,
    sortDirection,
    changeSorting,

    // Filtros
    activeFilter,
    setActiveFilter,

    // Funções de busca
    fetchTasks,
    fetchMyTasks,
    applyFilter,
    getTaskById,

    // Funções de manipulação
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    cancelTask,
    assignTask,
    unassignTask,
    assignMultipleUsers,
    stopRecurrence,
  };
};
