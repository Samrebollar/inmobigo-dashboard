import { useLocalSearchParams } from 'expo-router';

import { ComingSoon } from '@/components/coming-soon';

export default function Proximamente() {
  const { title } = useLocalSearchParams<{ title?: string }>();
  return <ComingSoon title={title || 'InmobiGo'} showBack />;
}
