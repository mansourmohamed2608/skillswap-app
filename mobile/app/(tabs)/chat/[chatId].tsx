import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { useMessagesRTDB, conversationIdWith } from '@/services/chatRTDB';
import { markConversationReadMobile, sendChatMessageMobile } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useMembership } from '@/hooks/useMembership';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { getErrorMessage } from '@/lib/errors';
import { useTranslation } from 'react-i18next';
import { getUserById } from '@/services/data';

export default function ChatThreadScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { user } = useAuth();
  const { convId, otherUserId } = useMemo(() => {
    if (!user?.uid || !chatId) return { convId: undefined, otherUserId: chatId as string | undefined };
    const raw = String(chatId);
    if (raw.includes('_')) {
      const parts = raw.split('_');
      if (parts.length === 2 && parts.includes(user.uid)) {
        const other = parts[0] === user.uid ? parts[1] : parts[0];
        return { convId: raw, otherUserId: other };
      }
    }
    return { convId: conversationIdWith(raw, user.uid), otherUserId: raw };
  }, [chatId, user?.uid]);
  const msgs = useMessagesRTDB(convId);
  const { active, canSendMessage } = useMembership();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const { setFade } = useHeaderFade();
  const { t } = useTranslation();

  useEffect(() => {
    if (convId && user?.uid) {
      markConversationReadMobile(convId).catch(() => {});
    }
  }, [convId, user?.uid]);

  useEffect(() => {
    if (!otherUserId) return;
    getUserById(otherUserId).then((u) => {
      if (u) setPartnerName((u as any).name || '');
    });
  }, [otherUserId]);

  async function onSend() {
    if (!otherUserId || !user?.uid) return;
    if (!text.trim()) return;
    if (!active || !canSendMessage) {
      Alert.alert(t('chat.subscriptionRequiredTitle'), t('chat.subscriptionRequiredBody'));
      return;
    }
    try {
      setSending(true);
      await sendChatMessageMobile({ recipientId: otherUserId, text: text.trim() });
      setText('');
    } catch (e: any) {
      Alert.alert(t('common.error') || 'Error', getErrorMessage(e, t('errors.generic')));
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={cn('flex-1 bg-background')}>
      <ScrollView
        style={cn('flex-1')}
        contentContainerStyle={{ padding: 16 }}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y || 0;
          setFade(computeFade(y));
        }}
        scrollEventThrottle={16}
      >
        <Text style={cn('text-2xl font-bold text-foreground mb-4')}>
          {partnerName || otherUserId || t('chat.thread.title')}
        </Text>
        <Card>
          <CardContent>
            {msgs.length === 0 ? (
              <Text style={cn('text-muted-foreground')}>{t('chat.thread.empty')}</Text>
            ) : (
              msgs.map((m) => (
                <View key={m.id} style={cn('mb-2', m.senderId === user?.uid ? 'items-end' : 'items-start')}>
                  <View style={cn('px-3 py-2 rounded-md', m.senderId === user?.uid ? 'bg-primary' : 'bg-card border border-border')}>
                    <Text style={cn(m.senderId === user?.uid ? 'text-white' : 'text-foreground')}>{m.text}</Text>
                  </View>
                </View>
              ))
            )}
          </CardContent>
          <CardFooter>
            <View style={cn('flex-row items-center gap-2 w-full')}>
              <TextInput
                style={cn('flex-1 border border-input bg-background rounded-md px-3 py-2')}
                placeholder={t('chat.thread.placeholder')}
                value={text}
                onChangeText={setText}
              />
              <TouchableOpacity onPress={onSend} disabled={sending} style={cn('bg-primary px-4 py-2 rounded-md')}>
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={cn('text-white font-semibold')}>{t('chat.thread.send')}</Text>}
              </TouchableOpacity>
            </View>
          </CardFooter>
        </Card>

        <View style={cn('flex-row justify-between items-center mt-4')}>
          <Link href="/chat"><Text style={cn('text-primary')}>{t('chat.thread.back')}</Text></Link>
        </View>
      </ScrollView>
    </View>
  );
}
