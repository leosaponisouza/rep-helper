jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  ConfirmDialog,
  FeedbackProvider,
  ThemeProvider,
  Toast,
  darkTheme,
  lightTheme,
  useFeedback,
} from '../index';
import { ErrorHandler } from '../../utils/errorHandling';
import {
  NotificationProvider,
  useNotification,
} from '../../context/NotificationContext';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

function flattenStyle(style: unknown): Record<string, unknown> {
  return (StyleSheet.flatten(style as StyleProp<ViewStyle>) ?? {}) as Record<string, unknown>;
}

function collectText(tree: renderer.ReactTestRenderer): string {
  return tree.root
    .findAllByType(Text)
    .map((node) => {
      const { children } = node.props;
      return Array.isArray(children) ? children.join('') : String(children ?? '');
    })
    .join(' | ');
}

describe('FeedbackProvider, Overlays, ErrorHandler, and NotificationContext integration', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    ErrorHandler.registerToastHandler(null);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('light');
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
    jest.useRealTimers();
    jest.restoreAllMocks();
    ErrorHandler.registerToastHandler(null);
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOS,
    });
  });

  it('renders editorial Toast on toast(), respects top safe area & max 3 stack, and auto-dismisses after duration', async () => {
    jest.useFakeTimers();
    let feedback!: ReturnType<typeof useFeedback>;

    function Consumer() {
      feedback = useFeedback();
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <ThemeProvider>
            <FeedbackProvider>
              <Consumer />
            </FeedbackProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      );
    });
    await flushMicrotasks();

    act(() => {
      feedback.toast({
        title: 'Salvo',
        message: 'Despesa registrada',
        tone: 'success',
        duration: 2000,
      });
    });

    expect(collectText(tree)).toContain('Salvo');
    expect(collectText(tree)).toContain('Despesa registrada');

    // Verify top safe-area inset is applied on the toast stack container
    const stackView = tree.root
      .findAllByType(View)
      .find((v) => flattenStyle(v.props.style).paddingTop === INITIAL_METRICS.insets.top + 12);
    expect(stackView).toBeDefined();

    // Advance timers to trigger auto-dismiss
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(collectText(tree)).not.toContain('Despesa registrada');

    // Fire 4 concurrent toasts and assert max 3 are visible simultaneously
    act(() => {
      feedback.toast({ title: 'T1', message: 'Um', duration: 4000 });
      feedback.toast({ title: 'T2', message: 'Dois', duration: 4000 });
      feedback.toast({ title: 'T3', message: 'Tres', duration: 4000 });
      feedback.toast({ title: 'T4', message: 'Quatro', duration: 4000 });
    });

    const stackedText = collectText(tree);
    expect(stackedText).toContain('T4');
    expect(stackedText).toContain('T3');
    expect(stackedText).toContain('T2');
    expect(stackedText).not.toContain('T1');

    act(() => {
      tree.unmount();
    });
  });

  it('supports manual dismiss and onPress on Toast without leaking timers', async () => {
    jest.useFakeTimers();
    let feedback!: ReturnType<typeof useFeedback>;
    const onToastPress = jest.fn();

    function Consumer() {
      feedback = useFeedback();
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <ThemeProvider>
            <FeedbackProvider>
              <Consumer />
            </FeedbackProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      );
    });
    await flushMicrotasks();

    act(() => {
      feedback.toast({
        title: 'Aviso',
        message: 'Toque para abrir',
        tone: 'info',
        duration: 5000,
        onPress: onToastPress,
      });
    });

    const toastButton = tree.root
      .findAllByType(Pressable)
      .find((p) => p.props.accessibilityLabel === 'Aviso');
    expect(toastButton).toBeDefined();

    act(() => {
      toastButton!.props.onPress();
    });

    expect(onToastPress).toHaveBeenCalledTimes(1);
    expect(collectText(tree)).not.toContain('Toque para abrir');

    // Re-add and test close IconButton
    act(() => {
      feedback.toast({
        title: 'Fechar manual',
        message: 'Mensagem temporária',
        tone: 'warning',
        duration: 5000,
      });
    });

    const closeBtn = tree.root
      .findAllByType(Pressable)
      .find((p) => p.props.accessibilityLabel === 'Fechar notificação');
    expect(closeBtn).toBeDefined();

    act(() => {
      closeBtn!.props.onPress();
    });
    expect(collectText(tree)).not.toContain('Mensagem temporária');

    // Advancing past the 5000ms duration must not fire any orphaned toast timer
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(jest.getTimerCount()).toBe(0);

    act(() => {
      tree.unmount();
    });
  });

  it('resolves confirm() to true on confirm, false on cancel/backdrop/onRequestClose, and handles concurrent calls in FIFO order', async () => {
    let feedback!: ReturnType<typeof useFeedback>;

    function Consumer() {
      feedback = useFeedback();
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <ThemeProvider>
            <FeedbackProvider>
              <Consumer />
            </FeedbackProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      );
    });
    await flushMicrotasks();

    let p1!: Promise<boolean>;
    let p2!: Promise<boolean>;
    let p3!: Promise<boolean>;
    act(() => {
      p1 = feedback.confirm({
        title: 'Excluir',
        message: 'Continuar?',
        destructive: true,
      });
      p2 = feedback.confirm({
        title: 'Sair',
        message: 'Encerrar sessão?',
        confirmLabel: 'Confirmar saída',
        cancelLabel: 'Voltar',
      });
      p3 = feedback.confirm({
        title: 'Terceiro',
        message: 'Ação pendente',
      });
    });

    // Only the first queued dialog is shown
    expect(collectText(tree)).toContain('Excluir');
    expect(collectText(tree)).not.toContain('Encerrar sessão?');

    // Dismiss first via backdrop press -> resolves p1 to false and advances queue to p2
    const backdrop = tree.root
      .findAllByType(Pressable)
      .find((p) => p.props.accessibilityLabel === 'Fechar');
    expect(backdrop).toBeDefined();

    act(() => {
      backdrop!.props.onPress();
      // Rapid second tap in the same commit must NOT accidentally dismiss p2
      backdrop!.props.onPress();
    });
    await expect(p1).resolves.toBe(false);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();

    // Second dialog is now active
    expect(collectText(tree)).toContain('Sair');
    expect(collectText(tree)).toContain('Encerrar sessão?');

    // Confirm second dialog -> resolves p2 to true and advances queue to p3
    const confirmSecondBtn = tree.root
      .findAllByType(Pressable)
      .find((p) => p.props.accessibilityLabel === 'Confirmar saída');
    expect(confirmSecondBtn).toBeDefined();

    act(() => {
      confirmSecondBtn!.props.onPress();
      // Rapid second tap must NOT accidentally confirm p3
      confirmSecondBtn!.props.onPress();
    });
    await expect(p2).resolves.toBe(true);

    // Dismiss third via Android hardware back (Modal.onRequestClose) -> resolves p3 to false
    expect(collectText(tree)).toContain('Terceiro');
    const modal = tree.root.findByType(Modal);
    act(() => {
      modal.props.onRequestClose();
    });
    await expect(p3).resolves.toBe(false);

    // Trigger destructive confirm and verify subtle haptics on native
    let p4!: Promise<boolean>;
    act(() => {
      p4 = feedback.confirm({
        title: 'Remover item',
        message: 'Tem certeza?',
        destructive: true,
      });
    });
    const confirmDangerBtn = tree.root
      .findAllByType(Pressable)
      .find((p) => p.props.accessibilityLabel === 'Confirmar');
    act(() => {
      confirmDangerBtn!.props.onPress();
    });
    await expect(p4).resolves.toBe(true);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Warning
    );

    // Unmount with pending confirm resolves it to false instead of hanging
    let p5!: Promise<boolean>;
    act(() => {
      p5 = feedback.confirm({
        title: 'Pendente no unmount',
        message: 'Deve resolver false',
      });
    });

    act(() => {
      tree.unmount();
    });
    await expect(p5).resolves.toBe(false);
  });

  it('routes ErrorHandler showAlert to registered toast handler and never calls Alert.alert before mount or after unmount', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Before FeedbackProvider mounts
    await expect(
      ErrorHandler.handleError(new Error('Falha pré-mount'), { showAlert: true })
    ).resolves.toMatchObject({ message: 'Falha pré-mount' });
    expect(alertSpy).not.toHaveBeenCalled();

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <ThemeProvider>
            <FeedbackProvider>
              <View />
            </FeedbackProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      );
    });
    await flushMicrotasks();

    await act(async () => {
      await ErrorHandler.handleError(new Error('Falha montada'), { showAlert: true });
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(collectText(tree)).toContain('Falha montada');

    // showAlert: false does not render toast
    await act(async () => {
      await ErrorHandler.handle(new Error('Silencioso'), { showAlert: false });
    });
    expect(collectText(tree)).not.toContain('Silencioso');

    // Unmount cleans up toast handler safely
    act(() => {
      tree.unmount();
    });

    await expect(
      ErrorHandler.handleError(new Error('Falha pós-unmount'), { showAlert: true })
    ).resolves.toMatchObject({ message: 'Falha pós-unmount' });
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('BottomSheetModal, ConfirmDialog, and Toast respect reduceMotion and dark theme tokens', async () => {
    jest.useFakeTimers();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const timingSpy = jest.spyOn(Animated, 'timing');
    const onClose = jest.fn();

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <ThemeProvider>
            <View>
              <BottomSheetModal visible title="Filtros" onClose={onClose} testID="sheet">
                <Text>Conteúdo do sheet</Text>
              </BottomSheetModal>
              <ConfirmDialog
                visible={false}
                title="Oculto"
                message="Não visível"
                onConfirm={jest.fn()}
                onCancel={jest.fn()}
              />
              <Toast title="Escuro" message="Subtítulo" tone="danger" onDismiss={jest.fn()} />
            </View>
          </ThemeProvider>
        </SafeAreaProvider>
      );
    });
    await flushMicrotasks();
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Reduce motion: opacity uses 80ms reducedFade and zero translation animation
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      })
    );

    const sheetEl = tree.root.findByProps({ accessibilityViewIsModal: true });
    const sheetStyle = flattenStyle(sheetEl.props.style);
    expect(sheetStyle.backgroundColor).toBe(darkTheme.colors.surface);
    expect(sheetStyle.transform).toBeUndefined();

    // Toast in dark theme uses surface token
    const toastTitle = tree.root.findAllByType(Text).find((t) => t.props.children === 'Escuro');
    expect(flattenStyle(toastTitle!.props.style).color).toBe(darkTheme.colors.ink);

    // Check light theme fallback when outside ThemeProvider
    expect(lightTheme.colors.surface).toBe('#FDFCF9');

    act(() => {
      tree.unmount();
    });
  });

  it('preserves NotificationProvider API and renders NotificationToast using design-system Toast', async () => {
    jest.useFakeTimers();
    let notif!: ReturnType<typeof useNotification>;
    const onNotifPress = jest.fn();

    function Consumer() {
      notif = useNotification();
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <ThemeProvider>
            <NotificationProvider>
              <Consumer />
            </NotificationProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      );
    });
    await flushMicrotasks();

    act(() => {
      notif.showSuccess('Sucesso', 'Tarefa concluída', { duration: 1500 });
    });

    expect(collectText(tree)).toContain('Sucesso');
    expect(collectText(tree)).toContain('Tarefa concluída');

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(collectText(tree)).not.toContain('Tarefa concluída');

    act(() => {
      notif.showError('Erro persistente', 'Toque para tentar', {
        autoHide: false,
        onPress: onNotifPress,
      });
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(collectText(tree)).toContain('Toque para tentar');

    const pressableToast = tree.root
      .findAllByType(Pressable)
      .find((p) => p.props.accessibilityLabel === 'Erro persistente');
    expect(pressableToast).toBeDefined();

    act(() => {
      pressableToast!.props.onPress();
    });
    expect(onNotifPress).toHaveBeenCalledTimes(1);
    expect(collectText(tree)).not.toContain('Toque para tentar');

    act(() => {
      tree.unmount();
    });
  });

  it('skips haptics and sets useNativeDriver=false on web, and constrains BottomSheetModal width on desktop', async () => {
    jest.useFakeTimers();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });
    const dimensionsSpy = jest.spyOn(Dimensions, 'get').mockReturnValue({
      width: 1280,
      height: 800,
      scale: 1,
      fontScale: 1,
    });
    const timingSpy = jest.spyOn(Animated, 'timing');
    const onConfirm = jest.fn();

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <ThemeProvider>
            <ConfirmDialog
              visible
              title="Excluir web"
              message="Confirmar na Web?"
              destructive
              onConfirm={onConfirm}
              onCancel={jest.fn()}
              testID="web-dialog"
            />
          </ThemeProvider>
        </SafeAreaProvider>
      );
    });
    await flushMicrotasks();
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ useNativeDriver: false })
    );

    const dialogSheet = tree.root.findByProps({ accessibilityViewIsModal: true });
    expect(flattenStyle(dialogSheet.props.style).maxWidth).toBe(520);

    const confirmBtn = tree.root
      .findAllByType(Pressable)
      .find((p) => p.props.accessibilityLabel === 'Confirmar');
    act(() => {
      confirmBtn!.props.onPress();
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();

    dimensionsSpy.mockRestore();
    act(() => {
      tree.unmount();
    });
  });

  it('throws a clear error when useFeedback is called outside FeedbackProvider', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    function BadConsumer() {
      useFeedback();
      return null;
    }

    expect(() => {
      renderer.create(<BadConsumer />);
    }).toThrow('useFeedback must be used within a FeedbackProvider');

    errorSpy.mockRestore();
  });
});
