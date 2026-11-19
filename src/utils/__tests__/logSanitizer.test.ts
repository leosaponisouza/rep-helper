import { sanitizeForLog } from '../logSanitizer';
import { logger } from '../logger';
import { ErrorHandler } from '../errorHandling';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

describe('sanitizeForLog', () => {
  it('redacts sensitive keys case-insensitively in nested objects', () => {
    const input = {
      name: 'Maria',
      email: 'maria@example.com',
      phoneNumber: '+5511999998888',
      password: 'Secret123!',
      config: {
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig',
          'Content-Type': 'application/json',
        },
      },
      firebaseToken: 'abc123',
    };

    const sanitized = sanitizeForLog(input) as Record<string, any>;
    expect(sanitized.name).toBe('Maria');
    expect(sanitized.email).toBe('[REDACTED]');
    expect(sanitized.phoneNumber).toBe('[REDACTED]');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.firebaseToken).toBe('[REDACTED]');
    expect(sanitized.config.headers.Authorization).toBe('[REDACTED]');
    expect(sanitized.config.headers['Content-Type']).toBe('application/json');
  });

  it('redacts inline Bearer and JWT strings and handles circular references safely', () => {
    const circular: Record<string, any> = {
      msg: 'Failed with Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig',
    };
    circular.self = circular;

    const sanitized = sanitizeForLog(circular) as Record<string, any>;
    expect(sanitized.msg).not.toContain('eyJhbGci');
    expect(sanitized.msg).toContain('[REDACTED]');
    expect(sanitized.self).toBe('[Circular]');
  });

  it('handles Axios-like Error instances with circular refs and config.headers.Authorization without throwing or leaking secrets', () => {
    const axiosErr: any = new Error(
      'Request failed with Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig'
    );
    axiosErr.name = 'AxiosError';
    axiosErr.code = 'ERR_BAD_REQUEST';
    axiosErr.config = {
      headers: {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig',
      },
    };
    axiosErr.request = {};
    axiosErr.request.self = axiosErr.request;
    axiosErr.response = { status: 401 };

    const sanitized = sanitizeForLog(axiosErr) as Record<string, any>;
    const serialized = JSON.stringify(sanitized);

    expect(sanitized.name).toBe('AxiosError');
    expect(sanitized.code).toBe('ERR_BAD_REQUEST');
    expect(sanitized.status).toBe(401);
    expect(sanitized.message).toContain('[REDACTED]');
    expect(serialized).not.toContain('eyJhbGci');
    expect(sanitized.config).toBeUndefined();
    expect(sanitized.request).toBeUndefined();
  });

  it('redacts additional sensitive keys such as inviteCode, refreshToken, secret, apiKey, cookie', () => {
    const input = {
      inviteCode: 'REP123',
      code: 'ABC999',
      refreshToken: 'rt-123',
      accessToken: 'at-123',
      idToken: 'it-123',
      secret: 's3cr3t',
      apiKey: 'key-123',
      cookie: 'session=xyz',
      'Set-Cookie': 'session=xyz',
      senha: 'minhasenha',
      phone: '11999998888',
      items: [{ token: 't1', title: 'Conta de luz' }],
    };

    const sanitized = sanitizeForLog(input) as Record<string, any>;
    expect(sanitized.inviteCode).toBe('[REDACTED]');
    expect(sanitized.code).toBe('[REDACTED]');
    expect(sanitized.refreshToken).toBe('[REDACTED]');
    expect(sanitized.accessToken).toBe('[REDACTED]');
    expect(sanitized.idToken).toBe('[REDACTED]');
    expect(sanitized.secret).toBe('[REDACTED]');
    expect(sanitized.apiKey).toBe('[REDACTED]');
    expect(sanitized.cookie).toBe('[REDACTED]');
    expect(sanitized['Set-Cookie']).toBe('[REDACTED]');
    expect(sanitized.senha).toBe('[REDACTED]');
    expect(sanitized.phone).toBe('[REDACTED]');
    expect(sanitized.items[0].token).toBe('[REDACTED]');
    expect(sanitized.items[0].title).toBe('Conta de luz');
  });
});

describe('logger & ErrorHandler sanitization integration', () => {
  const originalDev = (global as any).__DEV__;

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  it('redacts secrets in logger.debug, logger.info, logger.warn, and logger.error', () => {
    (global as any).__DEV__ = true;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    logger.debug('Auth Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig', {
      email: 'user@test.com',
    });
    logger.info('Info', { phoneNumber: '11999998888' });
    logger.warn('Warn', { inviteCode: 'XYZ123' });
    logger.error('Erro token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig', {
      password: '123',
    });

    expect(logSpy).toHaveBeenCalledWith('[DEBUG] Auth [REDACTED]', {
      email: '[REDACTED]',
    });
    expect(infoSpy).toHaveBeenCalledWith('[INFO] Info', {
      phoneNumber: '[REDACTED]',
    });
    expect(warnSpy).toHaveBeenCalledWith('[WARN] Warn', {
      inviteCode: '[REDACTED]',
    });
    expect(errorSpy).toHaveBeenCalledWith('[ERROR] Erro token [REDACTED]', {
      password: '[REDACTED]',
    });
  });

  it('ErrorHandler.logError sanitizes context and circular Axios-like originalError without throwing', () => {
    (global as any).__DEV__ = true;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const axiosErr: any = new Error('Fail Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig');
    axiosErr.config = {
      headers: {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig',
      },
    };
    axiosErr.self = axiosErr;

    expect(() =>
      ErrorHandler.logError({
        type: 'authentication',
        message: 'Falha com Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig',
        severity: 'error',
        context: { email: 'a@b.com', action: 'login' },
        originalError: axiosErr,
      })
    ).not.toThrow();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [prefixMsg, logData] = errorSpy.mock.calls[0];
    expect(prefixMsg).toContain('[REDACTED]');
    expect(prefixMsg).not.toContain('eyJhbGci');
    expect(logData.context).toEqual({ email: '[REDACTED]', action: 'login' });
    expect(JSON.stringify(logData)).not.toContain('eyJhbGci');
  });
});
