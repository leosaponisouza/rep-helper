import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';
import { typography } from '../tokens/typography';
import { radius } from '../tokens/radius';
import { spacing } from '../tokens/spacing';

function relativeLuminance(hex: string): number {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('Editorial de Convivência WCAG 2.1 AA contrast and closed token scales', () => {
  const themes = [
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const;

  const textTokens = ['ink', 'inkSecondary', 'inkMuted', 'accent', 'success', 'warning', 'danger'] as const;
  const surfaceTokens = ['bg', 'surface', 'subtle'] as const;

  it.each(themes)('%s theme passes >= 4.5:1 for all text tokens on bg, surface, and subtle', (_name, theme) => {
    for (const bgKey of surfaceTokens) {
      for (const fgKey of textTokens) {
        expect(contrastRatio(theme.colors[fgKey], theme.colors[bgKey])).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrastRatio(theme.colors.onAccent, theme.colors.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.colors.onDanger, theme.colors.danger)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(themes)('%s theme passes >= 3.0:1 for borderStrong on bg, surface, and subtle', (_name, theme) => {
    for (const bgKey of surfaceTokens) {
      expect(contrastRatio(theme.colors.borderStrong, theme.colors[bgKey])).toBeGreaterThanOrEqual(3.0);
    }
  });

  it('exposes closed scales matching spec Section 5', () => {
    expect(Object.keys(typography)).toHaveLength(9);
    expect(Object.values(radius)).toEqual([0, 6, 10, 16, 9999]);
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 20, 24, 32, 40]);
    expect(lightTheme.colors.chartSeries).toHaveLength(6);
    expect(darkTheme.colors.chartSeries).toHaveLength(6);
  });
});
