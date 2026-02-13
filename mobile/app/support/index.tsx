import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export default function SupportScreen() {
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerStyle={cn('p-4 gap-4 bg-background')}>
      <View>
        <Text style={cn('text-2xl font-bold text-foreground')}>{t('support.title') || 'Support'}</Text>
        <Text style={cn('mt-1 text-sm text-muted-foreground')}>{t('support.subtitle') || 'We are here to help.'}</Text>
      </View>
      <View style={cn('rounded-lg border border-border bg-card p-3')}>
        <Text style={cn('text-base font-semibold text-foreground')}>{t('support.contact_title') || 'Contact'}</Text>
        <Text style={cn('mt-1 text-sm text-muted-foreground')}>{t('support.contact_body') || 'Email support@skillswap.app for help.'}</Text>
      </View>
      <View style={cn('rounded-lg border border-border bg-card p-3')}>
        <Text style={cn('text-base font-semibold text-foreground')}>{t('support.billing_title') || 'Billing & memberships'}</Text>
        <Text style={cn('mt-1 text-sm text-muted-foreground')}>{t('support.billing_body') || 'Include your plan and purchase date for billing questions.'}</Text>
      </View>
      <View style={cn('rounded-lg border border-border bg-card p-3')}>
        <Text style={cn('text-base font-semibold text-foreground')}>{t('support.kyc_title') || 'KYC & verification'}</Text>
        <Text style={cn('mt-1 text-sm text-muted-foreground')}>{t('support.kyc_body') || 'If verification is stuck, retry from your profile.'}</Text>
      </View>
      <View style={cn('rounded-lg border border-border bg-card p-3')}>
        <Text style={cn('text-base font-semibold text-foreground')}>{t('support.safety_title') || 'Safety & reports'}</Text>
        <Text style={cn('mt-1 text-sm text-muted-foreground')}>{t('support.safety_body') || 'Report listings or wishes that violate community rules.'}</Text>
      </View>
    </ScrollView>
  );
}
