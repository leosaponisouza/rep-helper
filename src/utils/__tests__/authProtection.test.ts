jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

import { resolveAuthRedirect } from '../authProtection';

describe('resolveAuthRedirect', () => {
  it('returns null while auth state is loading', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: true,
        segments: ['(panel)', 'home'],
        currentRepublicId: null,
      })
    ).toBeNull();
  });

  it('redirects unauthenticated users accessing (panel) or (republic) to sign-in', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['(panel)', 'home'],
        currentRepublicId: null,
      })
    ).toBe('/(auth)/sign-in');

    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['(republic)', 'choice'],
        currentRepublicId: null,
      })
    ).toBe('/(auth)/sign-in');
  });

  it('allows unauthenticated users inside (auth) routes', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['(auth)', 'sign-in'],
        currentRepublicId: null,
      })
    ).toBeNull();
  });

  it('redirects authenticated users without republic away from (panel) to (republic)/choice', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(panel)', 'tasks'],
        currentRepublicId: null,
      })
    ).toBe('/(republic)/choice');
  });

  it('redirects authenticated users with republic away from (auth) and (republic)/choice to (panel)/home, but allows (republic)/new', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(auth)', 'sign-in'],
        currentRepublicId: 'rep-1',
      })
    ).toBe('/(panel)/home');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(republic)', 'choice'],
        currentRepublicId: 'rep-1',
      })
    ).toBe('/(panel)/home');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(republic)', 'new'],
        currentRepublicId: 'rep-1',
      })
    ).toBeNull();
  });
});
