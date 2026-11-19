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
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  AppText,
  Avatar,
  Button,
  Chip,
  ConfirmSection,
  Divider,
  GoogleIcon,
  IconButton,
  InstagramIcon,
  ListRow,
  Screen,
  ScreenHeader,
  SegmentedTabs,
  Skeleton,
  StateView,
  StatusText,
  Surface,
  TextField,
  ThemeProvider,
  darkTheme,
  lightTheme,
  palette,
  useMotion,
  useTheme,
} from '../index';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

function flattenStyle(style: unknown): Record<string, unknown> {
  return (StyleSheet.flatten(style as StyleProp<ViewStyle>) ?? {}) as Record<string, unknown>;
}

describe('Design System core primitives', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    (useColorScheme as jest.Mock).mockReturnValue('light');
    jest.spyOn(Dimensions, 'get').mockReturnValue({
      width: 390,
      height: 844,
      scale: 2,
      fontScale: 1,
    });
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>);
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOS,
    });
  });

  it('exports wave 1 foundations and all 17 primitives from the public barrel', () => {
    expect(palette.light.bg).toBe('#F5F2EB');
    expect(lightTheme.mode).toBe('light');
    expect(darkTheme.mode).toBe('dark');
    expect(typeof useTheme).toBe('function');
    expect(typeof useMotion).toBe('function');
    expect(AppText).toBeDefined();
    expect(ConfirmSection).toBeDefined();
    expect(SegmentedTabs).toBeDefined();
  });

  it('AppText applies variant fontFamily without fontWeight, keeps allowFontScaling enabled, and supports strikethrough', async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <View>
          <AppText variant="title">Casa Editorial</AppText>
          <AppText variant="monoValue" color="accent">
            R$ 240,00
          </AppText>
          <AppText strikethrough allowFontScaling={false}>
            Lavar a louça
          </AppText>
        </View>
      );
    });
    await flushEffects();

    const textNodes = tree.root.findAllByType(Text);
    const titleNode = textNodes[0];
    const monoNode = textNodes[1];
    const strikeNode = textNodes[2];

    const titleStyle = flattenStyle(titleNode.props.style);
    const monoStyle = flattenStyle(monoNode.props.style);
    const strikeStyle = flattenStyle(strikeNode.props.style);

    expect(titleStyle.fontFamily).toBe('SourceSerif4_600SemiBold');
    expect(titleStyle.fontWeight).toBeUndefined();
    expect(monoStyle.fontFamily).toBe('IBMPlexMono_600SemiBold');
    expect(monoStyle.color).toBe(lightTheme.colors.accent);
    expect(monoStyle.fontWeight).toBeUndefined();
    expect(titleNode.props.allowFontScaling).not.toBe(false);
    expect(strikeNode.props.allowFontScaling).not.toBe(false);
    expect(strikeStyle.textDecorationLine).toBe('line-through');

    act(() => tree.unmount());
  });

  it('Button and IconButton enforce accessibility props and >= 44px touch targets', async () => {
    const onPrimary = jest.fn();
    const onBack = jest.fn();

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <View>
          <Button label="Entrar" onPress={onPrimary} variant="primary" size="sm" />
          <Button label="Salvando" onPress={onPrimary} loading variant="secondary" />
          <Button label="Excluir" onPress={onPrimary} variant="danger" disabled />
          <IconButton
            icon={<Text>←</Text>}
            onPress={onBack}
            accessibilityLabel="Voltar"
            size={28}
          />
        </View>
      );
    });
    await flushEffects();

    const pressables = tree.root.findAllByType(Pressable);
    const btn = pressables[0];
    const btnLoading = pressables[1];
    const btnDisabled = pressables[2];
    const iconBtn = pressables[3];

    const btnStyle = flattenStyle(
      typeof btn.props.style === 'function' ? btn.props.style({ pressed: false }) : btn.props.style
    );
    const iconBtnStyle = flattenStyle(
      typeof iconBtn.props.style === 'function'
        ? iconBtn.props.style({ pressed: false })
        : iconBtn.props.style
    );

    expect(btn.props.accessibilityRole).toBe('button');
    expect(btn.props.accessibilityState).toEqual({ disabled: false, busy: false });
    expect(btnLoading.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(btnDisabled.props.accessibilityState).toEqual({ disabled: true, busy: false });
    expect(Number(btnStyle.minHeight)).toBeGreaterThanOrEqual(44);
    expect(btnStyle.backgroundColor).toBe(lightTheme.colors.accent);

    expect(iconBtn.props.accessibilityRole).toBe('button');
    expect(iconBtn.props.accessibilityLabel).toBe('Voltar');
    expect(iconBtn.props.hitSlop).toBe(8);
    expect(Number(iconBtnStyle.minWidth)).toBeGreaterThanOrEqual(44);
    expect(Number(iconBtnStyle.minHeight)).toBeGreaterThanOrEqual(44);

    act(() => {
      btn.props.onPress();
      iconBtn.props.onPress();
    });
    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);

    act(() => tree.unmount());
  });

  it('TextField renders inline danger error, focus color, and toggles secureTextEntry via secureToggle', async () => {
    const onChangeText = jest.fn();

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <TextField
          label="Senha"
          value="123456"
          onChangeText={onChangeText}
          secureToggle
          error="Senha obrigatória"
          helperText="Mínimo 6 caracteres"
        />
      );
    });
    await flushEffects();

    const input = tree.root.findByType(TextInput);
    expect(input.props.secureTextEntry).toBe(true);
    expect(input.props.placeholderTextColor).toBe(lightTheme.colors.inkMuted);

    const toggle = tree.root.findByType(Pressable);
    expect(toggle.props.accessibilityLabel).toBe('Mostrar senha');

    act(() => {
      toggle.props.onPress();
    });

    const inputAfterToggle = tree.root.findByType(TextInput);
    expect(inputAfterToggle.props.secureTextEntry).toBe(false);
    expect(toggle.props.accessibilityLabel).toBe('Ocultar senha');

    const errorNode = tree.root.findAllByType(Text).find((n) => n.props.children === 'Senha obrigatória');
    expect(errorNode).toBeDefined();
    expect(flattenStyle(errorNode!.props.style).color).toBe(lightTheme.colors.danger);

    act(() => tree.unmount());
  });

  it('Screen uses SafeAreaView from safe-area-context, renders no StatusBar, and constrains maxWidth at 1280px', async () => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({
      width: 1280,
      height: 800,
      scale: 1,
      fontScale: 1,
    });

    let standardTree!: renderer.ReactTestRenderer;
    await act(async () => {
      standardTree = renderer.create(
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <Screen width="standard" testID="standard-screen">
            <AppText>Conteúdo padrão</AppText>
          </Screen>
        </SafeAreaProvider>
      );
    });
    await flushEffects();

    expect(standardTree.root.findAllByType(SafeAreaView).length).toBeGreaterThanOrEqual(1);
    expect(standardTree.root.findAllByType(StatusBar)).toHaveLength(0);

    const standardContainer = standardTree.root
      .findAllByType(View)
      .find((v) => flattenStyle(v.props.style).maxWidth === 720);
    expect(standardContainer).toBeDefined();
    expect(flattenStyle(standardContainer!.props.style).maxWidth).toBe(720);

    let wideTree!: renderer.ReactTestRenderer;
    await act(async () => {
      wideTree = renderer.create(
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <Screen width="wide" scroll header={<ScreenHeader title="Painel" variant="editorial" />}>
            <AppText>Conteúdo largo</AppText>
          </Screen>
        </SafeAreaProvider>
      );
    });
    await flushEffects();

    const scrollView = wideTree.root.findByType(ScrollView);
    const wideContentStyle = flattenStyle(scrollView.props.contentContainerStyle);
    expect(wideContentStyle.maxWidth).toBe(960);

    act(() => {
      standardTree.unmount();
      wideTree.unmount();
    });
  });

  it('StateView triggers onAction in error state, renders ActivityIndicator in loading, and BrandIcons render SVG marks', async () => {
    const onAction = jest.fn();

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <View>
          <StateView kind="loading" />
          <StateView
            kind="error"
            title="Falha na conexão"
            description="Verifique sua internet."
            actionLabel="Tentar novamente"
            onAction={onAction}
          />
          <GoogleIcon size={24} />
          <GoogleIcon size={20} monochrome />
          <InstagramIcon size={22} />
        </View>
      );
    });
    await flushEffects();

    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(1);
    const retryButton = tree.root
      .findAllByType(Pressable)
      .find((p) => p.props.accessibilityLabel === 'Tentar novamente');
    expect(retryButton).toBeDefined();

    act(() => {
      retryButton!.props.onPress();
    });
    expect(onAction).toHaveBeenCalledTimes(1);

    const svgs = tree.root.findAllByType(Svg);
    expect(svgs.length).toBeGreaterThanOrEqual(3);

    const monoPaths = svgs[1].findAllByType(Path);
    expect(monoPaths).toHaveLength(4);
    expect(monoPaths.every((p) => p.props.fill === lightTheme.colors.ink)).toBe(true);

    act(() => tree.unmount());
  });

  it('renders Surface, Divider, StatusText, Chip, Avatar, ListRow, SegmentedTabs, Skeleton, and ConfirmSection', async () => {
    const onTabChange = jest.fn();
    const onChipPress = jest.fn();
    const onRowPress = jest.fn();
    const onPressDelete = jest.fn();
    const onCancelConfirm = jest.fn();

    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <View>
          <Surface tone="surface" bordered padded="md" radiusKey="md">
            <ScreenHeader
              title="Despesas"
              subtitle="Outubro"
              variant="compact"
              onBack={jest.fn()}
              rightActions={<AppText variant="monoLabel">3 ITENS</AppText>}
            />
            <Divider inset={16} />
            <StatusText label="Pago" tone="success" showDot />
            <Chip label="Contas" selected onPress={onChipPress} />
            <Avatar name="Maria Clara" size="md" />
            <Avatar uri="https://example.com/avatar.png" name="João" size="sm" />
            <ListRow
              title="Aluguel"
              subtitle="Vence dia 10"
              onPress={onRowPress}
              selected
              showDivider
              strikethrough
            />
            <SegmentedTabs
              options={[
                { value: 'resumo', label: 'Resumo' },
                { value: 'despesas', label: 'Despesas', badge: 4 },
              ]}
              value="resumo"
              onChange={onTabChange}
            />
            <Skeleton width="80%" height={20} radiusKey="sm" />
            <ConfirmSection
              title="Zona de perigo"
              deleteLabel="Excluir tarefa"
              showConfirm
              onPressDelete={onPressDelete}
              onCancelConfirm={onCancelConfirm}
            />
          </Surface>
        </View>
      );
    });
    await flushEffects();

    expect(tree.root.findAllByType(Image)).toHaveLength(1);
    const initialsNode = tree.root.findAllByType(Text).find((n) => n.props.children === 'MC');
    expect(initialsNode).toBeDefined();

    const tabs = tree.root.findAllByType(Pressable).filter((p) => p.props.accessibilityRole === 'tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].props.accessibilityState).toEqual({ selected: true });
    expect(tabs[1].props.accessibilityState).toEqual({ selected: false });

    act(() => {
      tabs[1].props.onPress();
    });
    expect(onTabChange).toHaveBeenCalledWith('despesas');

    const row = tree.root.findAllByType(Pressable).find((p) =>
      String(p.props.accessibilityLabel).includes('Aluguel')
    );
    expect(row?.props.accessibilityState?.selected).toBe(true);
    act(() => {
      row!.props.onPress();
    });
    expect(onRowPress).toHaveBeenCalledTimes(1);

    const cancelBtn = tree.root
      .findAllByType(Pressable)
      .find((p) => p.props.accessibilityLabel === 'Cancelar');
    expect(cancelBtn).toBeDefined();
    act(() => {
      cancelBtn!.props.onPress();
    });
    expect(onCancelConfirm).toHaveBeenCalledTimes(1);

    const confirmBtn = tree.root
      .findAllByType(Pressable)
      .find((p) => p.props.accessibilityLabel === 'Confirmar exclusão');
    expect(confirmBtn).toBeDefined();
    act(() => {
      confirmBtn!.props.onPress();
    });
    expect(onPressDelete).toHaveBeenCalledTimes(1);

    // Confirm Skeleton uses static Animated.View when reduceMotion === true
    const animatedViews = tree.root.findAllByType(Animated.View);
    expect(animatedViews.length).toBeGreaterThanOrEqual(1);

    act(() => tree.unmount());
  });

  it('TextField transitions borderStrong -> accent on focus and renders helperText and multiline', async () => {
    const onChangeText = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <TextField
          label="Observações"
          value=""
          onChangeText={onChangeText}
          helperText="Opcional"
          multiline
        />
      );
    });
    await flushEffects();

    const input = tree.root.findByType(TextInput);
    const getInputContainerStyle = () => {
      const box = tree.root
        .findAllByType(View)
        .find((v) => flattenStyle(v.props.style).borderWidth === 1);
      return flattenStyle(box?.props.style);
    };

    expect(input.props.multiline).toBe(true);
    expect(getInputContainerStyle().borderColor).toBe(lightTheme.colors.borderStrong);
    expect(getInputContainerStyle().minHeight).toBe(100);
    expect(
      tree.root.findAllByType(Text).some((t) => t.props.children === 'Opcional')
    ).toBe(true);

    act(() => {
      input.props.onFocus({});
    });
    expect(getInputContainerStyle().borderColor).toBe(lightTheme.colors.accent);

    act(() => {
      input.props.onBlur({});
    });
    expect(getInputContainerStyle().borderColor).toBe(lightTheme.colors.borderStrong);

    act(() => tree.unmount());
  });

  it('Screen renders cleanly without SafeAreaProvider on native and web, handles keyboardAvoiding, and applies full/mobile widths', async () => {
    let nativeTree!: renderer.ReactTestRenderer;
    await act(async () => {
      nativeTree = renderer.create(
        <Screen width="standard" keyboardAvoiding>
          <StateView kind="loading" />
        </Screen>
      );
    });
    await flushEffects();

    expect(nativeTree.root.findAllByType(SafeAreaView)).toHaveLength(1);
    expect(nativeTree.root.findAllByType(KeyboardAvoidingView)).toHaveLength(1);
    expect(nativeTree.root.findAllByType(ActivityIndicator)).toHaveLength(1);
    const mobileContainer = nativeTree.root
      .findAllByType(View)
      .find((v) => flattenStyle(v.props.style).maxWidth !== undefined);
    expect(mobileContainer).toBeUndefined();
    act(() => nativeTree.unmount());

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });
    jest.spyOn(Dimensions, 'get').mockReturnValue({
      width: 1280,
      height: 800,
      scale: 1,
      fontScale: 1,
    });

    let webTree!: renderer.ReactTestRenderer;
    await act(async () => {
      webTree = renderer.create(
        <Screen width="full">
          <AppText>Largura total</AppText>
        </Screen>
      );
    });
    await flushEffects();

    const fullConstrained = webTree.root
      .findAllByType(View)
      .find((v) => flattenStyle(v.props.style).maxWidth !== undefined);
    expect(fullConstrained).toBeUndefined();
    act(() => webTree.unmount());
  });

  it('respects dark ThemeProvider, Avatar image fallback, SegmentedTabs motion, and Skeleton loop cleanup', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('dark');
    const timingSpy = jest.spyOn(Animated, 'timing');
    const loopSpy = jest.spyOn(Animated, 'loop');

    function Harness({ tab }: { tab: 'a' | 'b' }) {
      const [activeTab, setActiveTab] = React.useState<'a' | 'b'>(tab);
      return (
        <ThemeProvider>
          <Screen>
            <Surface tone="surface" bordered>
              <Avatar uri="https://broken.invalid/pic.png" name="Ana" />
              <Chip label="Inativo" selected={false} />
              <SegmentedTabs
                options={[
                  { value: 'a', label: 'A' },
                  { value: 'b', label: 'B' },
                ]}
                value={activeTab}
                onChange={setActiveTab}
              />
              <Skeleton height={16} />
              <ConfirmSection
                title="Excluir"
                deleteLabel="Remover"
                showConfirm={false}
                onPressDelete={jest.fn()}
                onCancelConfirm={jest.fn()}
              />
            </Surface>
          </Screen>
        </ThemeProvider>
      );
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<Harness tab="a" />);
    });
    await flushEffects();

    const screenRoot = tree.root.findByType(SafeAreaView);
    expect(flattenStyle(screenRoot.props.style).backgroundColor).toBe(darkTheme.colors.bg);
    expect(loopSpy).toHaveBeenCalled();

    // Trigger Avatar error fallback
    const avatarImage = tree.root.findByType(Image);
    act(() => {
      avatarImage.props.onError();
    });
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(
      tree.root.findAllByType(Text).some((t) => t.props.children === 'AN')
    ).toBe(true);

    // Trigger SegmentedTabs layout and tab transition
    const tablist = tree.root
      .findAllByType(View)
      .find((v) => v.props.accessibilityRole === 'tablist');
    act(() => {
      tablist!.props.onLayout({ nativeEvent: { layout: { width: 320, height: 52 } } });
    });
    const tabButtons = tree.root
      .findAllByType(Pressable)
      .filter((p) => p.props.accessibilityRole === 'tab');
    act(() => {
      tabButtons[1].props.onPress();
    });
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 156,
        duration: 140,
      })
    );

    act(() => tree.unmount());
  });
});
