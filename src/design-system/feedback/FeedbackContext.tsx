import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorHandler } from '../../utils/errorHandling';
import { ConfirmDialog } from '../primitives/ConfirmDialog';
import { Toast, ToastTone } from '../primitives/Toast';
import { useTheme } from '../theme/useTheme';

export type { ToastTone } from '../primitives/Toast';

export interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  duration?: number;
  onPress?: () => void;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface FeedbackContextValue {
  toast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface ActiveToastItem {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
  onPress?: () => void;
}

interface ConfirmQueueItem {
  id: number;
  options: ConfirmOptions;
  resolve: (accepted: boolean) => void;
}

const MAX_VISIBLE_TOASTS = 3;
const DEFAULT_TOAST_DURATION = 3500;
const ZERO_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function useSafeInsets(): EdgeInsets {
  try {
    return useSafeAreaInsets();
  } catch {
    return ZERO_INSETS;
  }
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

/**
 * Global feedback provider managing stacked editorial Toasts, a deterministic
 * FIFO ConfirmDialog promise queue, and ErrorHandler toast handler registration.
 */
export function FeedbackProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { theme } = useTheme();
  const insets = useSafeInsets();

  const [toasts, setToasts] = useState<ActiveToastItem[]>([]);
  const [confirmQueue, setConfirmQueue] = useState<ConfirmQueueItem[]>([]);

  const isMountedRef = useRef(true);
  const toastCounterRef = useRef(0);
  const confirmCounterRef = useRef(0);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const confirmQueueRef = useRef<ConfirmQueueItem[]>([]);

  const clearToastTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback(
    (id: string) => {
      clearToastTimer(id);
      if (!isMountedRef.current) {
        return;
      }
      setToasts((prev) => prev.filter((item) => item.id !== id));
    },
    [clearToastTimer]
  );

  const toast = useCallback(
    (options: ToastOptions): string => {
      toastCounterRef.current += 1;
      const id = `toast-${toastCounterRef.current}`;

      if (!isMountedRef.current) {
        return id;
      }

      const item: ActiveToastItem = {
        id,
        title: options.title,
        message: options.message,
        tone: options.tone ?? 'info',
        onPress: options.onPress
          ? () => {
              options.onPress?.();
              dismissToast(id);
            }
          : undefined,
      };

      setToasts((prev) => {
        const next = [item, ...prev];
        if (next.length > MAX_VISIBLE_TOASTS) {
          for (const evicted of next.slice(MAX_VISIBLE_TOASTS)) {
            clearToastTimer(evicted.id);
          }
        }
        return next.slice(0, MAX_VISIBLE_TOASTS);
      });

      const durationMs = options.duration ?? DEFAULT_TOAST_DURATION;
      if (Number.isFinite(durationMs) && durationMs > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, durationMs);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [clearToastTimer, dismissToast]
  );

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    if (!isMountedRef.current) {
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      confirmCounterRef.current += 1;
      const entry: ConfirmQueueItem = {
        id: confirmCounterRef.current,
        options,
        resolve,
      };
      confirmQueueRef.current.push(entry);
      setConfirmQueue([...confirmQueueRef.current]);
    });
  }, []);

  const resolveConfirmById = useCallback((id: number, accepted: boolean) => {
    const head = confirmQueueRef.current[0];
    if (!head || head.id !== id) {
      return;
    }
    confirmQueueRef.current.shift();
    if (isMountedRef.current) {
      setConfirmQueue([...confirmQueueRef.current]);
    }
    head.resolve(accepted);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    ErrorHandler.registerToastHandler(({ title, message, tone }) => {
      toast({ title, message, tone });
    });

    return () => {
      isMountedRef.current = false;
      ErrorHandler.registerToastHandler(null);

      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();

      while (confirmQueueRef.current.length > 0) {
        const pending = confirmQueueRef.current.shift();
        pending?.resolve(false);
      }
    };
  }, [toast]);

  const value = useMemo<FeedbackContextValue>(
    () => ({
      toast,
      dismissToast,
      confirm,
    }),
    [toast, dismissToast, confirm]
  );

  const activeConfirm = confirmQueue[0] ?? null;

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {toasts.length > 0 ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.toastOverlay,
            {
              paddingTop: insets.top + theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              gap: theme.spacing.xs,
            },
          ]}
        >
          <View pointerEvents="box-none" style={[styles.toastStack, { gap: theme.spacing.xs }]}>
            {toasts.map((item) => (
              <Toast
                key={item.id}
                title={item.title}
                message={item.message}
                tone={item.tone}
                onDismiss={() => dismissToast(item.id)}
                onPress={item.onPress}
              />
            ))}
          </View>
        </View>
      ) : null}

      <ConfirmDialog
        visible={activeConfirm !== null}
        title={activeConfirm?.options.title ?? ''}
        message={activeConfirm?.options.message ?? ''}
        confirmLabel={activeConfirm?.options.confirmLabel}
        cancelLabel={activeConfirm?.options.cancelLabel}
        destructive={activeConfirm?.options.destructive}
        onConfirm={() => {
          if (activeConfirm) {
            resolveConfirmById(activeConfirm.id, true);
          }
        }}
        onCancel={() => {
          if (activeConfirm) {
            resolveConfirmById(activeConfirm.id, false);
          }
        }}
      />
    </FeedbackContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastStack: {
    width: '100%',
    maxWidth: 520,
  },
});
