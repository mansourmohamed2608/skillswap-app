import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

export default function ServicesDetailRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params?.id ? String(params.id) : '';
  useEffect(() => {
    if (!id) router.replace('/(tabs)/listings');
    else router.replace(`/(tabs)/listings/${id}` as any);
  }, [router, id]);
  return null;
}
