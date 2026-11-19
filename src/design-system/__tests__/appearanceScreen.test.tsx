jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockRouterBack = jest.fn();
const mockUseSegments = jest.fn(() => ['(panel)', 'home']);
const mockUseAuth = jest.fn(() => ({
  user: { currentRepublicId: 'rep-1' } as { currentRepublicId: string | null } | null,
  isAuthenticated: true,
  loading: false,
  error: null as string | null,
}));

const capturedNavigatorOptions: Array<Record<string, any>> = [];
const capturedScreenEntries: Array<{ name: string; options?: Record<string, any> }> = [];

jest.mock('expo-router', () => {
  const mockReact = require('react');

  const Tabs = ({
    screenOptions,
    children,
  }: {
    screenOptions: Record<string, any>;
    children: React.ReactNode;
  }) => {
    capturedNavigatorOptions.push(screenOptions);
    return mockReact.createElement('MockTabs', null, children);
  };
  Tabs.Screen = (props: { name: string; options?: Record<string, any> }) => {
    capturedScreenEntries.push(props);
    return mockReact.createElement('MockTabScreen', { name: props.name });
  };

  const Stack = ({
    screenOptions,
    children,
  }: {
    screenOptions: Record<string, any>;
    children: React.ReactNode;
  }) => {
    capturedNavigatorOptions.push(screenOptions);
    return mockReact.createElement('MockStack', null, children);
  };
  Stack.Screen = (props: { name: string; options?: Record<string, any> }) => {
    capturedScreenEntries.push(props);
    return mockReact.createElement('MockStackScreen', { name: props.name });
  };

  return {
    Tabs,
    Stack,
    useRouter: () => ({
      back: mockRouterBack,
      push: jest.fn(),
      replace: jest.fn(),
    }),
    useSegments: () => mockUseSegments(),
    Redirect: (props: Record<string, unknown>) =>
      mockReact.createElement('MockRedirect', props),
  };
});

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('lucide-react-native', () => {
  const mockReact = require('react');
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === '__esModule') return true;
        return function MockLucideIcon(props: Record<string, unknown>) {
          return mockReact.createElement(`Lucide${String(prop)}`, props);
        };
      },
    }
  );
});

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  useColorScheme,
  ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Index from '../../../app/index';
import AuthLayout from '../../../app/(auth)/_layout';
import RepublicLayout from '../../../app/(republic)/_layout';
import PanelLayout from '../../../app/(panel)/_layout';
import TasksLayout from '../../../app/(panel)/tasks/_layout';
import EventsLayout from '../../../app/(panel)/events/_layout';
import FinancesLayout from '../../../app/(panel)/finances/_layout';
import SettingsLayout from '../../../app/(panel)/settings/_layout';
import AppearanceScreen from '../../../app/(panel)/settings/appearance';
import {
  THEME_STORAGE_KEY,
  ThemeProvider,
  darkTheme,
  fontFamilies,
  lightTheme,
} from '../index';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

function flattenStyle(style: unknown): Record<string, unknown> {
  return (StyleSheet.flatten(style as StyleProp<ViewStyle>) ?? {}) as Record<string, unknown>;
}

function findOptionButton(tree: renderer.ReactTestRenderer, label: string) {
  return tree.root.findAllByType(Pressable).find((pressable) => {
    const accLabel = pressable.props.accessibilityLabel;
    if (typeof accLabel === 'string' && accLabel.includes(label)) {
      return true;
    }
    return pressable
      .findAllByType(Text)
      .some((textNode) => textNode.props.children === label);
  });
}

describe('AppearanceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedNavigatorOptions.length = 0;
    capturedScreenEntries.length = 0;
    (useColorScheme as jest.Mock).mockReturnValue('light');
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders Claro, Escuro, and Seguir padrão do sistema and persists theme switch immediately', async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <ThemeProvider>
            <AppearanceScreen />
          </ThemeProvider>
        </SafeAreaProvider>
      );
    });
    await flushEffects();

    const textValues = tree.root.findAllByType(Text).map((node) => node.props.children);
    expect(textValues).toContain('Aparência');
    expect(textValues).toContain('Claro');
    expect(textValues).toContain('Escuro');
    expect(textValues).toContain('Seguir padrão do sistema');
    expect(textValues).toContain('R$ 1.240,00');

    const getScreenBg = () => flattenStyle(tree.root.findByType(SafeAreaView).props.style).backgroundColor;
    expect(getScreenBg()).toBe(lightTheme.colors.bg);

    expect(findOptionButton(tree, 'Seguir padrão do sistema')?.props.accessibilityState?.selected).toBe(true);
    expect(findOptionButton(tree, 'Escuro')?.props.accessibilityState?.selected).toBe(false);
    expect(findOptionButton(tree, 'Claro')?.props.accessibilityState?.selected).toBe(false);

    // Switch to Escuro
    const darkOption = findOptionButton(tree, 'Escuro');
    expect(darkOption).toBeDefined();
    await act(async () => {
      darkOption!.props.onPress();
    });
    await flushEffects();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    expect(findOptionButton(tree, 'Escuro')?.props.accessibilityState?.selected).toBe(true);
    expect(findOptionButton(tree, 'Seguir padrão do sistema')?.props.accessibilityState?.selected).toBe(false);
    expect(getScreenBg()).toBe(darkTheme.colors.bg);

    // Switch to Claro
    const lightOption = findOptionButton(tree, 'Claro');
    expect(lightOption).toBeDefined();
    await act(async () => {
      lightOption!.props.onPress();
    });
    await flushEffects();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');
    expect(findOptionButton(tree, 'Claro')?.props.accessibilityState?.selected).toBe(true);
    expect(findOptionButton(tree, 'Escuro')?.props.accessibilityState?.selected).toBe(false);
    expect(getScreenBg()).toBe(lightTheme.colors.bg);

    // Switch back to Seguir padrão do sistema
    const systemOption = findOptionButton(tree, 'Seguir padrão do sistema');
    expect(systemOption).toBeDefined();
    await act(async () => {
      systemOption!.props.onPress();
    });
    await flushEffects();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'system');
    expect(findOptionButton(tree, 'Seguir padrão do sistema')?.props.accessibilityState?.selected).toBe(true);

    // Back button delegates to router.back()
    const backButton = tree.root
      .findAllByType(Pressable)
      .find((p) => p.props.accessibilityLabel === 'Voltar');
    expect(backButton).toBeDefined();
    act(() => {
      backButton!.props.onPress();
    });
    expect(mockRouterBack).toHaveBeenCalledTimes(1);

    act(() => {
      tree.unmount();
    });
  });
});

describe('Themed navigation shell and entry gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedNavigatorOptions.length = 0;
    capturedScreenEntries.length = 0;
    (useColorScheme as jest.Mock).mockReturnValue('dark');
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
    mockUseAuth.mockReturnValue({
      user: { currentRepublicId: 'rep-1' },
      isAuthenticated: true,
      loading: false,
      error: null,
    });
    mockUseSegments.mockReturnValue(['(panel)', 'home']);
  });

  it('themes PanelLayout Tabs dynamically with Lucide icons and font scaling guard', async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <ThemeProvider>
            <PanelLayout />
          </ThemeProvider>
        </SafeAreaProvider>
      );
    });
    await flushEffects();

    const screenOptions = capturedNavigatorOptions[capturedNavigatorOptions.length - 1];
    expect(screenOptions.headerShown).toBe(false);
    expect(screenOptions.tabBarActiveTintColor).toBe(darkTheme.colors.accent);
    expect(screenOptions.tabBarInactiveTintColor).toBe(darkTheme.colors.inkMuted);
    expect(screenOptions.tabBarAllowFontScaling).toBe(true);
    expect(screenOptions.tabBarStyle).toMatchObject({
      backgroundColor: darkTheme.colors.surface,
      borderTopColor: darkTheme.colors.line,
      borderTopWidth: 1,
    });
    expect(screenOptions.tabBarLabelStyle.fontFamily).toBe(fontFamilies.sansMedium);
    expect(screenOptions.tabBarLabelStyle.fontWeight).toBeUndefined();

    const labelNode = screenOptions.tabBarLabel({
      focused: true,
      color: darkTheme.colors.accent,
      position: 'below-icon',
      children: 'Tarefas',
    });
    expect(labelNode.props.allowFontScaling).toBe(true);
    expect(labelNode.props.maxFontSizeMultiplier).toBe(1.3);

    const expectedIcons: Record<string, string> = {
      home: 'LucideHome',
      tasks: 'LucideCheckSquare',
      events: 'LucideCalendar',
      finances: 'LucideWallet',
      settings: 'LucideSettings',
    };
    for (const [name, expectedType] of Object.entries(expectedIcons)) {
      const screen = capturedScreenEntries.find((s) => s.name === name);
      expect(screen).toBeDefined();
      const iconEl = screen!.options?.tabBarIcon({
        focused: true,
        color: darkTheme.colors.accent,
        size: 22,
      });
      expect(iconEl.props.strokeWidth).toBe(1.75);
      expect(iconEl.props.color).toBe(darkTheme.colors.accent);
      let renderedIcon!: renderer.ReactTestRenderer;
      act(() => {
        renderedIcon = renderer.create(iconEl);
      });
      expect((renderedIcon.toJSON() as renderer.ReactTestRendererJSON).type).toBe(expectedType);
      act(() => {
        renderedIcon.unmount();
      });
    }

    const quickActions = capturedScreenEntries.find((s) => s.name === 'quick-actions');
    expect(quickActions?.options?.href).toBeNull();

    act(() => {
      tree.unmount();
    });
  });

  it('themes all 6 Stack layouts dynamically with clickable IconButton headerLeft and registers appearance', async () => {
    const layoutSpecs: Array<{
      Component: React.ComponentType;
      segments: string[];
      authState: ReturnType<typeof mockUseAuth>;
      expectHeaderShownFalse: boolean;
      expectAppearance?: boolean;
    }> = [
      {
        Component: AuthLayout,
        segments: ['(auth)', 'sign-in'],
        authState: { user: null, isAuthenticated: false, loading: false, error: null },
        expectHeaderShownFalse: false,
      },
      {
        Component: RepublicLayout,
        segments: ['(republic)', 'choice'],
        authState: {
          user: { currentRepublicId: null },
          isAuthenticated: true,
          loading: false,
          error: null,
        },
        expectHeaderShownFalse: false,
      },
      {
        Component: TasksLayout,
        segments: ['(panel)', 'tasks'],
        authState: {
          user: { currentRepublicId: 'rep-1' },
          isAuthenticated: true,
          loading: false,
          error: null,
        },
        expectHeaderShownFalse: false,
      },
      {
        Component: EventsLayout,
        segments: ['(panel)', 'events'],
        authState: {
          user: { currentRepublicId: 'rep-1' },
          isAuthenticated: true,
          loading: false,
          error: null,
        },
        expectHeaderShownFalse: true,
      },
      {
        Component: FinancesLayout,
        segments: ['(panel)', 'finances'],
        authState: {
          user: { currentRepublicId: 'rep-1' },
          isAuthenticated: true,
          loading: false,
          error: null,
        },
        expectHeaderShownFalse: false,
      },
      {
        Component: SettingsLayout,
        segments: ['(panel)', 'settings'],
        authState: {
          user: { currentRepublicId: 'rep-1' },
          isAuthenticated: true,
          loading: false,
          error: null,
        },
        expectHeaderShownFalse: true,
        expectAppearance: true,
      },
    ];

    for (const spec of layoutSpecs) {
      capturedNavigatorOptions.length = 0;
      capturedScreenEntries.length = 0;
      mockUseSegments.mockReturnValue(spec.segments);
      mockUseAuth.mockReturnValue(spec.authState);

      const StackComponent = spec.Component;
      let tree!: renderer.ReactTestRenderer;
      await act(async () => {
        tree = renderer.create(
          <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
            <ThemeProvider>
              <StackComponent />
            </ThemeProvider>
          </SafeAreaProvider>
        );
      });
      await flushEffects();

      const options = capturedNavigatorOptions[capturedNavigatorOptions.length - 1];
      expect(options.headerStyle).toEqual({
        backgroundColor: darkTheme.colors.bg,
      });
      expect(options.headerTintColor).toBe(darkTheme.colors.ink);
      expect(options.headerTitleStyle).toEqual({
        fontFamily: fontFamilies.sansSemiBold,
        color: darkTheme.colors.ink,
      });
      expect(options.contentStyle).toEqual({
        backgroundColor: darkTheme.colors.bg,
      });
      if (spec.expectHeaderShownFalse) {
        expect(options.headerShown).toBe(false);
      }
      if (spec.expectAppearance) {
        expect(capturedScreenEntries.map((s) => s.name)).toContain('appearance');
      }

      expect(options.headerLeft({ canGoBack: false })).toBeNull();
      const headerLeftElement = options.headerLeft({ canGoBack: true });
      let headerLeftTree!: renderer.ReactTestRenderer;
      await act(async () => {
        headerLeftTree = renderer.create(<ThemeProvider>{headerLeftElement}</ThemeProvider>);
      });
      await flushEffects();

      const backPressable = headerLeftTree.root.findByType(Pressable);
      expect(backPressable.props.accessibilityLabel).toBe('Voltar');
      act(() => {
        backPressable.props.onPress();
      });
      expect(mockRouterBack).toHaveBeenCalled();

      act(() => {
        headerLeftTree.unmount();
        tree.unmount();
      });
    }
  });

  it('renders Index entry gate using themed StateView for loading and error states', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: true,
      error: null,
    });

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <ThemeProvider>
            <Index />
          </ThemeProvider>
        </SafeAreaProvider>
      );
    });
    await flushEffects();

    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(1);
    expect(flattenStyle(tree.root.findByType(SafeAreaView).props.style).backgroundColor).toBe(
      darkTheme.colors.bg
    );
    act(() => tree.unmount());

    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: 'Falha de conexão',
    });

    await act(async () => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <ThemeProvider>
            <Index />
          </ThemeProvider>
        </SafeAreaProvider>
      );
    });
    await flushEffects();

    const texts = tree.root.findAllByType(Text).map((t) => t.props.children);
    expect(texts).toContain('Falha de conexão');
    expect(texts).toContain('Redirecionando para login...');
    act(() => tree.unmount());
  });
});
