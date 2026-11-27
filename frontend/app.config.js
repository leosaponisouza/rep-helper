// app.config.js
const env = require('./env');

// Determina se estamos em modo de desenvolvimento
const IS_DEV = process.env.EXPO_PUBLIC_ENV === 'development';

module.exports = {
  name: IS_DEV ? "Alpendre (Dev)" : "Alpendre",
  slug: "alpendre",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "alpendre",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#F5F2EB"
  },
  updates: {
    url: "https://u.expo.dev/883082f7-0fde-4821-b970-bb262f455554"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#F5F2EB"
    },
    package: IS_DEV ? "com.alpendre.app.dev" : "com.alpendre.app",
    runtimeVersion: "1.0.0"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV ? "com.alpendre.app.dev" : "com.alpendre.app",
    runtimeVersion: {
      policy: "appVersion"
    }
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png"
  },
  plugins: [
    "expo-router",
    "expo-secure-store"
  ],
  experiments: {
    typedRoutes: true
  },
  // Aqui definimos as variáveis de ambiente usando os valores do env.js
  extra: {
    // API config
    apiBaseUrl: env.EXPO_PUBLIC_API_BASE_URL,

    // EAS config
    eas: {
      projectId: "883082f7-0fde-4821-b970-bb262f455554"
    }
  }
};