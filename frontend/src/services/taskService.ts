// src/services/taskService.ts
import api from './api';
import { Task, CreateTaskDTO, UpdateTaskDTO, normalizeTask } from '../models/task.model';
import { TaskFilterRequest } from '../models/taskFilter.model';
import { PagedResponse } from '../models/pagedResponse.model';
import { validatePositiveIntId } from '../utils/urlSecurity';

// Obter uma tarefa específica pelo ID
export const getTaskById = async (taskId: number | string): Promise<Task> => {
  const safeTaskId = validatePositiveIntId(taskId);
  const response = await api.get(`/api/v1/tasks/${safeTaskId}`);
  return normalizeTask(response.data);
};

// Obter todas as tarefas (método legado)
export const getAllTasks = async (houseId?: string): Promise<Task[]> => {
  const params: Record<string, string> = {};
  if (houseId) {
    params.houseId = houseId;
  }
  const response = await api.get('/api/v1/tasks', { params });
  return Array.isArray(response.data) ? response.data.map(normalizeTask) : [];
};

// Obter tarefas com filtros e paginação
export const getTasksWithFilters = async (
  filter?: TaskFilterRequest,
  houseId?: string,
  page: number = 0,
  size: number = 20,
  sortBy: string = 'dueDate',
  sortDirection: string = 'asc'
): Promise<PagedResponse<Task>> => {
  const taskFilter: TaskFilterRequest = { ...(filter || {}) };

  if (page !== undefined) taskFilter.page = page;
  if (size !== undefined) taskFilter.size = size;
  if (sortBy) taskFilter.sortBy = sortBy;
  if (sortDirection) taskFilter.sortDirection = sortDirection;

  const params: Record<string, string> = {};
  if (houseId) {
    params.houseId = houseId;
  }

  const response = await api.post<PagedResponse<Record<string, unknown>>>(
    '/api/v1/tasks/filter',
    taskFilter,
    { params }
  );

  return {
    ...response.data,
    content: Array.isArray(response.data.content)
      ? response.data.content.map(normalizeTask)
      : [],
  };
};

// Obter tarefas atribuídas ao usuário atual (método legado)
export const getAssignedTasks = async (): Promise<Task[]> => {
  const response = await api.get('/api/v1/tasks/assigned');
  return Array.isArray(response.data) ? response.data.map(normalizeTask) : [];
};

// Obter tarefas atribuídas ao usuário atual com filtros e paginação
export const getAssignedTasksWithFilters = async (
  filter?: TaskFilterRequest,
  page: number = 0,
  size: number = 20,
  sortBy: string = 'dueDate',
  sortDirection: string = 'asc'
): Promise<PagedResponse<Task>> => {
  const taskFilter: TaskFilterRequest = { ...(filter || {}) };

  if (page !== undefined) taskFilter.page = page;
  if (size !== undefined) taskFilter.size = size;
  if (sortBy) taskFilter.sortBy = sortBy;
  if (sortDirection) taskFilter.sortDirection = sortDirection;

  const response = await api.post<PagedResponse<Record<string, unknown>>>(
    '/api/v1/tasks/assigned/filter',
    taskFilter
  );

  return {
    ...response.data,
    content: Array.isArray(response.data.content)
      ? response.data.content.map(normalizeTask)
      : [],
  };
};

// Criar uma nova tarefa
export const createTask = async (taskData: CreateTaskDTO): Promise<Task> => {
  const response = await api.post('/api/v1/tasks', taskData);
  return normalizeTask(response.data);
};

// Atualizar uma tarefa existente
export const updateTask = async (taskId: number, updateData: UpdateTaskDTO): Promise<Task> => {
  const safeTaskId = validatePositiveIntId(taskId);
  const response = await api.put(`/api/v1/tasks/${safeTaskId}`, updateData);
  return normalizeTask(response.data);
};

// Completar uma tarefa
export const completeTask = async (taskId: number): Promise<Task> => {
  const safeTaskId = validatePositiveIntId(taskId);
  const response = await api.post(`/api/v1/tasks/${safeTaskId}/complete`);
  return normalizeTask(response.data);
};

// Cancelar uma tarefa
export const cancelTask = async (taskId: number): Promise<Task> => {
  const safeTaskId = validatePositiveIntId(taskId);
  const response = await api.post(`/api/v1/tasks/${safeTaskId}/cancel`);
  return normalizeTask(response.data);
};

// Excluir uma tarefa
export const deleteTask = async (taskId: number): Promise<void> => {
  const safeTaskId = validatePositiveIntId(taskId);
  await api.delete(`/api/v1/tasks/${safeTaskId}`);
};

// Atribuir uma tarefa a um usuário
export const assignTask = async (taskId: number, userId: string): Promise<Task> => {
  const safeTaskId = validatePositiveIntId(taskId);
  const response = await api.post(`/api/v1/tasks/${safeTaskId}/assign`, { userId });
  return normalizeTask(response.data);
};

// Desatribuir uma tarefa de um usuário
export const unassignTask = async (taskId: number, userId: string): Promise<Task> => {
  const safeTaskId = validatePositiveIntId(taskId);
  const response = await api.post(`/api/v1/tasks/${safeTaskId}/unassign`, { userId });
  return normalizeTask(response.data);
};

// Atribuir múltiplos usuários a uma tarefa
export const assignMultipleUsers = async (taskId: number, userIds: string[]): Promise<boolean> => {
  const safeTaskId = validatePositiveIntId(taskId);
  const assignmentPromises = userIds.map(userId =>
    api.post(`/api/v1/tasks/${safeTaskId}/assign`, { userId })
  );

  await Promise.all(assignmentPromises);
  return true;
};

// Parar recorrência de uma tarefa
export const stopRecurrence = async (taskId: number): Promise<Task> => {
  const safeTaskId = validatePositiveIntId(taskId);
  const response = await api.put(`/api/v1/tasks/${safeTaskId}`, { recurring: false });
  return normalizeTask(response.data);
};
