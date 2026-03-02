import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function ListingsNewRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/(tabs)/listings/new'); }, [router]);
  return null;
}
