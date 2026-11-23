import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { isToday, isValid } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import {
  Avatar,
  Divider,
  ListRow,
  StatusText,
  useMotion,
  useTheme,
  type StatusTone,
} from '../../src/design-system';
import { Task } from '../../src/models/task.model';
import { formatLocalDate, parseISOPreservingTime } from '../../src/utils/dateUtils';

export interface TaskItemProps {
  item: Task;
  onToggleStatus: (task: Task) => Promise<void> | void;
  currentUserId?: string;
  pendingTaskIds: number[];
  onPress: (taskId: number) => void;
  variant?: 'compact' | 'detailed';
  showDivider?: boolean;
}

const triggerSelectionHaptic = () => {
  if (Platform.OS === 'web') return;
  try {
    void Promise.resolve(Haptics.selectionAsync()).catch(() => {});
  } catch {
    // Ignore haptics errors on unsupported devices
  }
};

function getTaskStatusDisplay(item: Task): { label: string; tone: StatusTone } {
  if (item.status === 'COMPLETED') {
    return { label: 'Feito', tone: 'success' };
  }
  if (item.status === 'CANCELLED') {
    return { label: 'Cancelada', tone: 'neutral' };
  }
  if (item.status === 'OVERDUE') {
    return { label: 'Atrasado', tone: 'danger' };
  }

  if (item.dueDate) {
    const parsedDue = parseISOPreservingTime(item.dueDate);
    if (isValid(parsedDue)) {
      if (parsedDue.getTime() < Date.now()) {
        return { label: 'Atrasado', tone: 'danger' };
      }
      if (isToday(parsedDue)) {
        return { label: 'Hoje', tone: 'warning' };
      }
    }
  }

  if (item.status === 'IN_PROGRESS') {
    return { label: 'Em andamento', tone: 'accent' };
  }

  return { label: 'Pendente', tone: 'warning' };
}

/**
 * Editorial task row with square checkbox, 160ms completion transition,
 * platform-safe haptic feedback, StatusText metadata, and hairline Divider.
 */
const TaskItem = memo(
  ({
    item,
    onPress,
    onToggleStatus,
    currentUserId,
    pendingTaskIds,
    variant = 'detailed',
    showDivider = true,
  }: TaskItemProps) => {
    const { theme } = useTheme();
    const motion = useMotion();

    const isPending = pendingTaskIds.includes(item.id);
    const isAssigned = Boolean(item.assignedUsers?.some((u) => u.uid === currentUserId));
    const isCreator = item.createdBy?.uid === currentUserId;
    const isCompleted = item.status === 'COMPLETED';
    const isCancelled = item.status === 'CANCELLED';
    const isInProgress = item.status === 'IN_PROGRESS';
    const canChangeStatus = (isCreator || isAssigned) && !isCompleted && !isCancelled;

    const completionAnim = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;

    useEffect(() => {
      const animation = Animated.timing(completionAnim, {
        toValue: isCompleted ? 1 : 0,
        duration: motion.duration(160, { allowReducedFade: true }),
        easing: theme.motion.easing.standard,
        useNativeDriver: motion.useNativeDriver,
      });
      animation.start();

      return () => {
        animation.stop();
      };
    }, [
      isCompleted,
      completionAnim,
      motion,
      theme.motion.easing.standard,
    ]);

    const rowOpacity = useMemo(
      () =>
        completionAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.68],
        }),
      [completionAnim]
    );

    const taskTitle = item.title || 'Tarefa sem título';
    const statusDisplay = getTaskStatusDisplay(item);

    const assignedUser =
      item.assignedUsers?.find((u) => u.uid === currentUserId) ||
      (item.assignedUsers?.length ? item.assignedUsers[0] : null);

    const userName = isAssigned
      ? 'Você'
      : assignedUser?.nickname || assignedUser?.name || 'Responsável';

    const dueDateLabel = useMemo(() => {
      if (!item.dueDate) return null;
      const parsed = parseISOPreservingTime(item.dueDate);
      if (!isValid(parsed)) return null;
      return formatLocalDate(parsed, "d 'de' MMM");
    }, [item.dueDate]);

    const subtitle = useMemo(() => {
      const parts = [
        dueDateLabel,
        item.category || null,
        item.recurring ? 'Recorrente' : null,
        variant === 'detailed' && assignedUser ? userName : null,
      ].filter(Boolean);

      if (parts.length > 0) {
        return parts.join(' · ');
      }
      return item.description || undefined;
    }, [dueDateLabel, item.category, item.recurring, variant, assignedUser, userName, item.description]);

    const handleCheckboxPress = () => {
      if (!canChangeStatus || isPending) return;
      triggerSelectionHaptic();
      void onToggleStatus(item);
    };

    const checkboxLabel = isInProgress
      ? `Concluir tarefa ${taskTitle}`
      : canChangeStatus
        ? `Iniciar tarefa ${taskTitle}`
        : `Status da tarefa ${taskTitle}`;

    return (
      <View style={{ backgroundColor: theme.colors.surface }}>
        <Animated.View
          style={[
            styles.row,
            {
              paddingLeft: theme.spacing.xs,
              opacity: rowOpacity,
            },
          ]}
        >
          <Pressable
            onPress={handleCheckboxPress}
            disabled={!canChangeStatus || isPending}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityLabel={checkboxLabel}
            accessibilityState={{
              checked: isCompleted,
              disabled: !canChangeStatus || isPending,
            }}
            style={({ pressed }) => [
              styles.checkboxHitArea,
              pressed && canChangeStatus && !isPending
                ? { opacity: theme.motion.pressOpacity }
                : undefined,
            ]}
          >
            <View
              style={[
                styles.checkboxBox,
                {
                  borderRadius: theme.radius.sm,
                  borderColor:
                    isCompleted || isInProgress
                      ? theme.colors.accent
                      : theme.colors.borderStrong,
                  backgroundColor: isCompleted ? theme.colors.accent : 'transparent',
                },
                !canChangeStatus && !isCompleted ? styles.checkboxDisabled : undefined,
              ]}
            >
              {isPending ? (
                <ActivityIndicator
                  size="small"
                  color={isCompleted ? theme.colors.onAccent : theme.colors.accent}
                />
              ) : isCompleted ? (
                <Check size={14} strokeWidth={2.5} color={theme.colors.onAccent} />
              ) : null}
            </View>
          </Pressable>

          <View style={styles.rowContent}>
            <ListRow
              title={taskTitle}
              subtitle={subtitle}
              strikethrough={isCompleted}
              style={{ paddingLeft: theme.spacing.xxs }}
              onPress={() => onPress(item.id)}
              trailing={
                <View style={[styles.trailing, { gap: theme.spacing.xs }]}>
                  <StatusText
                    label={statusDisplay.label}
                    tone={statusDisplay.tone}
                    showDot
                  />
                  {variant === 'detailed' && assignedUser ? (
                    <Avatar
                      uri={assignedUser.profilePictureUrl}
                      name={assignedUser.nickname || assignedUser.name || userName}
                      size="sm"
                    />
                  ) : null}
                </View>
              }
            />
          </View>
        </Animated.View>
        {showDivider ? <Divider /> : null}
      </View>
    );
  }
);

TaskItem.displayName = 'TaskItem';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxHitArea: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderWidth: 1.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDisabled: {
    opacity: 0.45,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default TaskItem;
