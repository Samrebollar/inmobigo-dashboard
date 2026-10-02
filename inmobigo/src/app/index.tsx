import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { colors, fonts, overline } from '@/theme';

const LOGO = require('@/assets/images/logo-inmobigo.png');
const SPLASH_MS = 2500;

/** Splash (Figma "Splash Screen (Nuevo Logo)"): logo con entrada, barra de progreso de 2.5 s y redirección. */
export default function Splash() {
  const { session, loading } = useAuth();
  const [done, setDone] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const [logoScale] = useState(() => new Animated.Value(0.85));
  const [textOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoScale, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 500, delay: 250, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: SPLASH_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]).start(() => setDone(true));
  }, [logoScale, textOpacity, progress]);

  useEffect(() => {
    if (!done || loading) return;
    router.replace(session ? '/(tabs)' : '/login');
  }, [done, loading, session]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
        </Animated.View>
        <Animated.View style={[styles.texts, { opacity: textOpacity }]}>
          <Text style={styles.title}>InmobiGo</Text>
          <Text style={styles.subtitle}>Smart Property Management</Text>
        </Animated.View>
        <View style={styles.footer}>
          <View style={styles.track}>
            <Animated.View
              style={[styles.bar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
            />
          </View>
          <Text style={styles.loading}>Cargando preferencias</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  // Como en Figma: el bloque se acomoda en la mitad superior (pb 448 de 820).
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: '50%' },
  logo: { width: 192, height: 192 },
  texts: { alignItems: 'center', paddingTop: 16, gap: 4 },
  title: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40, letterSpacing: -0.8, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  footer: { alignItems: 'center', paddingTop: 12 },
  track: { width: 160, height: 4, borderRadius: 9999, backgroundColor: colors.track, overflow: 'hidden' },
  bar: { height: 4, borderRadius: 9999, backgroundColor: colors.primary },
  loading: { ...overline(11, 1.1, colors.primary), lineHeight: 14, paddingTop: 16 },
});
