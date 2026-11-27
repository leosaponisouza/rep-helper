// components/Event/EventItem.tsx
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Calendar, CheckCircle2, Clock, MapPin, Radio } from 'lucide-react-native';
import {
  AppText,
  Divider,
  StatusText,
  Surface,
  useMotion,
  useTheme,
  type StatusTone,
} from '../../src/design-system';
import { EventInvitation } from '../../src/services/events/eventsTypes';
import { formatTime } from '../../src/utils/dateUtils';
import { logger } from '../../src/utils/logger';

interface EventItemProps {
  event: any;
  onPress: () => void;
  currentUserId: string;
}

const formatEventTime = (dateString?: string): string => {
  if (!dateString || typeof dateString !== 'string') return '';
  try {
    const formatted = formatTime(dateString);
    if (formatted) {
      return formatted;
    }
    const parts = dateString.split('T');
    if (parts.length > 1) {
      return parts[1].substring(0, 5);
    }
    return '';
  } catch (error) {
    logger.error('Erro ao formatar horário do evento:', error);
    return '';
  }
};

const EventItem: React.FC<EventItemProps> = ({ event, onPress, currentUserId }) => {
  const { theme } = useTheme();
  const motion = useMotion();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isValidEvent = Boolean(event && typeof event === 'object');
  const isFinished = isValidEvent && event.isFinished === true;
  const isHappening = isValidEvent && event.isHappening === true;

  const invitations: EventInvitation[] = useMemo(() => {
    if (!isValidEvent || !Array.isArray(event.invitations)) {
      return [];
    }
    return event.invitations;
  }, [isValidEvent, event?.invitations]);

  const userStatus = useMemo(() => {
    const userInvitation = invitations.find((inv) => inv?.userId === currentUserId);
    return userInvitation ? userInvitation.status : null;
  }, [invitations, currentUserId]);

  useEffect(() => {
    if (!isHappening || !motion.shouldAnimate) {
      pulseAnim.setValue(1);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: motion.duration(800),
          easing: theme.motion.easing.standard,
          useNativeDriver: motion.useNativeDriver,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: motion.duration(800),
          easing: theme.motion.easing.standard,
          useNativeDriver: motion.useNativeDriver,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
      pulseAnim.setValue(1);
    };
  }, [isHappening, motion, pulseAnim, theme.motion.easing.standard]);

  if (!isValidEvent) {
    return null;
  }

  const statusMeta: {
    label: string;
    tone: StatusTone;
    borderColor: string;
  } = isHappening
    ? {
        label: 'Acontecendo agora',
        tone: 'accent',
        borderColor: theme.colors.accent,
      }
    : isFinished
      ? {
          label: 'Concluído',
          tone: 'success',
          borderColor: theme.colors.success,
        }
      : {
          label: 'Agendado',
          tone: 'warning',
          borderColor: theme.colors.warning,
        };

  const confirmedCount = invitations.filter((inv) => inv?.status === 'CONFIRMED').length;
  const pendingCount = invitations.filter((inv) => inv?.status === 'INVITED').length;
  const declinedCount = invitations.filter((inv) => inv?.status === 'DECLINED').length;

  const startTime = formatEventTime(event.startDate);
  const endTime = formatEventTime(event.endDate);
  const timeRange =
    startTime && endTime
      ? `${startTime} – ${endTime}`
      : startTime || endTime || 'Horário não informado';

  const statusIcon = isHappening ? (
    <Animated.View
      pointerEvents="none"
      style={{ transform: [{ scale: pulseAnim }] }}
    >
      <Radio size={14} strokeWidth={1.75} color={theme.colors.accent} />
    </Animated.View>
  ) : isFinished ? (
    <CheckCircle2 size={14} strokeWidth={1.75} color={theme.colors.success} />
  ) : (
    <Calendar size={14} strokeWidth={1.75} color={theme.colors.warning} />
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title || 'Evento sem título'}, ${statusMeta.label}, ${timeRange}`}
      style={({ pressed }) => [
        {
          marginBottom: theme.spacing.sm,
          opacity: pressed ? theme.motion.pressOpacity : 1,
          transform:
            pressed && motion.shouldAnimate
              ? [{ scale: theme.motion.pressScale }]
              : undefined,
        },
      ]}
    >
      <Surface
        tone="surface"
        bordered
        padded="md"
        radiusKey="md"
        style={[
          styles.card,
          {
            borderLeftWidth: 3,
            borderLeftColor: statusMeta.borderColor,
            gap: theme.spacing.sm,
          },
        ]}
      >
        <View style={[styles.headerRow, { gap: theme.spacing.sm }]}>
          <View style={styles.titleBlock}>
            <AppText variant="bodyStrong" color="ink" numberOfLines={2}>
              {event.title || 'Evento sem título'}
            </AppText>
            <AppText
              variant="caption"
              color={event.description ? 'inkSecondary' : 'inkMuted'}
              numberOfLines={1}
            >
              {event.description || 'Sem descrição'}
            </AppText>
          </View>

          <StatusText
            label={statusMeta.label}
            tone={statusMeta.tone}
            icon={statusIcon}
          />
        </View>

        <View style={[styles.metaRow, { gap: theme.spacing.md }]}>
          <View style={[styles.metaItem, { gap: theme.spacing.xxs }]}>
            <Clock size={14} strokeWidth={1.75} color={theme.colors.inkMuted} />
            <AppText variant="monoLabel" color="inkSecondary">
              {timeRange}
            </AppText>
          </View>

          {event.location ? (
            <View style={[styles.metaItem, styles.locationItem, { gap: theme.spacing.xxs }]}>
              <MapPin size={14} strokeWidth={1.75} color={theme.colors.accent} />
              <AppText variant="caption" color="inkSecondary" numberOfLines={1}>
                {event.location}
              </AppText>
            </View>
          ) : null}
        </View>

        {event.requireRsvp === false ? (
          <>
            <Divider />
            <View style={[styles.footerRow, { gap: theme.spacing.sm }]}>
              <StatusText label="Aviso na agenda" tone="neutral" showDot />
            </View>
          </>
        ) : invitations.length > 0 ? (
          <>
            <Divider />
            <View style={[styles.footerRow, { gap: theme.spacing.sm }]}>
              <View style={[styles.countsGroup, { gap: theme.spacing.sm }]}>
                <StatusText
                  label={String(confirmedCount)}
                  tone="success"
                  showDot
                  style={
                    userStatus === 'CONFIRMED'
                      ? {
                          backgroundColor: theme.colors.successSoft,
                          paddingHorizontal: theme.spacing.xs,
                          paddingVertical: 2,
                          borderRadius: theme.radius.sm,
                        }
                      : undefined
                  }
                />
                <StatusText
                  label={String(pendingCount)}
                  tone="warning"
                  showDot
                  style={
                    userStatus === 'INVITED'
                      ? {
                          backgroundColor: theme.colors.warningSoft,
                          paddingHorizontal: theme.spacing.xs,
                          paddingVertical: 2,
                          borderRadius: theme.radius.sm,
                        }
                      : undefined
                  }
                />
                <StatusText
                  label={String(declinedCount)}
                  tone="danger"
                  showDot
                  style={
                    userStatus === 'DECLINED'
                      ? {
                          backgroundColor: theme.colors.dangerSoft,
                          paddingHorizontal: theme.spacing.xs,
                          paddingVertical: 2,
                          borderRadius: theme.radius.sm,
                        }
                      : undefined
                  }
                />
              </View>

              {userStatus ? (
                <AppText variant="caption" color="inkMuted">
                  {userStatus === 'CONFIRMED'
                    ? 'Você vai'
                    : userStatus === 'INVITED'
                      ? 'Convidado'
                      : 'Recusado'}
                </AppText>
              ) : null}
            </View>
          </>
        ) : null}
      </Surface>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationItem: {
    flexShrink: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  countsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default memo(EventItem);
