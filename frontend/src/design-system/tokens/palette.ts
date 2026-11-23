/**
 * Raw color palette for the "Editorial de Convivência" design system.
 *
 * This is the ONLY file in the design system authorized to contain raw hex
 * or rgba color literals. All themes and tokens must reference `palette`.
 */
export const palette = {
  common: {
    shadow: '#1C1B18',
    floatingBoxShadow: '0px 4px 12px rgba(28, 27, 24, 0.12)',
  },
  light: {
    bg: '#F5F2EB',
    surface: '#FDFCF9',
    subtle: '#EBE6DC',
    ink: '#1C1B18',
    inkSecondary: '#524E45',
    inkMuted: '#635E54',
    line: '#DCD6C8',
    borderStrong: '#837C6E',
    accent: '#1F4AA8',
    onAccent: '#FFFFFF',
    accentSoft: '#E7EEFA',
    success: '#24633A',
    successSoft: '#E4F2E9',
    warning: '#8F5400',
    warningSoft: '#F8EED8',
    danger: '#B3261E',
    onDanger: '#FFFFFF',
    dangerSoft: '#F9E4E2',
    overlay: 'rgba(28, 27, 24, 0.45)',
    chartSeries: ['#1F4AA8', '#B35C1E', '#24633A', '#7A3E8F', '#8F5400', '#3F6C7A'],
  },
  dark: {
    bg: '#151412',
    surface: '#1E1D1A',
    subtle: '#282622',
    ink: '#EDEAE2',
    inkSecondary: '#B2ACA0',
    inkMuted: '#948E82',
    line: '#302D27',
    borderStrong: '#787268',
    accent: '#7EA4FF',
    onAccent: '#0F1524',
    accentSoft: 'rgba(126, 164, 255, 0.16)',
    success: '#6ED090',
    successSoft: 'rgba(110, 208, 144, 0.15)',
    warning: '#F2B84B',
    warningSoft: 'rgba(242, 184, 75, 0.15)',
    danger: '#F27B72',
    onDanger: '#151412',
    dangerSoft: 'rgba(242, 123, 114, 0.15)',
    overlay: 'rgba(0, 0, 0, 0.65)',
    chartSeries: ['#7EA4FF', '#F09B64', '#6ED090', '#C695E0', '#F2B84B', '#7BC0D4'],
  },
} as const;
