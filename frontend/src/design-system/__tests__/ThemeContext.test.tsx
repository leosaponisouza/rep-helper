jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Platform, StatusBar, Text, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import type { CalendarProps } from 'react-native-calendars';
import type { AbstractChartConfig } from 'react-native-chart-kit/dist/AbstractChart';
import { ThemeProvider, THEME_STORAGE_KEY } from '../theme/ThemeContext';
import { useTheme } from '../theme/useTheme';
import { createThemedStyles, useThemedStyles } from '../theme/createThemedStyles';
import { createCalendarTheme } from '../theme/adapters/calendarTheme';
import { createChartConfig, hexToRgba } from '../theme/adapters/chartTheme';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';
import { Theme } from '../theme/types';

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('ThemeProvider and adapters', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    (useColorScheme as jest.Mock).mockReturnValue('light');
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (SystemUI.setBackgroundColorAsync as jest.Mock).mockResolvedValue(undefined);
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOS,
    });
  });

  it('loads saved "dark" preference from @alpendre:theme_preference and syncs SystemUI', async () => {
    expect(THEME_STORAGE_KEY).toBe('@alpendre:theme_preference');
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('dark');

    let latest!: ReturnType<typeof useTheme>;
    function Consumer() {
      latest = useTheme();
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ThemeProvider, null, React.createElement(Consumer))
      );
    });
    await flushEffects();

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@alpendre:theme_preference');
    expect(latest.ready).toBe(true);
    expect(latest.preference).toBe('dark');
    expect(latest.resolvedMode).toBe('dark');
    expect(latest.theme).toEqual(darkTheme);
    expect(SystemUI.setBackgroundColorAsync).toHaveBeenCalledWith('#151412');

    const statusBar = tree.root.findByType(StatusBar);
    expect(statusBar.props.barStyle).toBe('light-content');
    expect(statusBar.props.backgroundColor).toBe('#151412');

    act(() => {
      tree.unmount();
    });
  });

  it('falls back safely to "system" when stored preference is invalid ("sepia") or getItem rejects', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('sepia');

    let latest!: ReturnType<typeof useTheme>;
    function Consumer() {
      latest = useTheme();
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ThemeProvider, null, React.createElement(Consumer))
      );
    });
    await flushEffects();

    expect(latest.ready).toBe(true);
    expect(latest.preference).toBe('system');
    expect(latest.resolvedMode).toBe('light');
    expect(latest.theme).toEqual(lightTheme);

    act(() => {
      tree.unmount();
    });

    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage failure'));
    (useColorScheme as jest.Mock).mockReturnValue('dark');

    await act(async () => {
      tree = renderer.create(
        React.createElement(ThemeProvider, null, React.createElement(Consumer))
      );
    });
    await flushEffects();

    expect(latest.ready).toBe(true);
    expect(latest.preference).toBe('system');
    expect(latest.resolvedMode).toBe('dark');
    expect(latest.theme).toEqual(darkTheme);

    act(() => {
      tree.unmount();
    });
  });

  it('persists new preference on setPreference("light") and updates resolvedMode immediately', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('dark');

    let latest!: ReturnType<typeof useTheme>;
    function Consumer() {
      latest = useTheme();
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ThemeProvider, null, React.createElement(Consumer))
      );
    });
    await flushEffects();

    await act(async () => {
      await latest.setPreference('light');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');
    expect(latest.preference).toBe('light');
    expect(latest.resolvedMode).toBe('light');
    expect(latest.theme).toEqual(lightTheme);
    expect(SystemUI.setBackgroundColorAsync).toHaveBeenLastCalledWith('#F5F2EB');

    const statusBar = tree.root.findByType(StatusBar);
    expect(statusBar.props.barStyle).toBe('dark-content');
    expect(statusBar.props.backgroundColor).toBe('#F5F2EB');

    act(() => {
      tree.unmount();
    });
  });

  it('skips SystemUI sync on web without throwing', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('dark');

    let latest!: ReturnType<typeof useTheme>;
    function Consumer() {
      latest = useTheme();
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ThemeProvider, null, React.createElement(Consumer))
      );
    });
    await flushEffects();

    expect(latest.resolvedMode).toBe('dark');
    expect(SystemUI.setBackgroundColorAsync).not.toHaveBeenCalled();

    act(() => {
      tree.unmount();
    });
  });

  it('falls back safely outside ThemeProvider using OS color scheme without throwing', async () => {
    let latest!: ReturnType<typeof useTheme>;
    function StandaloneConsumer() {
      latest = useTheme();
      return React.createElement(Text, null, latest.resolvedMode);
    }

    (useColorScheme as jest.Mock).mockReturnValue('light');
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(StandaloneConsumer));
    });

    expect(latest.preference).toBe('system');
    expect(latest.resolvedMode).toBe('light');
    expect(latest.ready).toBe(true);
    expect(latest.theme).toEqual(lightTheme);
    await expect(latest.setPreference('dark')).resolves.toBeUndefined();

    act(() => {
      tree.unmount();
    });

    (useColorScheme as jest.Mock).mockReturnValue('dark');
    act(() => {
      tree = renderer.create(React.createElement(StandaloneConsumer));
    });

    expect(latest.preference).toBe('system');
    expect(latest.resolvedMode).toBe('dark');
    expect(latest.ready).toBe(true);
    expect(latest.theme).toEqual(darkTheme);

    act(() => {
      tree.unmount();
    });
  });

  it('memoizes createThemedStyles and useThemedStyles per theme', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('light');

    const factorySpy = jest.fn((theme: Theme) => ({
      box: {
        ...theme.elevation.floating,
        backgroundColor: theme.colors.surface,
      },
      label: {
        ...theme.typography.title,
        color: theme.colors.ink,
      },
    }));
    const useStyles = createThemedStyles(factorySpy);

    let latestTheme!: ReturnType<typeof useTheme>;
    const observedStyles: Array<ReturnType<typeof useStyles>> = [];
    const observedHookStyles: Array<{ accent: { color: string } }> = [];

    function StyledConsumer({ tick }: { tick: number }) {
      latestTheme = useTheme();
      const s1 = useStyles();
      const s2 = useThemedStyles((t) => ({
        accent: { color: t.colors.accent },
      }));
      observedStyles.push(s1);
      observedHookStyles.push(s2);
      return React.createElement(Text, null, String(tick));
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ThemeProvider, null, React.createElement(StyledConsumer, { tick: 1 }))
      );
    });
    await flushEffects();

    const callsAfterMount = factorySpy.mock.calls.length;

    act(() => {
      tree.update(
        React.createElement(ThemeProvider, null, React.createElement(StyledConsumer, { tick: 2 }))
      );
    });

    expect(factorySpy).toHaveBeenCalledTimes(callsAfterMount);
    expect(observedStyles[observedStyles.length - 1]).toBe(observedStyles[observedStyles.length - 2]);
    expect(observedHookStyles[observedHookStyles.length - 1]).toBe(
      observedHookStyles[observedHookStyles.length - 2]
    );
    expect(observedStyles[observedStyles.length - 1].box.backgroundColor).toBe('#FDFCF9');

    await act(async () => {
      await latestTheme.setPreference('dark');
    });

    expect(factorySpy).toHaveBeenCalledTimes(callsAfterMount + 1);
    expect(observedStyles[observedStyles.length - 1].box.backgroundColor).toBe('#1E1D1A');
    expect(observedHookStyles[observedHookStyles.length - 1].accent.color).toBe('#7EA4FF');

    act(() => {
      tree.unmount();
    });
  });

  it('keeps in-memory preference updated when AsyncStorage.setItem rejects', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('light');
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Disk full'));

    let latest!: ReturnType<typeof useTheme>;
    function Consumer() {
      latest = useTheme();
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        React.createElement(ThemeProvider, null, React.createElement(Consumer))
      );
    });
    await flushEffects();

    await act(async () => {
      await expect(latest.setPreference('dark')).resolves.toBeUndefined();
    });

    expect(latest.preference).toBe('dark');
    expect(latest.resolvedMode).toBe('dark');

    act(() => {
      tree.unmount();
    });
  });

  it('builds dynamic calendar and chart configs without legacy hexes (#222, #333, #7B68EE)', () => {
    const cal = createCalendarTheme(lightTheme);
    const calDark = createCalendarTheme(darkTheme);
    const chart = createChartConfig(darkTheme);
    const chartLight = createChartConfig(lightTheme);

    // Type-level compatibility checks with Record<string, string | number>, react-native-calendars, and react-native-chart-kit
    const calRecord: Record<string, string | number> = cal;
    const calProp: CalendarProps['theme'] = cal;
    const chartProp: AbstractChartConfig = chart;
    expect(calRecord).toBe(cal);
    expect(calProp).toBe(cal);
    expect(chartProp).toBe(chart);

    expect(cal.calendarBackground).toBe('#FDFCF9');
    expect(cal.selectedDayBackgroundColor).toBe('#1F4AA8');
    expect(calDark.calendarBackground).toBe('#1E1D1A');
    expect(calDark.selectedDayBackgroundColor).toBe('#7EA4FF');
    expect(cal.textDayFontWeight).toBe('400');
    expect(cal.textMonthFontWeight).toBe('400');
    expect(cal.textDayHeaderFontWeight).toBe('400');
    expect(calDark.textDayFontWeight).toBe('400');
    expect(calDark.textMonthFontWeight).toBe('400');
    expect(calDark.textDayHeaderFontWeight).toBe('400');

    expect(chart.backgroundColor).toBe('#1E1D1A');
    expect(chart.backgroundGradientFrom).toBe('#1E1D1A');
    expect(chart.backgroundGradientTo).toBe('#1E1D1A');
    expect(chart.color(0.5)).toBe('rgba(126, 164, 255, 0.5)');
    expect(chart.propsForBackgroundLines.stroke).toBe('#302D27');

    expect(hexToRgba('#1F4AA8', 0.25)).toBe('rgba(31, 74, 168, 0.25)');
    expect(hexToRgba('#abc', 0.5)).toBe('rgba(170, 187, 204, 0.5)');
    expect(hexToRgba('rgba(126, 164, 255, 0.16)', 0.4)).toBe('rgba(126, 164, 255, 0.4)');
    expect(JSON.stringify({ cal, calDark, chart, chartLight })).not.toMatch(/#222|#333|#7B68EE/i);
  });
});
