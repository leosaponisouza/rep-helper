// src/models/task.model.ts

import { User } from './user.model';

export type RecurrenceType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type TaskStatus = 'PENDING' | 'COMPLETED' | 'IN_PROGRESS' | 'OVERDUE' | 'CANCELLED';
export type AssignedUser = User;

export interface Task {
  id: number;
  houseId: string;
  house_id?: string;
  title: string;
  description?: string;
  dueDate?: string;
  category?: string;
  status: TaskStatus;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  assignedUsers?: User[];
  assigned_users?: string[];
  completedAt?: string;
  completed_at?: string;
  createdBy?: User;
  recurring?: boolean;
  isRecurring?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
  parentTaskId?: number;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  dueDate?: string;
  category?: string;
  houseId: string;
  assigned_users?: string[];
  recurring?: boolean;
  isRecurring?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  dueDate?: string;
  category?: string;
  status?: TaskStatus;
  assigned_users?: string[];
  recurring?: boolean;
  isRecurring?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
}

export function normalizeTask(raw: Record<string, unknown>): Task {
  const houseId = String(raw.houseId ?? raw.house_id ?? '');
  const recurring = Boolean(raw.recurring ?? raw.isRecurring ?? false);
  const completedAt = (raw.completedAt ?? raw.completed_at) as string | undefined;
  const updatedAt = (raw.updatedAt ?? raw.updated_at) as string | undefined;

  return {
    id: Number(raw.id),
    houseId,
    house_id: houseId,
    title: String(raw.title ?? ''),
    description:
      raw.description !== undefined && raw.description !== null
        ? String(raw.description)
        : undefined,
    dueDate: raw.dueDate ? String(raw.dueDate) : undefined,
    category: raw.category ? String(raw.category) : undefined,
    status: (raw.status as TaskStatus) || 'PENDING',
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt,
    updated_at: updatedAt,
    assignedUsers: Array.isArray(raw.assignedUsers) ? (raw.assignedUsers as User[]) : undefined,
    assigned_users: Array.isArray(raw.assigned_users) ? (raw.assigned_users as string[]) : undefined,
    completedAt,
    completed_at: completedAt,
    createdBy: (raw.createdBy as User) || undefined,
    recurring,
    isRecurring: recurring,
    recurrenceType: raw.recurrenceType as RecurrenceType | undefined,
    recurrenceInterval:
      raw.recurrenceInterval !== undefined ? Number(raw.recurrenceInterval) : undefined,
    recurrenceEndDate: raw.recurrenceEndDate ? String(raw.recurrenceEndDate) : undefined,
    parentTaskId:
      raw.parentTaskId !== undefined && raw.parentTaskId !== null
        ? Number(raw.parentTaskId)
        : undefined,
  };
}
