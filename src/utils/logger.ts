// src/utils/logger.ts
import { sanitizeForLog, scrubString } from './logSanitizer';

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
      console.log(`[DEBUG] ${scrubString(message)}`, ...meta.map(sanitizeForLog));
    }
  },
  info(message: string, ...meta: unknown[]) {
    if (isDevEnvironment()) {
      console.info(`[INFO] ${scrubString(message)}`, ...meta.map(sanitizeForLog));
    }
  },
  warn(message: string, ...meta: unknown[]) {
    if (isDevEnvironment()) {
      console.warn(`[WARN] ${scrubString(message)}`, ...meta.map(sanitizeForLog));
    }
  },
  error(message: string, ...meta: unknown[]) {
    if (isDevEnvironment()) {
      console.error(`[ERROR] ${scrubString(message)}`, ...meta.map(sanitizeForLog));
    }
  },
};

export default logger;
