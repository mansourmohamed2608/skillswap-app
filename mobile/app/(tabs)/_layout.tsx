import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export default function TabsLayout() {
  useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Hide the bottom tab bar entirely (we use the header burger menu for navigation)
        tabBarStyle: { display: 'none' },
        sceneStyle: cn('bg-background') as any,
      }}
    />
  );
}
