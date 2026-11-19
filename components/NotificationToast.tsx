// components/NotificationToast.tsx
// Componente de notificação toast integrado ao design system

import React, { useEffect, useRef } from 'react';
import { Toast, ToastTone } from '@/src/design-system';

// Tipos de notificações toast
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// Interface para o objeto de notificação
export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  autoHide?: boolean;
  duration?: number;
  onPress?: () => void;
}

interface NotificationToastProps {
  notification: ToastNotification;
  onDismiss: (id: string) => void;
}

const NOTIFICATION_TONE_MAP: Record<NotificationType, ToastTone> = {
  success: 'success',
  error: 'danger',
  warning: 'warning',
  info: 'info',
};

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
}) => {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (notification.autoHide === false) {
      return;
    }

    const timer = setTimeout(() => {
      onDismissRef.current(notification.id);
    }, notification.duration ?? 3500);

    return () => {
      clearTimeout(timer);
    };
  }, [notification.id, notification.autoHide, notification.duration]);

  const handlePress = notification.onPress
    ? () => {
        notification.onPress?.();
        onDismissRef.current(notification.id);
      }
    : undefined;

  return (
    <Toast
      title={notification.title}
      message={notification.message}
      tone={NOTIFICATION_TONE_MAP[notification.type] ?? 'info'}
      onDismiss={() => onDismissRef.current(notification.id)}
      onPress={handlePress}
    />
  );
};

export default NotificationToast;
