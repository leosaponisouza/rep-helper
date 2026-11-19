import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Platform } from 'react-native';
import { useMotion } from '../motion/useMotion';

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useMotion', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('respects Reduce Motion = true, listens for changes, and cleans up subscription on unmount', async () => {
    const removeMock = jest.fn();
    let changeHandler: ((enabled: boolean) => void) | undefined;

    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
    (AccessibilityInfo.addEventListener as jest.Mock).mockImplementationOnce(
      (eventName: string, handler: (enabled: boolean) => void) => {
        if (eventName === 'reduceMotionChanged') {
          changeHandler = handler;
        }
        return { remove: removeMock };
      }
    );

    let latest!: ReturnType<typeof useMotion>;
    function Consumer() {
      latest = useMotion();
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(Consumer));
    });
    await flushEffects();

    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
      'reduceMotionChanged',
      expect.any(Function)
    );
    expect(latest.reduceMotion).toBe(true);
    expect(latest.shouldAnimate).toBe(false);
    expect(latest.useNativeDriver).toBe(true);
    expect(latest.duration(180)).toBe(0);
    expect(latest.duration(180, { allowReducedFade: true })).toBe(80);

    act(() => {
      changeHandler?.(false);
    });

    expect(latest.reduceMotion).toBe(false);
    expect(latest.shouldAnimate).toBe(true);
    expect(latest.duration(180)).toBe(180);
    expect(latest.duration(180, { allowReducedFade: true })).toBe(180);

    act(() => {
      tree.unmount();
    });
    expect(removeMock).toHaveBeenCalledTimes(1);
  });

  it('degrades to reduceMotion=false on rejection and sets useNativeDriver=false on web', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });

    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockRejectedValueOnce(
      new Error('AccessibilityInfo unsupported')
    );
    (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValueOnce(undefined);

    let latest!: ReturnType<typeof useMotion>;
    function Consumer() {
      latest = useMotion();
      return null;
    }

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(Consumer));
    });
    await flushEffects();

    expect(latest.reduceMotion).toBe(false);
    expect(latest.shouldAnimate).toBe(true);
    expect(latest.useNativeDriver).toBe(false);
    expect(latest.duration(180)).toBe(180);

    expect(() => {
      act(() => {
        tree.unmount();
      });
    }).not.toThrow();
  });
});
