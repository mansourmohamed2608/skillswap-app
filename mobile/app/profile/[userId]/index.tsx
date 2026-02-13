import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ProfileUserRedirect() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = params?.userId ? String(params.userId) : '';
  if (!userId) return <Redirect href="/(tabs)/profile" />;
  return <Redirect href={{ pathname: '/(tabs)/profile/[userId]', params: { userId } }} />;
}
