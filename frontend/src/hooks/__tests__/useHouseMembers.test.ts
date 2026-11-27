import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { normalizeMembers, useHouseMembers } from '../useHouseMembers';
import { getHouseMembers } from '../../services/houseService';

jest.mock('../../services/houseService', () => ({
  getHouseMembers: jest.fn(),
}));

describe('useHouseMembers and normalizeMembers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps id fallback to uid and preserves profilePictureUrl', () => {
    const raw = [
      { id: 'u-1', name: 'Ana Silva', email: 'ana@alpendre.app', nickname: 'Ana', profilePictureUrl: 'https://img/1.png' },
      { uid: 'u-2', name: 'Bruno Souza', email: 'bruno@alpendre.app' },
    ];

    const result = normalizeMembers(raw);
    expect(result).toEqual([
      { uid: 'u-1', name: 'Ana Silva', email: 'ana@alpendre.app', nickname: 'Ana', profilePictureUrl: 'https://img/1.png' },
      { uid: 'u-2', name: 'Bruno Souza', email: 'bruno@alpendre.app', nickname: undefined, profilePictureUrl: undefined },
    ]);
  });

  it('fetches members via getHouseMembers when houseId is provided', async () => {
    (getHouseMembers as jest.Mock).mockResolvedValueOnce([
      { id: 'u-10', name: 'Clara', email: 'clara@alpendre.app' },
    ]);

    let latest!: ReturnType<typeof useHouseMembers>;
    function Consumer({ houseId }: { houseId?: string | null }) {
      latest = useHouseMembers(houseId);
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(Consumer, { houseId: 'house-42' }));
    });

    expect(getHouseMembers).toHaveBeenCalledWith('house-42');
    expect(latest.members).toEqual([
      { uid: 'u-10', name: 'Clara', email: 'clara@alpendre.app', nickname: undefined, profilePictureUrl: undefined },
    ]);

    act(() => {
      tree.unmount();
    });
  });
});
