import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius, softShadow } from '@/theme';

type Props = {
  title: string;
  description?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  /** Muestra la flecha para volver (pantallas abiertas desde el Inicio). */
  showBack?: boolean;
  children?: ReactNode;
};

/** Pantalla de sección que todavía se está construyendo, con el estilo del diseño. */
export function ComingSoon({ title, description, icon = 'construction', showBack, children }: Props) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        {showBack && (
          <Pressable style={[styles.back, softShadow]} onPress={() => router.back()} accessibilityLabel="Volver">
            <MaterialIcons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>
        <View style={[styles.card, softShadow]}>
          <View style={styles.iconWrap}>
            <MaterialIcons name={icon} size={28} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Muy pronto</Text>
          <Text style={styles.cardText}>{description ?? `Estamos construyendo la sección de ${title}.`}</Text>
        </View>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  back: { width: 40, height: 40, borderRadius: 9999, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.45, color: colors.text },
  body: { paddingHorizontal: 20, gap: 16 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xxl,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: { width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  cardText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
});
