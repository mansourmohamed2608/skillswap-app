import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ListingsEditRedirect() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params?.id ? String(params.id) : '';
  if (!id) return <Redirect href="/(tabs)/listings" />;
  return <Redirect href={{ pathname: '/(tabs)/listings/[id]/edit', params: { id } }} />;
}
