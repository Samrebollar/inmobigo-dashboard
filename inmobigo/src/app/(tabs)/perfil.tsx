import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { ComingSoon } from '@/components/coming-soon';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme';

export default function Perfil() {
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <ComingSoon title="Perfil" icon="person-outline" description="Aquí podrás editar tus datos, tu teléfono y tus preferencias.">
      <Pressable style={styles.signOut} onPress={signOut} disabled={signingOut}>
        {signingOut ? (
          <ActivityIndicator color={colors.dangerText} />
        ) : (
          <>
            <MaterialIcons name="logout" size={18} color={colors.dangerText} />
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </>
        )}
      </Pressable>
    </ComingSoon>
  );
}

const styles = StyleSheet.create({
  signOut: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: '#FEF2F2',
  },
  signOutText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.dangerText },
});
