import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function ProfileIndexRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/(tabs)/profile'); }, [router]);
  return null;
}
