import { taskFormSchema, getRecurrencePatternLabel } from '../taskSchemas';

describe('taskFormSchema', () => {
  it('validates a standard non-recurring task with valid title', () => {
    const result = taskFormSchema.safeParse({
      title: 'Comprar detergente',
      recurring: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a title shorter than 3 characters', () => {
    const result = taskFormSchema.safeParse({
      title: 'Oi',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Título deve ter pelo menos 3 caracteres');
    }
  });

  it('rejects a recurring task without dueDate', () => {
    const result = taskFormSchema.safeParse({
      title: 'Limpar banheiro',
      recurring: true,
      recurrenceType: 'WEEKLY',
      recurrenceInterval: 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['dueDate']);
      expect(result.error.issues[0].message).toBe(
        'Para tarefas recorrentes, a data da primeira ocorrência é obrigatória'
      );
    }
  });

  it('formats recurrence pattern label in Portuguese', () => {
    expect(getRecurrencePatternLabel(false, 'WEEKLY', 1)).toBe('');
    expect(getRecurrencePatternLabel(true, 'WEEKLY', 1)).toBe('Semanal');
    expect(getRecurrencePatternLabel(true, 'DAILY', 3)).toBe('Diária (a cada 3 dias)');
  });
});
