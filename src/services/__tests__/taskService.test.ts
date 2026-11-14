import api from '../api';
import * as taskService from '../taskService';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('taskService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches and normalizes a single task by ID via getTaskById', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { id: 9, republic_id: 'rep-1', title: 'Compras', status: 'PENDING', isRecurring: true },
    } as any);

    const task = await taskService.getTaskById(9);
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/tasks/9');
    expect(task.republicId).toBe('rep-1');
    expect(task.recurring).toBe(true);
  });
});
