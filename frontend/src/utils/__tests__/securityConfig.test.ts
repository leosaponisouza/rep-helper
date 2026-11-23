import { assertSecureApiUrl, isSameOriginRequest } from '../securityConfig';

describe('securityConfig', () => {
  it('allows http localhost in dev mode and rejects plain http in production', () => {
    expect(assertSecureApiUrl('http://localhost:8080', true)).toBe('http://localhost:8080');
    expect(assertSecureApiUrl('https://api.rephelper.com', false)).toBe('https://api.rephelper.com');
    expect(() => assertSecureApiUrl('http://api.rephelper.com', false)).toThrow(
      'API_BASE_URL deve usar HTTPS em produção'
    );
  });

  it('returns empty string when URL is undefined or blank', () => {
    expect(assertSecureApiUrl(undefined, false)).toBe('');
    expect(assertSecureApiUrl('', false)).toBe('');
    expect(assertSecureApiUrl('   ', true)).toBe('');
  });

  it('allows relative paths and same-origin URLs, but rejects cross-origin absolute URLs', () => {
    expect(isSameOriginRequest('/api/v1/tasks', 'https://api.rephelper.com')).toBe(true);
    expect(isSameOriginRequest('api/v1/notifications', 'https://api.rephelper.com')).toBe(true);
    expect(
      isSameOriginRequest('https://api.rephelper.com/api/v1/tasks', 'https://api.rephelper.com')
    ).toBe(true);
    expect(
      isSameOriginRequest('https://evil.example.com/steal', 'https://api.rephelper.com')
    ).toBe(false);
    expect(
      isSameOriginRequest('//evil.example.com/steal', 'https://api.rephelper.com')
    ).toBe(false);
  });

  it('handles undefined, empty, malformed, and invalid base URLs safely without throwing', () => {
    expect(isSameOriginRequest(undefined, 'https://api.rephelper.com')).toBe(false);
    expect(isSameOriginRequest('', 'https://api.rephelper.com')).toBe(false);
    expect(isSameOriginRequest('/api/v1/tasks', undefined)).toBe(true);
    expect(isSameOriginRequest('/api/v1/tasks', '')).toBe(true);
    expect(isSameOriginRequest('/api/v1/tasks', 'not-a-valid-url')).toBe(true);
    expect(isSameOriginRequest('https://api.rephelper.com/api/v1/tasks', undefined)).toBe(false);
    expect(isSameOriginRequest('https://api.rephelper.com/api/v1/tasks', 'not-a-valid-url')).toBe(false);
    expect(isSameOriginRequest('javascript:alert(1)', 'https://api.rephelper.com')).toBe(false);
  });
});

describe('storage security', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('applies WHEN_UNLOCKED_THIS_DEVICE_ONLY by default on native platforms', async () => {
    const setItemAsync = jest.fn().mockResolvedValue(undefined);
    const getItemAsync = jest.fn().mockResolvedValue('jwt-123');
    const deleteItemAsync = jest.fn().mockResolvedValue(undefined);

    await jest.isolateModulesAsync(async () => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
      jest.doMock('expo-secure-store', () => ({
        WHEN_UNLOCKED_THIS_DEVICE_ONLY: 5,
        setItemAsync,
        getItemAsync,
        deleteItemAsync,
      }));

      const storage = require('../storage');
      await storage.storeToken('jwt-123');
      expect(setItemAsync).toHaveBeenCalledWith('auth_token', 'jwt-123', {
        keychainAccessible: 5,
      });

      const token = await storage.getToken();
      expect(token).toBe('jwt-123');
      expect(getItemAsync).toHaveBeenCalledWith('auth_token', {
        keychainAccessible: 5,
      });

      await storage.removeToken();
      expect(deleteItemAsync).toHaveBeenCalledWith('auth_token', {
        keychainAccessible: 5,
      });
    });
  });

  it('uses sessionStorage on web and removes legacy localStorage entries', async () => {
    const sessionMap = new Map<string, string>();
    const localMap = new Map<string, string>([
      ['auth_token', 'legacy-jwt'],
      ['refresh_token', 'legacy-refresh'],
      ['user', '{"id":"1"}'],
    ]);

    const mockSessionStorage = {
      getItem: jest.fn((k: string) => sessionMap.get(k) ?? null),
      setItem: jest.fn((k: string, v: string) => sessionMap.set(k, v)),
      removeItem: jest.fn((k: string) => sessionMap.delete(k)),
    };
    const mockLocalStorage = {
      getItem: jest.fn((k: string) => localMap.get(k) ?? null),
      setItem: jest.fn((k: string, v: string) => localMap.set(k, v)),
      removeItem: jest.fn((k: string) => localMap.delete(k)),
    };

    const originalWindow = (global as any).window;
    (global as any).window = {
      sessionStorage: mockSessionStorage,
      localStorage: mockLocalStorage,
    };

    try {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
        jest.doMock('expo-secure-store', () => ({
          WHEN_UNLOCKED_THIS_DEVICE_ONLY: 5,
          setItemAsync: jest.fn(),
          getItemAsync: jest.fn(),
          deleteItemAsync: jest.fn(),
        }));

        const storage = require('../storage');
        await storage.storeToken('web-jwt');
        expect(mockSessionStorage.setItem).toHaveBeenCalledWith('auth_token', 'web-jwt');
        expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

        expect(await storage.getToken()).toBe('web-jwt');

        await storage.clearAuthData();
        expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('auth_token');
        expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('refresh_token');
        expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('user');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
      });
    } finally {
      (global as any).window = originalWindow;
    }
  });
});
