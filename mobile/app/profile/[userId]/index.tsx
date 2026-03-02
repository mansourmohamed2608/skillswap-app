import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

export default function ProfileUserRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = params?.userId ? String(params.userId) : '';
  useEffect(() => {
    if (!userId) router.replace('/(tabs)/profile');
    else router.replace(`/(tabs)/profile/${userId}` as any);
  }, [router, userId]);
  return null;
}
