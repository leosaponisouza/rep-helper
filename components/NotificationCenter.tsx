import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  BellOff,
  Calendar,
  Check,
  CheckCheck,
  CheckSquare,
  ChevronRight,
  Receipt,
  RefreshCw,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native';
import {
  AppText,
  BottomSheetModal,
  Button,
  Divider,
  IconButton,
  ListRow,
  SegmentedTabs,
  StateView,
  StatusText,
  Surface,
  useMotion,
  useTheme,
  type SegmentedTabOption,
  type ThemeColors,
} from '../src/design-system';
import {
  Notification,
  NotificationType,
  useNotifications,
} from '../src/hooks/useNotifications';
import { getRelativeTime } from '../src/utils/dateUtils';

type NotificationWithRawType = Omit<Notification, 'type'> & {
  type: string;
};

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

type EntityCategory = 'task' | 'event' | 'expense' | 'income' | 'general';

interface EntityDisplaySpec {
  Icon: LucideIcon;
  colorKey: keyof Pick<ThemeColors, 'accent' | 'warning' | 'danger' | 'success' | 'inkSecondary'>;
  mainRoute: string | null;
  detailPrefix: string | null;
}

const ENTITY_SPEC_MAP: Record<EntityCategory, EntityDisplaySpec> = {
  task: {
    Icon: CheckSquare,
    colorKey: 'accent',
    mainRoute: '/(panel)/tasks',
    detailPrefix: '/(panel)/tasks',
  },
  event: {
    Icon: Calendar,
    colorKey: 'warning',
    mainRoute: '/(panel)/events',
    detailPrefix: '/(panel)/events',
  },
  expense: {
    Icon: Receipt,
    colorKey: 'danger',
    mainRoute: '/(panel)/finances/expenses',
    detailPrefix: '/(panel)/finances/expenses',
  },
  income: {
    Icon: TrendingUp,
    colorKey: 'success',
    mainRoute: '/(panel)/finances/incomes',
    detailPrefix: '/(panel)/finances/incomes',
  },
  general: {
    Icon: Bell,
    colorKey: 'inkSecondary',
    mainRoute: null,
    detailPrefix: null,
  },
};

const FRIENDLY_TYPE_NAMES: Record<string, string> = {
  task: 'Tarefa',
  event: 'Evento',
  finance: 'Finanças',
  general: 'Aviso',
  TASK_ASSIGNED: 'Tarefa atribuída',
  TASK_COMPLETED: 'Tarefa concluída',
  EXPENSE_CREATED: 'Despesa criada',
  EXPENSE_ADDED: 'Despesa adicionada',
  EXPENSE_APPROVED: 'Despesa aprovada',
  EXPENSE_REIMBURSED: 'Despesa reembolsada',
};

function normalizeEntityCategory(entityType?: string): EntityCategory {
  const normalized = entityType?.toLowerCase() ?? '';
  if (normalized === 'task' || normalized === 'tasks') return 'task';
  if (normalized === 'event' || normalized === 'events') return 'event';
  if (normalized === 'expense' || normalized === 'expenses') return 'expense';
  if (normalized === 'income' || normalized === 'incomes') return 'income';
  return 'general';
}

function formatNotificationType(type: string): string {
  if (FRIENDLY_TYPE_NAMES[type]) {
    return FRIENDLY_TYPE_NAMES[type];
  }
  return type
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const NotificationItem: React.FC<{
  notification: NotificationWithRawType;
  showDivider: boolean;
  onPress: (notification: NotificationWithRawType) => void;
  onMarkAsRead: (id: string) => void;
}> = ({ notification, showDivider, onPress, onMarkAsRead }) => {
  const { theme } = useTheme();
  const category = normalizeEntityCategory(notification.entityType);
  const spec = ENTITY_SPEC_MAP[category];
  const Icon = spec.Icon;
  const iconColor = theme.colors[spec.colorKey];

  const relativeTime = getRelativeTime(notification.timestamp);
  const friendlyType = formatNotificationType(notification.type);
  const metadata = relativeTime ? `${friendlyType} · ${relativeTime}` : friendlyType;
  const subtitle = notification.message
    ? `${metadata} — ${notification.message}`
    : metadata;

  const hasDestination = Boolean(notification.entityId && spec.mainRoute && spec.detailPrefix);

  return (
    <View>
      <View
        style={[
          styles.itemRow,
          !notification.read ? { backgroundColor: theme.colors.accentSoft } : undefined,
        ]}
      >
        <ListRow
          title={notification.title}
          subtitle={subtitle}
          style={styles.itemListRow}
          onPress={() => onPress(notification)}
          accessibilityLabel={
            notification.read
              ? `${notification.title}, ${subtitle}`
              : `Não lida: ${notification.title}, ${subtitle}`
          }
          leading={
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: theme.colors.subtle,
                  borderRadius: theme.radius.full,
                  borderColor: !notification.read ? theme.colors.accent : theme.colors.line,
                },
              ]}
            >
              <Icon size={18} strokeWidth={1.75} color={iconColor} />
            </View>
          }
          trailing={
            hasDestination ? (
              <ChevronRight size={18} strokeWidth={1.75} color={theme.colors.inkMuted} />
            ) : null
          }
        />

        {!notification.read ? (
          <View style={[styles.markReadSlot, { paddingRight: theme.spacing.xs }]}>
            <IconButton
              icon={<Check size={18} strokeWidth={1.75} color={theme.colors.accent} />}
              onPress={() => onMarkAsRead(notification.id)}
              accessibilityLabel={`Marcar "${notification.title}" como lida`}
              variant="ghost"
            />
          </View>
        ) : null}
      </View>
      {showDivider ? <Divider /> : null}
    </View>
  );
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const motion = useMotion();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<NotificationType>('unread');
  const [refreshing, setRefreshing] = useState(false);
  const listFadeAnim = useRef(new Animated.Value(1)).current;

  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  useEffect(() => {
    if (visible) {
      void fetchNotifications(activeTab);
    }
  }, [visible, activeTab, fetchNotifications]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (!motion.shouldAnimate) {
      listFadeAnim.setValue(1);
      return;
    }

    listFadeAnim.setValue(0.4);
    const animation = Animated.timing(listFadeAnim, {
      toValue: 1,
      duration: motion.duration(theme.motion.duration.fast, { allowReducedFade: true }),
      easing: theme.motion.easing.standard,
      useNativeDriver: motion.useNativeDriver,
    });
    animation.start();

    return () => animation.stop();
  }, [
    visible,
    activeTab,
    notifications.length,
    motion,
    listFadeAnim,
    theme.motion.duration.fast,
    theme.motion.easing.standard,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchNotifications(activeTab);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, fetchNotifications]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      await markAsRead(id);
    },
    [markAsRead]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  const handleNotificationPress = useCallback(
    async (notification: NotificationWithRawType) => {
      if (!notification.read) {
        await markAsRead(notification.id);
      }

      const category = normalizeEntityCategory(notification.entityType);
      const spec = ENTITY_SPEC_MAP[category];

      if (notification.entityId && spec.mainRoute && spec.detailPrefix) {
        onClose();
        router.push(spec.mainRoute as any);
        setTimeout(() => {
          router.push(`${spec.detailPrefix}/${notification.entityId}` as any);
        }, 100);
        return;
      }

      onClose();
    },
    [markAsRead, onClose, router]
  );

  const tabOptions: ReadonlyArray<SegmentedTabOption<NotificationType>> = [
    {
      value: 'unread',
      label: 'Não lidas',
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { value: 'all', label: 'Todas' },
  ];

  const hasUnreadItems = notifications.some((item) => !item.read);

  const renderContent = () => {
    if (loading && !refreshing && notifications.length === 0) {
      return <StateView kind="loading" title="Carregando notificações..." />;
    }

    if (error && notifications.length === 0) {
      return (
        <StateView
          kind="error"
          title="Erro ao carregar notificações"
          description={error}
          actionLabel="Tentar novamente"
          onAction={() => void fetchNotifications(activeTab)}
        />
      );
    }

    if (notifications.length === 0) {
      return (
        <StateView
          kind="empty"
          icon={<BellOff size={32} strokeWidth={1.75} color={theme.colors.inkMuted} />}
          title={activeTab === 'unread' ? 'Sem notificações não lidas' : 'Nenhuma notificação'}
          description={
            activeTab === 'unread'
              ? 'Você não tem notificações não lidas no momento.'
              : 'Você não tem notificações para visualizar.'
          }
          actionLabel={activeTab === 'unread' ? 'Ver todas as notificações' : undefined}
          onAction={activeTab === 'unread' ? () => setActiveTab('all') : undefined}
        />
      );
    }

    const typedNotifications = notifications as NotificationWithRawType[];

    return (
      <Animated.View style={{ opacity: listFadeAnim, gap: theme.spacing.sm }}>
        <Surface tone="surface" bordered style={styles.listSurface}>
          {typedNotifications.map((item, index) => (
            <NotificationItem
              key={item.id}
              notification={item}
              showDivider={index < typedNotifications.length - 1}
              onPress={handleNotificationPress}
              onMarkAsRead={handleMarkAsRead}
            />
          ))}
        </Surface>

        <AppText variant="caption" color="inkMuted" style={styles.endOfListText}>
          {activeTab === 'unread'
            ? 'Sem mais notificações não lidas'
            : 'Fim das notificações'}
        </AppText>
      </Animated.View>
    );
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="Notificações">
      <View style={{ gap: theme.spacing.md }}>
        <SegmentedTabs
          options={tabOptions}
          value={activeTab}
          onChange={setActiveTab}
        />

        <View style={[styles.toolbarRow, { gap: theme.spacing.xs }]}>
          <StatusText
            tone={unreadCount > 0 ? 'accent' : 'neutral'}
            showDot={unreadCount > 0}
            label={
              unreadCount > 0
                ? `${unreadCount} ${unreadCount === 1 ? 'não lida' : 'não lidas'}`
                : 'Tudo em dia'
            }
          />

          <View style={[styles.toolbarActions, { gap: theme.spacing.xxs }]}>
            {hasUnreadItems ? (
              <Button
                variant="ghost"
                size="sm"
                label="Marcar todas"
                leftIcon={
                  <CheckCheck size={16} strokeWidth={1.75} color={theme.colors.accent} />
                }
                onPress={() => void handleMarkAllAsRead()}
              />
            ) : null}

            <IconButton
              icon={
                <RefreshCw
                  size={18}
                  strokeWidth={1.75}
                  color={theme.colors.inkSecondary}
                />
              }
              onPress={() => void handleRefresh()}
              disabled={refreshing || loading}
              accessibilityLabel="Atualizar notificações"
              variant="ghost"
            />
          </View>
        </View>

        {renderContent()}
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listSurface: {
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemListRow: {
    flex: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markReadSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  endOfListText: {
    textAlign: 'center',
    paddingVertical: 4,
  },
});

export default NotificationCenter;
