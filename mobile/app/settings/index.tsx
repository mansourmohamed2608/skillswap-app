import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  LifeBuoy,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';
import { setLanguage } from '@/lib/i18n';

const links = [
  { href: '/profile/edit', label: 'Edit profile', icon: CircleUserRound },
  { href: '/(tabs)/profile?tab=notifications', label: 'Notifications', icon: Bell },
  { href: '/pricing', label: 'Membership & subscription', icon: CreditCard },
  { href: '/profile/verify', label: 'Identity verification', icon: ShieldCheck },
  { href: '/profile/edit', label: 'Account & security', icon: LockKeyhole },
  { href: '/support', label: 'Help & support', icon: LifeBuoy },
] as const;

export default function SettingsScreen() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  if (!user) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background px-6')}>
        <Text style={cn('mb-4 text-center text-foreground')}>{t('auth.sign_in_required') || 'Please sign in to view settings.'}</Text>
        <Link href="/auth/signin" asChild>
          <TouchableOpacity style={cn('rounded-lg bg-primary px-5 py-3')}>
            <Text style={cn('font-semibold text-primary-foreground')}>{t('header.signIn') || 'Sign In'}</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  const currentLanguage = i18n.language === 'ar' ? 'ar' : 'en';

  return (
    <ScrollView style={cn('flex-1 bg-background')} contentContainerStyle={cn('gap-5 px-4 py-6')}>
      <View>
        <Text style={cn('text-3xl font-bold text-foreground')}>{t('nav.mobile.settings') || 'Settings'}</Text>
        <Text style={cn('mt-1 text-sm text-muted-foreground')}>Manage your account and application preferences.</Text>
      </View>

      <View style={cn('rounded-xl border border-border bg-card p-4')}>
        <Text style={cn('mb-3 text-base font-semibold text-foreground')}>Language</Text>
        <View style={cn('flex-row gap-2')}>
          {(['en', 'ar'] as const).map((language) => (
            <TouchableOpacity
              key={language}
              onPress={() => setLanguage(language)}
              style={cn(`flex-1 rounded-lg border px-3 py-3 ${currentLanguage === language ? 'border-primary bg-primary/10' : 'border-border'}`)}
            >
              <Text style={cn('text-center font-medium text-foreground')}>{language === 'en' ? 'English' : 'العربية'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={cn('overflow-hidden rounded-xl border border-border bg-card')}>
        {links.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link key={`${item.href}-${item.label}`} href={item.href as any} asChild>
              <TouchableOpacity style={cn(`min-h-14 flex-row items-center gap-3 px-4 py-3 ${index ? 'border-t border-border' : ''}`)}>
                <Icon size={20} color="#4f7942" />
                <Text style={cn('flex-1 font-medium text-foreground')}>{item.label}</Text>
                <ChevronRight size={17} color="#6b7280" />
              </TouchableOpacity>
            </Link>
          );
        })}
      </View>
    </ScrollView>
  );
}
