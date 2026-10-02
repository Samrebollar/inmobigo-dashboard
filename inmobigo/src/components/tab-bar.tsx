import { MaterialIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';

type IconName = keyof typeof MaterialIcons.glyphMap;

const TABS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Inicio', icon: 'home', iconActive: 'home' },
  pagos: { label: 'Pagos', icon: 'payments', iconActive: 'payments' },
  qr: { label: 'QR', icon: 'qr-code-2', iconActive: 'qr-code-2' },
  avisos: { label: 'Avisos', icon: 'campaign', iconActive: 'campaign' },
  perfil: { label: 'Perfil', icon: 'person-outline', iconActive: 'person' },
};

/** Barra inferior (Figma "Bottom Navigation Bar"): el QR va al centro, elevado y en azul. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (route.name === 'qr') {
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item} accessibilityRole="button" accessibilityLabel="Pase de visita QR">
              <View style={styles.qrSlot}>
                <View style={styles.qrButton}>
                  <MaterialIcons name={tab.icon} size={22} color={colors.white} />
                </View>
              </View>
              <Text style={[styles.label, styles.labelActive]}>{tab.label}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.item} accessibilityRole="button" accessibilityState={{ selected: focused }}>
            <MaterialIcons name={focused ? tab.iconActive : tab.icon} size={22} color={focused ? colors.primary : colors.textSubtle} />
            <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1,
    borderTopColor: colors.borderSofter,
  },
  item: { flex: 1, height: 64, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 15, color: colors.textSubtle, paddingTop: 4 },
  labelActive: { color: colors.primary },
  qrSlot: { width: 48, height: 22, alignItems: 'center' },
  qrButton: {
    position: 'absolute',
    top: -30,
    width: 52,
    height: 52,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});
