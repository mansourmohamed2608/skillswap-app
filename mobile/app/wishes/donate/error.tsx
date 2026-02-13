
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Button from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/errors';

export default function ErrorScreen({ error, reset }: { error?: Error; reset?: () => void }) {
  const router = useRouter();
  useEffect(() => {
    if (error) console.error('Donate Page Error:', error);
  }, [error]);

  return (
    <View style={cn('flex-1 items-center justify-center bg-background px-4')}>
      <AlertTriangle size={64} color="#ef4444" />
      <Text style={cn('text-2xl font-bold text-primary mt-4')}>Oops! Something went wrong.</Text>
      <Text style={cn('text-muted-foreground mt-2 text-center max-w-[600px]')}>
        We encountered an issue while trying to load the donation page. Please try again or contact support if the problem persists.
      </Text>
      {error?.message ? (
        <Text style={cn('text-sm text-destructive mt-3')}>Error: {getErrorMessage(error, '')}</Text>
      ) : null}
      <View style={cn('flex-row gap-3 mt-6')}>
        <Button onPress={() => (reset ? reset() : router.replace('/'))}>Try again</Button>
        <Button variant="outline" onPress={() => router.replace('/')}>Go to Homepage</Button>
      </View>
    </View>
  );
}
