// src/utils/logger.ts

export interface Logger {
  debug: (message: string, ...meta: unknown[]) => void;
  info: (message: string, ...meta: unknown[]) => void;
  warn: (message: string, ...meta: unknown[]) => void;
  error: (message: string, ...meta: unknown[]) => void;
}

const isDevEnvironment = (): boolean => {
  return typeof __DEV__ !== 'undefined' && Boolean(__DEV__);
};

export const logger: Logger = {
  debug(message: string, ...meta: unknown[]) {
    if (isDevEnvironment()) {
      console.log(`[DEBUG] ${message}`, ...meta);
    }
  },
  info(message: string, ...meta: unknown[]) {
    if (isDevEnvironment()) {
      console.info(`[INFO] ${message}`, ...meta);
    }
  },
  warn(message: string, ...meta: unknown[]) {
    if (isDevEnvironment()) {
      console.warn(`[WARN] ${message}`, ...meta);
    }
  },
  error(message: string, ...meta: unknown[]) {
    if (isDevEnvironment()) {
      console.error(`[ERROR] ${message}`, ...meta);
    }
  },
};

export default logger;
