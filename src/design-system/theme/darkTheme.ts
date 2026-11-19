import { palette } from '../tokens/palette';
import { typography } from '../tokens/typography';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { elevation } from '../tokens/elevation';
import { motion } from '../tokens/motion';
import { Theme } from './types';

export const darkTheme: Theme = {
  mode: 'dark',
  isDark: true,
  colors: {
    bg: palette.dark.bg,
    surface: palette.dark.surface,
    subtle: palette.dark.subtle,
    ink: palette.dark.ink,
    inkSecondary: palette.dark.inkSecondary,
    inkMuted: palette.dark.inkMuted,
    line: palette.dark.line,
    borderStrong: palette.dark.borderStrong,
    accent: palette.dark.accent,
    onAccent: palette.dark.onAccent,
    accentSoft: palette.dark.accentSoft,
    success: palette.dark.success,
    successSoft: palette.dark.successSoft,
    warning: palette.dark.warning,
    warningSoft: palette.dark.warningSoft,
    danger: palette.dark.danger,
    onDanger: palette.dark.onDanger,
    dangerSoft: palette.dark.dangerSoft,
    overlay: palette.dark.overlay,
    chartSeries: palette.dark.chartSeries,
  },
  typography,
  spacing,
  radius,
  elevation,
  motion,
};
