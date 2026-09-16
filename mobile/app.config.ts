import 'dotenv/config';

export default {
  expo: {
    name: 'SkillSwap',
    slug: 'skillswap',
    scheme: 'skillswap',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: process.env.EXPO_BUNDLE_ID || 'com.skillswap.app',
    },
    android: {
      package: process.env.EXPO_ANDROID_PACKAGE || 'com.skillswap.app',
    },
    plugins: [
      [
        'expo-build-properties',
        {
          android: { minSdkVersion: 24 },
        },
      ],
      'expo-router',
      'expo-localization',
    ],
    web: { bundler: 'metro', output: 'static' },
    extra: {
      EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      EXPO_PUBLIC_FIREBASE_DATABASE_URL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
      EXPO_PUBLIC_FUNCTIONS_BASE: process.env.EXPO_PUBLIC_FUNCTIONS_BASE,
      EXPO_PUBLIC_USE_EMULATORS: process.env.EXPO_PUBLIC_USE_EMULATORS || 'false',
      EXPO_PUBLIC_EMULATOR_HOST: process.env.EXPO_PUBLIC_EMULATOR_HOST,
      EXPO_PUBLIC_USE_MOCK_PAYMENTS: process.env.EXPO_PUBLIC_USE_MOCK_PAYMENTS || 'false',
      EXPO_PUBLIC_REQUIRE_LATIN_NAME: process.env.EXPO_PUBLIC_REQUIRE_LATIN_NAME || 'false',
    },
  },
};
