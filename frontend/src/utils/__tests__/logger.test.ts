import { logger } from '../logger';

describe('logger', () => {
  const originalDev = (global as any).__DEV__;

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  it('emits debug and info logs when __DEV__ is true', () => {
    (global as any).__DEV__ = true;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    logger.debug('debug msg', { id: 1 });
    logger.info('info msg');

    expect(logSpy).toHaveBeenCalledWith('[DEBUG] debug msg', { id: 1 });
    expect(infoSpy).toHaveBeenCalledWith('[INFO] info msg');
  });

  it('suppresses debug, info, and warn logs when __DEV__ is false', () => {
    (global as any).__DEV__ = false;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    logger.debug('secret token');
    logger.info('user data');
    logger.warn('warning');

    expect(logSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
