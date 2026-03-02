import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function ServicesIndexRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/(tabs)/listings'); }, [router]);
  return null;
}
