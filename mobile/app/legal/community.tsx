import React from 'react';
import { View, Text, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { useTranslation } from 'react-i18next';

export default function CommunityGuidelinesScreen() {
  const { setFade } = useHeaderFade();
  const { t } = useTranslation();
  const doc = t('legal.community', { returnObjects: true }) as any;

  const sections = [
    doc?.sections?.respect,
    doc?.sections?.safety,
    doc?.sections?.honesty,
    doc?.sections?.reporting,
    doc?.sections?.enforcement,
  ].filter(Boolean);

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
        <Text style={cn('text-2xl font-bold text-foreground')}>{doc.title}</Text>
        <Text style={cn('text-sm text-muted-foreground')}>{doc.updated}</Text>

        <Card style={cn('mt-2')}>
          <CardContent>
            <View style={cn('gap-3 pt-2')}>
              <Text style={cn('text-sm text-muted-foreground')}>{doc.intro}</Text>
              {sections.map((section: any) => (
                <View key={section.title}>
                  <Text style={cn('text-base font-semibold text-foreground')}>{section.title}</Text>
                  <Text style={cn('text-sm text-muted-foreground mt-1')}>{section.body}</Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
