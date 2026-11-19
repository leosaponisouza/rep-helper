jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('firebase/auth', () => ({
  signOut: jest.fn(),
}));

jest.mock('../../utils/firebaseClientConfig', () => ({
  auth: { currentUser: null },
}));

jest.mock('../../utils/storage', () => ({
  getToken: jest.fn(),
  storeToken: jest.fn().mockResolvedValue(undefined),
  removeToken: jest.fn().mockResolvedValue(undefined),
  getRefreshToken: jest.fn(),
  storeRefreshToken: jest.fn().mockResolvedValue(undefined),
  removeRefreshToken: jest.fn().mockResolvedValue(undefined),
  storeData: jest.fn().mockResolvedValue(undefined),
  getData: jest.fn(),
  removeData: jest.fn().mockResolvedValue(undefined),
  clearAuthData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/authService', () => ({
  logout: jest.fn().mockResolvedValue(undefined),
  refreshAuthToken: jest.fn(),
  loginWithEmailPassword: jest.fn(),
  loginWithFirebaseToken: jest.fn(),
  signUp: jest.fn(),
}));

jest.mock('../../services/api', () => {
  const mockApi: any = {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { headers: { common: {} as Record<string, string> } },
  };
  return {
    __esModule: true,
    default: mockApi,
    setUnauthorizedHandler: jest.fn(),
  };
});

jest.mock('../../utils/errorHandling', () => ({
  ErrorHandler: {
    parseError: jest.fn().mockResolvedValue({ type: 'network', message: 'Erro de rede' }),
    logError: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import { router } from 'expo-router';
import { AuthProvider, useAuth } from '../AuthContext';
import api, { setUnauthorizedHandler } from '../../services/api';
import * as authService from '../../services/authService';
import { getToken, getData, removeToken, clearAuthData } from '../../utils/storage';
import { User } from '../../models/user.model';

const cachedUser: User = {
  uid: 'user-1',
  name: 'Alice',
  email: 'alice@rephelper.com',
  firebaseUid: 'fb-1',
  provider: 'email',
  currentRepublicId: 'rep-1',
};

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('AuthContext security lifecycle', () => {
  let latestAuth!: ReturnType<typeof useAuth>;

  function Consumer() {
    latestAuth = useAuth();
    return null;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    delete api.defaults.headers.common['Authorization'];
  });

  it('registers setUnauthorizedHandler on mount, clears user/header and redirects to sign-in when triggered, and cleans up on unmount', async () => {
    (getToken as jest.Mock).mockResolvedValue('valid-jwt');
    (getData as jest.Mock).mockResolvedValue(JSON.stringify(cachedUser));
    (api.get as jest.Mock).mockResolvedValue({ data: { user: cachedUser } });

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        React.createElement(AuthProvider, null, React.createElement(Consumer))
      );
    });
    await flushEffects();

    expect(setUnauthorizedHandler).toHaveBeenCalledWith(expect.any(Function));
    expect(latestAuth.user).toEqual(cachedUser);
    expect(api.defaults.headers.common['Authorization']).toBe('Bearer valid-jwt');

    const registeredHandler = (setUnauthorizedHandler as jest.Mock).mock.calls[0][0] as () => Promise<void>;
    await act(async () => {
      await registeredHandler();
    });

    expect(api.defaults.headers.common['Authorization']).toBeUndefined();
    expect(latestAuth.user).toBeNull();
    expect(latestAuth.isAuthenticated).toBe(false);
    expect(router.replace).toHaveBeenCalledWith('/(auth)/sign-in');

    act(() => {
      tree.unmount();
    });
    expect(setUnauthorizedHandler).toHaveBeenLastCalledWith(null);
  });

  it('preserves cached user and token on transient timeout, 5xx, and network errors in loadUser()', async () => {
    const transientErrors = [
      new CanceledError('timeout'),
      new AxiosError('Service Unavailable', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {},
      }),
      new AxiosError('Network Error', 'ERR_NETWORK'),
    ];

    for (const err of transientErrors) {
      jest.clearAllMocks();
      (getToken as jest.Mock).mockResolvedValue('valid-jwt');
      (getData as jest.Mock).mockResolvedValue(JSON.stringify(cachedUser));
      (api.get as jest.Mock).mockRejectedValueOnce(err);

      let tree!: renderer.ReactTestRenderer;
      await act(async () => {
        tree = renderer.create(
          React.createElement(AuthProvider, null, React.createElement(Consumer))
        );
      });
      await flushEffects();

      expect(latestAuth.user).toEqual(cachedUser);
      expect(latestAuth.isAuthenticated).toBe(true);
      expect(removeToken).not.toHaveBeenCalled();
      expect(clearAuthData).not.toHaveBeenCalled();
      expect(api.defaults.headers.common['Authorization']).toBe('Bearer valid-jwt');

      act(() => {
        tree.unmount();
      });
    }
  });

  it('clears auth data and resets user to null on unrecoverable 401, 403, or when interceptor already cleared token', async () => {
    // 1) Unrecoverable 401
    (getToken as jest.Mock).mockResolvedValue('expired-jwt');
    (getData as jest.Mock).mockResolvedValue(JSON.stringify(cachedUser));
    (authService.refreshAuthToken as jest.Mock).mockRejectedValueOnce(new Error('invalid refresh'));
    (api.get as jest.Mock).mockRejectedValueOnce(
      new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {},
      })
    );

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        React.createElement(AuthProvider, null, React.createElement(Consumer))
      );
    });
    await flushEffects();

    expect(clearAuthData).toHaveBeenCalledTimes(1);
    expect(api.defaults.headers.common['Authorization']).toBeUndefined();
    expect(latestAuth.user).toBeNull();
    act(() => {
      tree.unmount();
    });

    // 2) 403 Forbidden
    jest.clearAllMocks();
    (getToken as jest.Mock).mockResolvedValue('bad-jwt');
    (getData as jest.Mock).mockResolvedValue(JSON.stringify(cachedUser));
    (api.get as jest.Mock).mockRejectedValueOnce(
      new AxiosError('Forbidden', 'ERR_FORBIDDEN', undefined, undefined, {
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {},
      })
    );

    await act(async () => {
      tree = renderer.create(
        React.createElement(AuthProvider, null, React.createElement(Consumer))
      );
    });
    await flushEffects();

    expect(clearAuthData).toHaveBeenCalledTimes(1);
    expect(api.defaults.headers.common['Authorization']).toBeUndefined();
    expect(latestAuth.user).toBeNull();
    act(() => {
      tree.unmount();
    });

    // 3) Interceptor already wiped token before loadUser catch checks getToken()
    jest.clearAllMocks();
    (getToken as jest.Mock)
      .mockResolvedValueOnce('expired-jwt')
      .mockResolvedValueOnce(null);
    (getData as jest.Mock).mockResolvedValue(JSON.stringify(cachedUser));
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('Token de renovação ausente'));

    await act(async () => {
      tree = renderer.create(
        React.createElement(AuthProvider, null, React.createElement(Consumer))
      );
    });
    await flushEffects();

    expect(api.defaults.headers.common['Authorization']).toBeUndefined();
    expect(latestAuth.user).toBeNull();
    act(() => {
      tree.unmount();
    });
  });

  it('clears user, deletes Authorization header, and navigates to sign-in in logout() finally even when authService.logout rejects', async () => {
    (getToken as jest.Mock).mockResolvedValue('valid-jwt');
    (getData as jest.Mock).mockResolvedValue(JSON.stringify(cachedUser));
    (api.get as jest.Mock).mockResolvedValue({ data: { user: cachedUser } });
    (authService.logout as jest.Mock).mockRejectedValueOnce(new Error('logout endpoint failed'));

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        React.createElement(AuthProvider, null, React.createElement(Consumer))
      );
    });
    await flushEffects();

    expect(latestAuth.user).toEqual(cachedUser);
    expect(api.defaults.headers.common['Authorization']).toBe('Bearer valid-jwt');

    await act(async () => {
      await latestAuth.logout();
    });

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(latestAuth.user).toBeNull();
    expect(latestAuth.isAuthenticated).toBe(false);
    expect(latestAuth.loading).toBe(false);
    expect(api.defaults.headers.common['Authorization']).toBeUndefined();
    expect(router.replace).toHaveBeenCalledWith('/(auth)/sign-in');

    act(() => {
      tree.unmount();
    });
  });
});
