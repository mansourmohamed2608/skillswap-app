import React from 'react';
import { View, Text, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { useTranslation } from 'react-i18next';
export default function TermsScreen() {
  const { setFade } = useHeaderFade();
  const { t } = useTranslation();
  const terms = t('legal.terms', { returnObjects: true }) as any;

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
        <Text style={cn('text-2xl font-bold text-foreground')}>{terms.title}</Text>
        <Text style={cn('text-sm text-muted-foreground')}>{terms.updated}</Text>

        <Card style={cn('mt-2')}>
          <CardHeader>
            <CardTitle>{terms.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <View style={cn('gap-3')}>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.intro1}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.intro2}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{terms.sections.definitions.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.definitions.body}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{terms.sections.cookies.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.cookies.body1}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.cookies.body2}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{terms.sections.license.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.license.body1}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.license.listIntro}</Text>
              <View style={cn('pl-3 gap-1')}>
                {terms.sections.license.list.map((item: string) => (
                  <Text key={item} style={cn('text-sm text-muted-foreground')}>• {item}</Text>
                ))}
              </View>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.license.body2}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{terms.sections.comments.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.comments.body}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{terms.sections.hyperlinking.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.hyperlinking.body}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{terms.sections.iframes.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.iframes.body}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{terms.sections.liability.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.liability.body}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{terms.sections.rights.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.rights.body}</Text>

              <Text style={cn('text-base font-semibold text-foreground')}>{terms.sections.disclaimer.title}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.disclaimer.body1}</Text>
              <View style={cn('pl-3 gap-1')}>
                {terms.sections.disclaimer.list.map((item: string) => (
                  <Text key={item} style={cn('text-sm text-muted-foreground')}>• {item}</Text>
                ))}
              </View>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.disclaimer.body2}</Text>
              <Text style={cn('text-sm text-muted-foreground')}>{terms.sections.disclaimer.body3}</Text>

              <Text style={cn('text-sm font-semibold text-foreground')}>{terms.footerNote}</Text>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
