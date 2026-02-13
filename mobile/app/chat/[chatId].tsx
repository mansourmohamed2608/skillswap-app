import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ChatDetailRedirect() {
  const params = useLocalSearchParams<{ chatId?: string }>();
  const chatId = params?.chatId ? String(params.chatId) : '';
  if (!chatId) return <Redirect href="/(tabs)/chat" />;
  return <Redirect href={{ pathname: '/(tabs)/chat/[chatId]', params: { chatId } }} />;
}
