import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Task } from '../models/task.model';
import { Event } from '../services/events/eventsTypes';
import { FinancialDashboardSummary } from '../models/finances.model';
import * as taskService from '../services/taskService';
import { EventsService } from '../services/events/eventsService';
import { ErrorHandler } from '../utils/errorHandling';
import api from '../services/api';

interface HomeData {
  // Tarefas
  userTasks: Task[];
  loadingTasks: boolean;
  tasksError: string | null;
  
  // Eventos
  upcomingEvents: Event[];
  loadingEvents: boolean;
  eventsError: string | null;
  
  // Finanças
  financialSummary: FinancialDashboardSummary | null;
  loadingFinances: boolean;
  financesError: string | null;
  
  // Funções
  refreshData: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshFinances: () => Promise<void>;
}

export const useHome = (): HomeData => {
  const { user } = useAuth();
  const republicId = user?.currentRepublicId;
  
  // Estados para tarefas
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  
  // Estados para eventos
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  
  // Estados para finanças
  const [financialSummary, setFinancialSummary] = useState<FinancialDashboardSummary | null>(null);
  const [loadingFinances, setLoadingFinances] = useState(true);
  const [financesError, setFinancesError] = useState<string | null>(null);
  
  // Referências para controlar requisições simultâneas
  const isFetchingTasks = useRef(false);
  const isFetchingEvents = useRef(false);
  const isFetchingFinances = useRef(false);
  
  const fetchUserTasks = useCallback(async () => {
    if (!user || isFetchingTasks.current) return;
    
    try {
      isFetchingTasks.current = true;
      setLoadingTasks(true);
      setTasksError(null);
      
      const response = await taskService.getAssignedTasksWithFilters(
        { status: 'PENDING' },
        0,
        3,
        'dueDate',
        'ASC'
      );
      
      setUserTasks(response.content);
    } catch (err) {
      const parsedError = await ErrorHandler.parseError(err);
      setTasksError(parsedError.message);
      console.error('Erro ao buscar tarefas do usuário:', err);
    } finally {
      setLoadingTasks(false);
      isFetchingTasks.current = false;
    }
  }, [user]);
  
  const fetchUpcomingEvents = useCallback(async () => {
    if (!republicId || isFetchingEvents.current) return;
    
    try {
      isFetchingEvents.current = true;
      setLoadingEvents(true);
      setEventsError(null);
      
      const events = await EventsService.fetchUpcomingEvents();
      
      const sortedEvents = events
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 2);
      
      setUpcomingEvents(sortedEvents);
    } catch (err) {
      const parsedError = await ErrorHandler.parseError(err);
      setEventsError(parsedError.message);
      console.error('Erro ao buscar próximos eventos:', err);
    } finally {
      setLoadingEvents(false);
      isFetchingEvents.current = false;
    }
  }, [republicId]);
  
  const fetchFinancialSummary = useCallback(async () => {
    if (!republicId || isFetchingFinances.current) return;
    
    try {
      isFetchingFinances.current = true;
      setLoadingFinances(true);
      setFinancesError(null);
      
      const response = await api.get<FinancialDashboardSummary>(
        `/api/v1/financial-dashboard/summary/${republicId}`
      );
      
      setFinancialSummary(response.data);
    } catch (err) {
      const parsedError = await ErrorHandler.parseError(err);
      setFinancesError(parsedError.message);
      console.error('Erro ao buscar resumo financeiro:', err);
    } finally {
      setLoadingFinances(false);
      isFetchingFinances.current = false;
    }
  }, [republicId]);
  
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchUserTasks(),
      fetchUpcomingEvents(),
      fetchFinancialSummary()
    ]);
  }, [fetchUserTasks, fetchUpcomingEvents, fetchFinancialSummary]);
  
  const refreshTasks = useCallback(async () => {
    await fetchUserTasks();
  }, [fetchUserTasks]);
  
  const refreshEvents = useCallback(async () => {
    await fetchUpcomingEvents();
  }, [fetchUpcomingEvents]);
  
  const refreshFinances = useCallback(async () => {
    await fetchFinancialSummary();
  }, [fetchFinancialSummary]);
  
  useEffect(() => {
    refreshData();
    
    return () => {
      setUserTasks([]);
      setUpcomingEvents([]);
      setFinancialSummary(null);
    };
  }, [refreshData]);
  
  return {
    userTasks,
    loadingTasks,
    tasksError,
    upcomingEvents,
    loadingEvents,
    eventsError,
    financialSummary,
    loadingFinances,
    financesError,
    refreshData,
    refreshTasks,
    refreshEvents,
    refreshFinances
  };
};
