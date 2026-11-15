import { normalizeMembers } from '../useRepublicMembers';

jest.mock('../../services/republicService', () => ({
  getRepublicMembers: jest.fn(),
}));

describe('normalizeMembers', () => {
  it('maps id fallback to uid and preserves profilePictureUrl', () => {
    const raw = [
      { id: 'u-1', name: 'Ana Silva', email: 'ana@rep.com', nickname: 'Ana', profilePictureUrl: 'https://img/1.png' },
      { uid: 'u-2', name: 'Bruno Souza', email: 'bruno@rep.com' },
    ];

    const result = normalizeMembers(raw);
    expect(result).toEqual([
      { uid: 'u-1', name: 'Ana Silva', email: 'ana@rep.com', nickname: 'Ana', profilePictureUrl: 'https://img/1.png' },
      { uid: 'u-2', name: 'Bruno Souza', email: 'bruno@rep.com', nickname: undefined, profilePictureUrl: undefined },
    ]);
  });
});
