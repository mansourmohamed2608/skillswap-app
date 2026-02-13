import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, NativeSyntheticEvent, NativeScrollEvent, TextInput } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useConversationsRTDB } from '@/services/chatRTDB';
import { useAuth } from '@/context/AuthContext';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import Button from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';

function ConversationRow({ id, title, last, unread }: { id: string; title: string; last?: string; unread?: number }) {
  return (
    <Link href={`/chat/${id}`} asChild>
      <View style={cn('flex-row items-center justify-between border-b border-border py-3')}>
        <View>
          <Text style={cn('font-medium text-foreground')}>{title}</Text>
          {last ? <Text style={cn('text-sm text-muted-foreground')} numberOfLines={1}>{last}</Text> : null}
        </View>
        {unread && unread > 0 ? (
          <View style={cn('min-w-[24px] px-2 py-1 rounded-full bg-primary')}>
            <Text style={cn('text-white text-xs text-center')}>{unread}</Text>
          </View>
        ) : null}
      </View>
    </Link>
  );
}

export default function ChatListScreen() {
  const conversations = useConversationsRTDB();
  const { user } = useAuth();
  const { setFade } = useHeaderFade();
  const router = useRouter();
  const [newChatId, setNewChatId] = useState('');
  const { t } = useTranslation();

  function startChat() {
    const nextId = newChatId.trim();
    if (!nextId) return;
    setNewChatId('');
    router.push(`/chat/${encodeURIComponent(nextId)}` as any);
  }

  return (
    <View style={cn('flex-1 bg-background')}>
      <ScrollView
        style={cn('flex-1')}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y || 0;
          setFade(computeFade(y));
        }}
        scrollEventThrottle={16}
      >
        <View style={cn('px-4 py-6 gap-4')}>
          <Text style={cn('text-2xl font-bold text-foreground')}>{t('chat.list.title')}</Text>
          <View style={cn('rounded-lg border border-border bg-card p-4')}>
            <Text style={cn('mb-2 text-sm font-medium text-foreground')}>{t('chat.list.startNew')}</Text>
            <View style={cn('flex-row items-center gap-2')}>
              <TextInput
                value={newChatId}
                onChangeText={setNewChatId}
                placeholder={t('chat.list.userIdPlaceholder')}
                autoCapitalize="none"
                style={cn('flex-1 rounded-lg border border-border bg-background px-3 py-2 text-foreground')}
              />
              <Button onPress={startChat} disabled={!newChatId.trim()}>
                <Text style={cn('text-primary-foreground font-medium')}>{t('chat.list.start')}</Text>
              </Button>
            </View>
          </View>
          <Card>
            <CardHeader>
              <CardTitle>{t('chat.list.conversations')}</CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <Text style={cn('text-muted-foreground')}>{t('chat.list.empty')}</Text>
              ) : (
                conversations.map((c) => {
                  const otherId = Object.keys(c.participants || {}).find((p) => p !== user?.uid) || t('chat.list.conversationFallback');
                  const last = c.lastMessage;
                  let unread = 0;
                  const lastAt = c.lastMessageAt || 0;
                  const readAt = user?.uid && c.perUserLastReadAt?.[user.uid] ? c.perUserLastReadAt[user.uid] : 0;
                  if (lastAt && lastAt > readAt) unread = 1;
                  return (
                    <ConversationRow key={c.id} id={otherId} title={otherId} last={last} unread={unread} />
                  );
                })
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
