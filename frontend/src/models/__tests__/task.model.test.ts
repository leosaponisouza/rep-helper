import { normalizeTask } from '../task.model';

describe('normalizeTask', () => {
  it('normalizes snake_case and isRecurring fields into standard Task properties', () => {
    const raw = {
      id: 42,
      house_id: 'house-1',
      title: 'Limpar cozinha',
      status: 'PENDING',
      isRecurring: true,
      recurrenceType: 'WEEKLY',
      recurrenceInterval: 2,
      completed_at: '2026-11-10T10:00:00',
    };

    const task = normalizeTask(raw);
    expect(task.id).toBe(42);
    expect(task.houseId).toBe('house-1');
    expect(task.house_id).toBe('house-1');
    expect(task.recurring).toBe(true);
    expect(task.completedAt).toBe('2026-11-10T10:00:00');
  });
});
