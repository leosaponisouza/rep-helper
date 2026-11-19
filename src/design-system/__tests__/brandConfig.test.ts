import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

function decodePngRgbaPixels(buf: Buffer) {
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const idatChunks: Buffer[] = [];
  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IDAT') {
      idatChunks.push(data);
    }
    offset += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * 4 + 1;
  return {
    width,
    height,
    getPixel: (x: number, y: number): [number, number, number, number] => {
      const idx = y * stride + 1 + x * 4;
      return [raw[idx], raw[idx + 1], raw[idx + 2], raw[idx + 3]];
    },
  };
}

describe('Expo, Android DayNight, and Editorial brand assets alignment', () => {
  const root = path.resolve(__dirname, '../../..');

  it('aligns app.json and app.config.js on automatic theme, #F5F2EB splash, and valid assets/images paths', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    const appConfig = fs.readFileSync(path.join(root, 'app.config.js'), 'utf8');

    expect(appJson.expo.userInterfaceStyle).toBe('automatic');
    expect(appJson.expo.splash.backgroundColor).toBe('#F5F2EB');
    expect(appJson.expo.android.adaptiveIcon.backgroundColor).toBe('#F5F2EB');
    for (const relPath of [
      appJson.expo.icon,
      appJson.expo.splash.image,
      appJson.expo.android.adaptiveIcon.foregroundImage,
      appJson.expo.web.favicon,
    ]) {
      expect(relPath).toMatch(/^\.\/assets\/images\/.+\.png$/);
      expect(fs.existsSync(path.join(root, relPath))).toBe(true);
    }

    expect(appConfig).toContain('userInterfaceStyle: "automatic"');
    expect(appConfig).toContain('backgroundColor: "#F5F2EB"');
    expect(appConfig.match(/backgroundColor:\s*"#F5F2EB"/g)).toHaveLength(2);
    expect(appConfig).toContain('scheme: "rephelper"');
  });

  it('configures Android native DayNight theme and light/dark splash colors surgically', () => {
    const stylesXml = fs.readFileSync(path.join(root, 'android/app/src/main/res/values/styles.xml'), 'utf8');
    const lightColors = fs.readFileSync(path.join(root, 'android/app/src/main/res/values/colors.xml'), 'utf8');
    const darkColors = fs.readFileSync(path.join(root, 'android/app/src/main/res/values-night/colors.xml'), 'utf8');

    expect(stylesXml).toContain('Theme.AppCompat.DayNight.NoActionBar');
    expect(stylesXml).not.toContain('Theme.AppCompat.Light.NoActionBar');
    expect(stylesXml).not.toContain('android:statusBarColor');
    expect(stylesXml).not.toContain('@android:color/black');
    expect(lightColors).toContain('#F5F2EB');
    expect(lightColors).toContain('#1F4AA8');
    expect(darkColors).toContain('#151412');
    expect(darkColors).toContain('#7EA4FF');
  });

  it('contains non-empty regenerated PNG brand and Android splash logo assets', () => {
    const pngPaths = [
      'assets/images/icon.png',
      'assets/images/adaptive-icon.png',
      'assets/images/splash-icon.png',
      'assets/images/favicon.png',
      'android/app/src/main/res/drawable-mdpi/splashscreen_logo.png',
      'android/app/src/main/res/drawable-hdpi/splashscreen_logo.png',
      'android/app/src/main/res/drawable-xhdpi/splashscreen_logo.png',
      'android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png',
    ];
    for (const rel of pngPaths) {
      const buf = fs.readFileSync(path.join(root, rel));
      expect(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
      expect(buf.length).toBeGreaterThan(200);
    }

    const icon = decodePngRgbaPixels(fs.readFileSync(path.join(root, 'assets/images/icon.png')));
    expect([icon.width, icon.height]).toEqual([1024, 1024]);
    expect(icon.getPixel(0, 0)).toEqual([0xf5, 0xf2, 0xeb, 0xff]);

    const favicon = decodePngRgbaPixels(fs.readFileSync(path.join(root, 'assets/images/favicon.png')));
    expect([favicon.width, favicon.height]).toEqual([48, 48]);
    expect(favicon.getPixel(0, 0)).toEqual([0xf5, 0xf2, 0xeb, 0xff]);

    for (const [rel, expectedSize] of [
      ['assets/images/adaptive-icon.png', 1024],
      ['assets/images/splash-icon.png', 512],
      ['android/app/src/main/res/drawable-mdpi/splashscreen_logo.png', 288],
      ['android/app/src/main/res/drawable-hdpi/splashscreen_logo.png', 432],
      ['android/app/src/main/res/drawable-xhdpi/splashscreen_logo.png', 576],
      ['android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png', 864],
    ] as const) {
      const img = decodePngRgbaPixels(fs.readFileSync(path.join(root, rel)));
      expect([img.width, img.height]).toEqual([expectedSize, expectedSize]);
      expect(img.getPixel(0, 0)[3]).toBe(0);
    }
  });
});

describe('RootLayout fonts, theme wrapper, and SplashScreen gating', () => {
  const root = path.resolve(__dirname, '../../..');

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  async function renderRootLayoutWithState({
    fontsLoaded,
    fontError,
    themeReady,
    themeBg = '#F5F2EB',
  }: {
    fontsLoaded: boolean;
    fontError: Error | null;
    themeReady: boolean;
    themeBg?: string;
  }) {
    const preventAutoHideAsync = jest.fn().mockResolvedValue(true);
    const hideAsync = jest.fn().mockResolvedValue(undefined);
    const useFontsMock = jest.fn().mockReturnValue([fontsLoaded, fontError]);
    const configureNotifications = jest.fn();
    const registerForPushNotificationsAsync = jest.fn().mockResolvedValue(undefined);
    const loggerWarn = jest.fn();
    const loggerDebug = jest.fn();
    const viewPropsCaptured: Array<Record<string, unknown>> = [];

    let tree!: renderer.ReactTestRenderer;

    await jest.isolateModulesAsync(async () => {
      jest.doMock('react', () => React);
      jest.doMock('react-native-url-polyfill/auto', () => ({}));
      jest.doMock('expo-router', () => ({
        Slot: () => React.createElement('MockSlot'),
      }));
      jest.doMock('expo-font', () => ({
        useFonts: useFontsMock,
      }));
      jest.doMock('expo-splash-screen', () => ({
        preventAutoHideAsync,
        hideAsync,
      }));
      jest.doMock('@expo-google-fonts/source-serif-4', () => ({
        SourceSerif4_600SemiBold: 1,
      }));
      jest.doMock('@expo-google-fonts/ibm-plex-sans', () => ({
        IBMPlexSans_400Regular: 2,
        IBMPlexSans_500Medium: 3,
        IBMPlexSans_600SemiBold: 4,
        IBMPlexSans_700Bold: 5,
      }));
      jest.doMock('@expo-google-fonts/ibm-plex-mono', () => ({
        IBMPlexMono_400Regular: 6,
        IBMPlexMono_500Medium: 7,
        IBMPlexMono_600SemiBold: 8,
      }));
      jest.doMock('react-native-safe-area-context', () => ({
        SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
          React.createElement('MockSafeAreaProvider', null, children),
      }));
      jest.doMock('../../context/AuthContext', () => ({
        AuthProvider: ({ children }: { children: React.ReactNode }) =>
          React.createElement('MockAuthProvider', null, children),
      }));
      jest.doMock('../../context/NotificationContext', () => ({
        NotificationProvider: ({ children }: { children: React.ReactNode }) =>
          React.createElement('MockNotificationProvider', null, children),
      }));
      jest.doMock('../../services/notifications', () => ({
        configureNotifications,
        registerForPushNotificationsAsync,
      }));
      jest.doMock('../../utils/logger', () => ({
        logger: {
          debug: loggerDebug,
          info: jest.fn(),
          warn: loggerWarn,
          error: jest.fn(),
        },
      }));
      jest.doMock('../theme/ThemeContext', () => ({
        ThemeProvider: ({ children }: { children: React.ReactNode }) =>
          React.createElement('MockThemeProvider', null, children),
      }));
      jest.doMock('../theme/useTheme', () => ({
        useTheme: () => ({
          ready: themeReady,
          theme: { colors: { bg: themeBg } },
        }),
      }));
      jest.doMock('react-native', () => ({
        View: (props: Record<string, unknown>) => {
          viewPropsCaptured.push(props);
          return React.createElement('MockView', props);
        },
        StatusBar: () => React.createElement('MockStatusBar'),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RootLayout = require('../../../app/_layout').default;

      await act(async () => {
        tree = renderer.create(React.createElement(RootLayout));
      });
    });

    return {
      tree,
      preventAutoHideAsync,
      hideAsync,
      useFontsMock,
      loggerWarn,
      viewPropsCaptured,
    };
  }

  it('does not hide SplashScreen while fonts or theme are still loading', async () => {
    const fontsPending = await renderRootLayoutWithState({
      fontsLoaded: false,
      fontError: null,
      themeReady: true,
    });
    expect(fontsPending.preventAutoHideAsync).toHaveBeenCalledTimes(1);
    expect(fontsPending.hideAsync).not.toHaveBeenCalled();
    act(() => fontsPending.tree.unmount());

    const themePending = await renderRootLayoutWithState({
      fontsLoaded: true,
      fontError: null,
      themeReady: false,
    });
    expect(themePending.hideAsync).not.toHaveBeenCalled();
    act(() => themePending.tree.unmount());
  });

  it('loads all 8 editorial fonts, wraps providers, applies theme.colors.bg, and hides SplashScreen when ready or on fontError', async () => {
    const readyRun = await renderRootLayoutWithState({
      fontsLoaded: true,
      fontError: null,
      themeReady: true,
      themeBg: '#151412',
    });

    expect(readyRun.useFontsMock).toHaveBeenCalledWith({
      SourceSerif4_600SemiBold: 1,
      IBMPlexSans_400Regular: 2,
      IBMPlexSans_500Medium: 3,
      IBMPlexSans_600SemiBold: 4,
      IBMPlexSans_700Bold: 5,
      IBMPlexMono_400Regular: 6,
      IBMPlexMono_500Medium: 7,
      IBMPlexMono_600SemiBold: 8,
    });
    expect(readyRun.hideAsync).toHaveBeenCalledTimes(1);
    expect(readyRun.viewPropsCaptured[0]?.style).toEqual({
      flex: 1,
      backgroundColor: '#151412',
    });

    const json = JSON.stringify(readyRun.tree.toJSON());
    expect(json).toContain('MockSafeAreaProvider');
    expect(json).toContain('MockThemeProvider');
    expect(json).toContain('MockAuthProvider');
    expect(json).toContain('MockNotificationProvider');
    expect(json).not.toContain('MockStatusBar');
    act(() => readyRun.tree.unmount());

    const errorRun = await renderRootLayoutWithState({
      fontsLoaded: false,
      fontError: new Error('Font network failure'),
      themeReady: true,
    });
    expect(errorRun.hideAsync).toHaveBeenCalledTimes(1);
    expect(errorRun.loggerWarn).toHaveBeenCalledTimes(1);
    act(() => errorRun.tree.unmount());

    const layoutSource = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
    expect(layoutSource).not.toContain('#333');
    expect(layoutSource).not.toContain('<StatusBar');
  });
});
