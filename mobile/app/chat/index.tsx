import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function ChatIndexRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/(tabs)/chat'); }, [router]);
  return null;
}
