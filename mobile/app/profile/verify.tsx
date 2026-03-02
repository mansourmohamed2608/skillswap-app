import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function ProfileVerifyRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/(tabs)/profile/verify'); }, [router]);
  return null;
}
