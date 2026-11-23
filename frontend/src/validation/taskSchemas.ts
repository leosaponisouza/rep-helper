// src/validation/taskSchemas.ts
import { z } from 'zod';
import { RecurrenceType } from '../models/task.model';
import { formatShortDate } from '../utils/dateUtils';

export const COMMON_TASK_CATEGORIES = [
  'Limpeza',
  'Compras',
  'Manutenção',
  'Contas',
  'Alimentação',
  'Outros',
] as const;

export const RECURRENCE_TYPES: ReadonlyArray<{
  key: RecurrenceType;
  label: string;
  icon: string;
}> = [
  { key: 'DAILY', label: 'Diária', icon: 'calendar-outline' },
  { key: 'WEEKLY', label: 'Semanal', icon: 'calendar-number-outline' },
  { key: 'MONTHLY', label: 'Mensal', icon: 'calendar-clear-outline' },
  { key: 'YEARLY', label: 'Anual', icon: 'calendar' },
];

export const taskFormSchema = z
  .object({
    title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
    description: z.string().optional(),
    dueDate: z.date().optional(),
    category: z.string().optional(),
    recurring: z.boolean().optional(),
    recurrenceType: z.string().optional(),
    recurrenceInterval: z.number().min(1).optional(),
    recurrenceEndDate: z.date().optional(),
  })
  .refine(
    data => {
      if (data.recurring && !data.dueDate) {
        return false;
      }
      return true;
    },
    {
      message: 'Para tarefas recorrentes, a data da primeira ocorrência é obrigatória',
      path: ['dueDate'],
    }
  );

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export function getRecurrencePatternLabel(
  recurring?: boolean,
  recurrenceType: string = 'WEEKLY',
  recurrenceInterval: number = 1
): string {
  if (!recurring) return '';

  const type =
    recurrenceType === 'DAILY'
      ? 'Diária'
      : recurrenceType === 'WEEKLY'
      ? 'Semanal'
      : recurrenceType === 'MONTHLY'
      ? 'Mensal'
      : 'Anual';

  if (recurrenceInterval === 1) {
    return type;
  }

  const unit =
    recurrenceType === 'DAILY'
      ? 'dias'
      : recurrenceType === 'WEEKLY'
      ? 'semanas'
      : recurrenceType === 'MONTHLY'
      ? 'meses'
      : 'anos';

  return `${type} (a cada ${recurrenceInterval} ${unit})`;
}

export function getRecurrenceDescriptionText(
  recurring?: boolean,
  recurrenceType: string = 'WEEKLY',
  recurrenceInterval: number = 1,
  recurrenceEndDate?: Date
): string {
  if (!recurring) return '';

  let description = '';

  if (recurrenceInterval === 1) {
    description =
      recurrenceType === 'DAILY'
        ? 'A tarefa será recriada todos os dias'
        : recurrenceType === 'WEEKLY'
        ? 'A tarefa será recriada toda semana'
        : recurrenceType === 'MONTHLY'
        ? 'A tarefa será recriada todo mês'
        : 'A tarefa será recriada todo ano';
  } else {
    description =
      recurrenceType === 'DAILY'
        ? `A tarefa será recriada a cada ${recurrenceInterval} dias`
        : recurrenceType === 'WEEKLY'
        ? `A tarefa será recriada a cada ${recurrenceInterval} semanas`
        : recurrenceType === 'MONTHLY'
        ? `A tarefa será recriada a cada ${recurrenceInterval} meses`
        : `A tarefa será recriada a cada ${recurrenceInterval} anos`;
  }

  if (recurrenceEndDate) {
    description += `, até ${formatShortDate(recurrenceEndDate)}`;
  }

  return description;
}
