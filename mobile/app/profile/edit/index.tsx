import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function ProfileEditRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/(tabs)/profile/edit'); }, [router]);
  return null;
}
