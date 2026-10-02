import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { useAuth } from '@/lib/auth';

export default function TabsLayout() {
  const { session, loading } = useAuth();
  if (!loading && !session) return <Redirect href="/login" />;

  return (
    <Tabs tabBar={props => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="pagos" />
      <Tabs.Screen name="qr" />
      <Tabs.Screen name="avisos" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
