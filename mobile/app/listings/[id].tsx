import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

export default function ListingsDetailRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; request?: string }>();
  const id = params?.id ? String(params.id) : '';
  const request = params?.request === '1' ? '?request=1' : '';
  useEffect(() => {
    if (!id) router.replace('/(tabs)/listings');
    else router.replace(`/(tabs)/listings/${id}${request}` as any);
  }, [router, id, request]);
  return null;
}
