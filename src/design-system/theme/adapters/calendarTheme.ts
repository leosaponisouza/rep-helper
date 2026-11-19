import { fontFamilies } from '../../tokens/typography';
import { Theme } from '../types';

export type CalendarThemeConfig = {
  backgroundColor: string;
  calendarBackground: string;
  textSectionTitleColor: string;
  textSectionTitleDisabledColor: string;
  selectedDayBackgroundColor: string;
  selectedDayTextColor: string;
  todayTextColor: string;
  todayBackgroundColor: string;
  dayTextColor: string;
  textDisabledColor: string;
  textInactiveColor: string;
  dotColor: string;
  selectedDotColor: string;
  disabledDotColor: string;
  inactiveDotColor: string;
  todayDotColor: string;
  arrowColor: string;
  disabledArrowColor: string;
  monthTextColor: string;
  indicatorColor: string;
  reservationsBackgroundColor: string;
  textDayFontFamily: string;
  textMonthFontFamily: string;
  textDayHeaderFontFamily: string;
  textDayFontWeight: '400';
  textMonthFontWeight: '600';
  textDayHeaderFontWeight: '500';
  textDayFontSize: number;
  textMonthFontSize: number;
  textDayHeaderFontSize: number;
};

/**
 * Builds a dynamic `react-native-calendars` theme derived strictly from semantic theme tokens.
 */
export function createCalendarTheme(theme: Theme): CalendarThemeConfig {
  return {
    backgroundColor: theme.colors.surface,
    calendarBackground: theme.colors.surface,
    textSectionTitleColor: theme.colors.inkSecondary,
    textSectionTitleDisabledColor: theme.colors.inkMuted,
    selectedDayBackgroundColor: theme.colors.accent,
    selectedDayTextColor: theme.colors.onAccent,
    todayTextColor: theme.colors.accent,
    todayBackgroundColor: theme.colors.accentSoft,
    dayTextColor: theme.colors.ink,
    textDisabledColor: theme.colors.inkMuted,
    textInactiveColor: theme.colors.inkMuted,
    dotColor: theme.colors.accent,
    selectedDotColor: theme.colors.onAccent,
    disabledDotColor: theme.colors.inkMuted,
    inactiveDotColor: theme.colors.inkMuted,
    todayDotColor: theme.colors.accent,
    arrowColor: theme.colors.accent,
    disabledArrowColor: theme.colors.inkMuted,
    monthTextColor: theme.colors.ink,
    indicatorColor: theme.colors.accent,
    reservationsBackgroundColor: theme.colors.bg,
    textDayFontFamily:
      theme.typography.body.fontFamily ?? fontFamilies.sansRegular,
    textMonthFontFamily:
      theme.typography.heading.fontFamily ?? fontFamilies.sansSemiBold,
    textDayHeaderFontFamily:
      theme.typography.monoLabel.fontFamily ?? fontFamilies.monoMedium,
    textDayFontWeight: '400',
    textMonthFontWeight: '600',
    textDayHeaderFontWeight: '500',
    textDayFontSize: theme.typography.body.fontSize ?? 15,
    textMonthFontSize: theme.typography.heading.fontSize ?? 18,
    textDayHeaderFontSize: theme.typography.monoLabel.fontSize ?? 12,
  };
}
