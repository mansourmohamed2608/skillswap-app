import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

export default function ChatDetailRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ chatId?: string }>();
  const chatId = params?.chatId ? String(params.chatId) : '';
  useEffect(() => {
    if (!chatId) router.replace('/(tabs)/chat');
    else router.replace(`/(tabs)/chat/${chatId}` as any);
  }, [router, chatId]);
  return null;
}
