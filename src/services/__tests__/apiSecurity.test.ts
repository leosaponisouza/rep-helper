jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { apiBaseUrl: 'https://api.rephelper.com' } } },
}));

jest.mock('../../utils/storage', () => ({
  getToken: jest.fn(),
  storeToken: jest.fn(),
  clearAuthData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/errorHandling', () => ({
  ErrorHandler: {
    parseError: jest.fn().mockResolvedValue({ type: 'authentication', message: '401' }),
    logError: jest.fn(),
  },
}));

import axios from 'axios';
import api, { setUnauthorizedHandler } from '../api';
import { getToken, storeToken, clearAuthData } from '../../utils/storage';

describe('api security interceptors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUnauthorizedHandler(null);
    delete api.defaults.headers.common['Authorization'];
  });

  it('does not attach Authorization header for cross-origin absolute URLs', async () => {
    (getToken as jest.Mock).mockResolvedValue('secret-jwt');
    const reqHandler = (api.interceptors.request as any).handlers.find(
      (h: any) => h && h.fulfilled && h.fulfilled.toString().includes('getToken')
    );

    const externalConfig = await reqHandler.fulfilled({
      url: 'https://evil.example.com/hook',
      headers: { Authorization: 'Bearer leaked-default' },
    });
    expect(externalConfig.headers.Authorization).toBeUndefined();

    const internalConfig = await reqHandler.fulfilled({
      url: '/api/v1/tasks',
      headers: {},
    });
    expect(internalConfig.headers.Authorization).toBe('Bearer secret-jwt');
  });

  it('clears auth data, rejects queued promises, and invokes unauthorized handler when refresh returns 200 without token', async () => {
    (getToken as jest.Mock).mockResolvedValue('expired-jwt');
    api.defaults.headers.common['Authorization'] = 'Bearer expired-jwt';
    const postSpy = jest.spyOn(axios, 'post').mockResolvedValue({ data: {} } as any);
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);

    const resHandler = (api.interceptors.response as any).handlers[0].rejected;
    const err401 = {
      response: { status: 401 },
      config: { url: '/api/v1/tasks', headers: {} },
    };

    await expect(resHandler(err401)).rejects.toBeDefined();
    expect(clearAuthData).toHaveBeenCalledTimes(1);
    expect(api.defaults.headers.common['Authorization']).toBeUndefined();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    postSpy.mockRestore();
  });

  it('rejects concurrent 401 requests queued in failedQueue and invokes unauthorizedHandler only once when refresh returns 200 without token', async () => {
    (getToken as jest.Mock).mockResolvedValue('expired-jwt');
    api.defaults.headers.common['Authorization'] = 'Bearer expired-jwt';

    let resolveRefresh!: (value: any) => void;
    const postSpy = jest.spyOn(axios, 'post').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const events: string[] = [];
    let resolveClear!: () => void;
    (clearAuthData as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveClear = () => {
            events.push('clear:done');
            resolve();
          };
        })
    );

    const onUnauthorized = jest.fn().mockResolvedValue(undefined);
    setUnauthorizedHandler(onUnauthorized);

    try {
      const resHandler = (api.interceptors.response as any).handlers[0].rejected;
      const err1 = {
        response: { status: 401 },
        config: { url: '/api/v1/tasks', headers: {} },
      };
      const err2 = {
        response: { status: 401 },
        config: { url: '/api/v1/events', headers: {} },
      };

      const p1 = resHandler(err1);
      // Allow p1 to await getToken() and enter axios.post so isRefreshing === true
      await new Promise((resolve) => setTimeout(resolve, 0));

      let p2Settled = false;
      const p2 = resHandler(err2).catch((err: unknown) => {
        p2Settled = true;
        events.push('p2:rejected');
        throw err;
      });

      resolveRefresh({ data: {} });
      // Drain all microtasks while clearAuthData() is still pending
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(clearAuthData).toHaveBeenCalledTimes(1);
      expect(api.defaults.headers.common['Authorization']).toBeUndefined();
      expect(p2Settled).toBe(false);

      resolveClear();

      const [r1, r2] = await Promise.allSettled([p1, p2]);
      expect(r1.status).toBe('rejected');
      expect(r2.status).toBe('rejected');
      expect(events).toEqual(['clear:done', 'p2:rejected']);
      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    } finally {
      resolveClear?.();
      postSpy.mockRestore();
    }
  });

  it('does not recurse unauthorizedHandler when logout endpoint returns 401', async () => {
    (getToken as jest.Mock).mockResolvedValue('expired-jwt');
    const postSpy = jest.spyOn(axios, 'post').mockResolvedValue({ data: {} } as any);

    const resHandler = (api.interceptors.response as any).handlers[0].rejected;
    const onUnauthorized = jest.fn(async () => {
      await expect(
        resHandler({
          response: { status: 401 },
          config: { url: '/api/v1/auth/logout', headers: {} },
        })
      ).rejects.toBeDefined();
    });
    setUnauthorizedHandler(onUnauthorized);

    await expect(
      resHandler({
        response: { status: 401 },
        config: { url: '/api/v1/tasks', headers: {} },
      })
    ).rejects.toBeDefined();

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledTimes(1);

    postSpy.mockRestore();
  });

  it('retries concurrent 401 requests queued in failedQueue when refresh succeeds with a new token', async () => {
    (getToken as jest.Mock).mockResolvedValue('expired-jwt');
    (storeToken as jest.Mock).mockResolvedValue(undefined);

    let resolveRefresh!: (value: any) => void;
    const postSpy = jest.spyOn(axios, 'post').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const originalAdapter = api.defaults.adapter;
    const adapterSpy = jest.fn(async (config: any) => ({
      data: { ok: true, url: config.url },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    api.defaults.adapter = adapterSpy as any;

    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);

    try {
      const resHandler = (api.interceptors.response as any).handlers[0].rejected;
      const err1 = {
        response: { status: 401 },
        config: { url: '/api/v1/tasks', headers: {} },
      };
      const err2 = {
        response: { status: 401 },
        config: { url: '/api/v1/events', headers: {} },
      };

      const p1 = resHandler(err1);
      await Promise.resolve();
      await Promise.resolve();
      const p2 = resHandler(err2);

      resolveRefresh({ data: { token: 'fresh-jwt' } });

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      expect(storeToken).toHaveBeenCalledWith('fresh-jwt');
      expect(api.defaults.headers.common['Authorization']).toBe('Bearer fresh-jwt');
      expect(clearAuthData).not.toHaveBeenCalled();
      expect(onUnauthorized).not.toHaveBeenCalled();
      expect(adapterSpy).toHaveBeenCalledTimes(2);
    } finally {
      api.defaults.adapter = originalAdapter;
      postSpy.mockRestore();
    }
  });

  it('fails closed in production when API_BASE_URL uses plain http without throwing on module import', async () => {
    const originalDev = (global as any).__DEV__;
    (global as any).__DEV__ = false;

    try {
      jest.resetModules();
      const mockLoggerError = jest.fn();
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: { expoConfig: { extra: { apiBaseUrl: 'http://api.rephelper.com' } } },
      }));
      jest.doMock('../../utils/logger', () => ({
        logger: {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: mockLoggerError,
        },
      }));

      const prodApi = require('../api').default;
      expect(prodApi.defaults.baseURL).not.toBe('http://api.rephelper.com');
      expect(prodApi.defaults.baseURL).toBe('');
      expect(mockLoggerError).toHaveBeenCalled();

      const reqHandler = (prodApi.interceptors.request as any).handlers.find(
        (h: any) => h && h.fulfilled && h.fulfilled.toString().includes('getToken')
      );
      await expect(
        reqHandler.fulfilled({ url: '/api/v1/tasks', headers: {} })
      ).rejects.toThrow('API_BASE_URL deve usar HTTPS em produção');
    } finally {
      (global as any).__DEV__ = originalDev;
      jest.resetModules();
    }
  });

  it('always clears local auth data in authService.logout even when backend and firebase signOut fail or lack signOut', async () => {
    jest.resetModules();
    const mockClearAuthData = jest.fn().mockResolvedValue(undefined);
    const mockPost = jest.fn().mockRejectedValue(new Error('network down'));

    jest.doMock('firebase/auth', () => ({
      createUserWithEmailAndPassword: jest.fn(),
      signInWithEmailAndPassword: jest.fn(),
      signInWithCredential: jest.fn(),
      GoogleAuthProvider: { credential: jest.fn() },
      FacebookAuthProvider: { credential: jest.fn() },
      GithubAuthProvider: { credential: jest.fn() },
      PhoneAuthProvider: { credential: jest.fn() },
      signInWithPhoneNumber: jest.fn(),
    }));
    jest.doMock('../api', () => ({
      __esModule: true,
      default: {
        post: mockPost,
        defaults: { headers: { common: {} } },
      },
    }));
    jest.doMock('../../utils/firebaseClientConfig', () => ({
      auth: { currentUser: null },
      getFreshFirebaseToken: jest.fn(),
    }));
    jest.doMock('../../utils/storage', () => ({
      storeToken: jest.fn(),
      storeData: jest.fn(),
      clearAuthData: mockClearAuthData,
      storeRefreshToken: jest.fn(),
    }));
    jest.doMock('../../utils/logger', () => ({
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const authService = require('../authService');
    await expect(authService.logout()).resolves.toBeUndefined();
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/logout');
    expect(mockClearAuthData).toHaveBeenCalledTimes(1);

    jest.resetModules();
    const mockSignOut = jest.fn().mockRejectedValue(new Error('firebase error'));
    const mockClearAuthData2 = jest.fn().mockResolvedValue(undefined);
    jest.doMock('firebase/auth', () => ({}));
    jest.doMock('../api', () => ({
      __esModule: true,
      default: {
        post: jest.fn().mockResolvedValue({}),
        defaults: { headers: { common: {} } },
      },
    }));
    jest.doMock('../../utils/firebaseClientConfig', () => ({
      auth: { signOut: mockSignOut },
      getFreshFirebaseToken: jest.fn(),
    }));
    jest.doMock('../../utils/storage', () => ({
      storeToken: jest.fn(),
      storeData: jest.fn(),
      clearAuthData: mockClearAuthData2,
      storeRefreshToken: jest.fn(),
    }));
    jest.doMock('../../utils/logger', () => ({
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const authService2 = require('../authService');
    await expect(authService2.logout()).resolves.toBeUndefined();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockClearAuthData2).toHaveBeenCalledTimes(1);

    jest.resetModules();
  });
});
