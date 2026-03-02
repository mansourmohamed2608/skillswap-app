import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function RequestsIndexRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/(tabs)/requests'); }, [router]);
  return null;
}
