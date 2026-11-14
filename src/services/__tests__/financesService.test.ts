import api from '../api';
import * as financesService from '../financesService';

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

describe('financesService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches expenses for a republic', async () => {
    const mockExpenses = [{ id: 1, description: 'Luz', amount: 150 }];
    mockedApi.get.mockResolvedValueOnce({ data: mockExpenses } as any);

    const result = await financesService.getExpenses('rep-123');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/expenses', { params: { republicId: 'rep-123' } });
    expect(result).toEqual(mockExpenses);
  });

  it('adjusts republic balance with default empty description', async () => {
    const mockSummary = { currentBalance: 500 };
    mockedApi.post.mockResolvedValueOnce({ data: mockSummary } as any);

    const result = await financesService.adjustRepublicBalance('rep-123', 500);
    expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/finances/rep-123/adjust-balance', {
      amount: 500,
      description: '',
    });
    expect(result).toEqual(mockSummary);
  });
});
