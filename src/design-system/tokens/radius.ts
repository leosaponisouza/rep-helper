/**
 * Closed border radius scale.
 */
export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
