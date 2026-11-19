// components/Event/CalendarSkeleton.tsx
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Divider, Skeleton, Surface, useTheme } from '../../src/design-system';

const MAX_CONTENT_WIDTH = 960;

const CalendarSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const effectiveWidth = Math.min(windowWidth, MAX_CONTENT_WIDTH);
  const horizontalBudget = effectiveWidth - theme.spacing.md * 4 - theme.spacing.xs * 6;
  const daySize = Math.max(30, Math.min(44, Math.floor(horizontalBudget / 7)));

  const daysOfWeek = Array(7).fill(0);
  const calendarDays = Array(35).fill(0);
  const eventItems = Array(3).fill(0);

  return (
    <View style={[styles.container, { padding: theme.spacing.md, gap: theme.spacing.md }]}>
      <Surface
        tone="surface"
        bordered
        padded="md"
        radiusKey="md"
        style={{ gap: theme.spacing.sm }}
      >
        <View style={styles.monthHeader}>
          <Skeleton width={136} height={20} radiusKey="sm" />
          <View style={[styles.arrowsContainer, { gap: theme.spacing.xs }]}>
            <Skeleton width={28} height={28} radiusKey="full" />
            <Skeleton width={28} height={28} radiusKey="full" />
          </View>
        </View>

        <View style={styles.daysOfWeek}>
          {daysOfWeek.map((_, index) => (
            <Skeleton key={`weekday-${index}`} width={22} height={12} radiusKey="sm" />
          ))}
        </View>

        <View style={[styles.calendarGrid, { gap: theme.spacing.xxs }]}>
          {calendarDays.map((_, index) => (
            <View
              key={`cell-${index}`}
              style={[
                styles.dayCell,
                { width: daySize, height: daySize },
              ]}
            >
              <Skeleton width={daySize - 4} height={daySize - 4} radiusKey="full" />
            </View>
          ))}
        </View>
      </Surface>

      <Surface
        tone="surface"
        bordered
        padded="md"
        radiusKey="md"
        style={{ gap: theme.spacing.md }}
      >
        <View style={styles.eventsHeader}>
          <Skeleton width={150} height={18} radiusKey="sm" />
          <Skeleton width={76} height={16} radiusKey="sm" />
        </View>

        <Divider />

        {eventItems.map((_, index) => (
          <View key={`event-${index}`} style={{ gap: theme.spacing.sm }}>
            <View style={{ gap: theme.spacing.xs }}>
              <View style={styles.eventTitleRow}>
                <Skeleton width="62%" height={18} radiusKey="sm" />
                <Skeleton width={72} height={14} radiusKey="sm" />
              </View>
              <Skeleton width="85%" height={14} radiusKey="sm" />
              <View style={[styles.eventMetaRow, { gap: theme.spacing.md }]}>
                <Skeleton width={90} height={12} radiusKey="sm" />
                <Skeleton width={110} height={12} radiusKey="sm" />
              </View>
            </View>
            {index < eventItems.length - 1 ? <Divider /> : null}
          </View>
        ))}
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  arrowsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  daysOfWeek: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default CalendarSkeleton;
