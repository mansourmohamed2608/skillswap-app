import React from 'react';
import { View, Text, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { useTranslation } from 'react-i18next';
export default function PrivacyScreen() {
  const { setFade } = useHeaderFade();
  const { t } = useTranslation();
  const privacy = t('legal.privacy', { returnObjects: true }) as any;

  return (
    <ScrollView
      style={cn('flex-1 bg-background')}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y || 0;
        setFade(computeFade(y));
      }}
      scrollEventThrottle={16}
    >
      <View style={cn('px-4 py-6 gap-4')}>
        <Text style={cn('text-2xl font-bold text-foreground')}>{privacy.title}</Text>
        <Text style={cn('text-sm text-muted-foreground')}>{privacy.updated}</Text>

        <Card style={cn('mt-2')}>
          <CardHeader>
            <CardTitle>{privacy.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <View style={cn('gap-3')}>
              <Text style={cn('text-sm text-muted-foreground')}>{privacy.intro}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{privacy.sections.collection.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{privacy.sections.collection.body}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{privacy.sections.usage.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{privacy.sections.usage.body}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{privacy.sections.sharing.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{privacy.sections.sharing.body}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{privacy.sections.choices.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{privacy.sections.choices.body}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{privacy.sections.security.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{privacy.sections.security.body}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{privacy.sections.contact.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{privacy.sections.contact.body}</Text>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
