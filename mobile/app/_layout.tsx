import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Text, Platform, View } from 'react-native';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import i18n from '@/lib/i18n';
import MobileHeader from '@/components/layout/MobileHeader';
import { HeaderFadeProvider, useHeaderFade } from '@/context/HeaderFadeContext';
import { HEADER_HEIGHT } from '@/components/layout/constants';
import { usePresence } from '@/services/presence';
import { buildErrorMessageOptions, setErrorMessages } from '@/lib/errors';
import { KycGate } from '@/components/auth/KycGate';

function LayoutWithHeaderPadding() {
  // Start content after measured header height on every page
  const { headerHeight } = useHeaderFade();
  usePresence();
  return (
    <View style={{ flex: 1, paddingTop: headerHeight || HEADER_HEIGHT }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: cn('bg-background') }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="listings/[id]" />
        <Stack.Screen name="listings/new" />
        <Stack.Screen name="wishes/donate" />
        <Stack.Screen name="wishes/request" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  // Apply consistent default font across the app; swap to Geist if added later
  if ((Text as any).defaultProps == null) (Text as any).defaultProps = {} as any;
  (Text as any).defaultProps.style = [{
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  }];
  useEffect(() => {
    const updateErrors = () => {
      setErrorMessages(buildErrorMessageOptions(i18n.t.bind(i18n), i18n.language));
    };
    updateErrors();
    i18n.on('languageChanged', updateErrors);
    return () => {
      i18n.off('languageChanged', updateErrors);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SafeAreaView style={[{ flex: 1 }, cn('bg-background')]}>
          <HeaderFadeProvider>
            <KycGate>
              <LayoutWithHeaderPadding />
              {/* Global overlay header across all pages */}
              <MobileHeader />
            </KycGate>
          </HeaderFadeProvider>
        </SafeAreaView>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
