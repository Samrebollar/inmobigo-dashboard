import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchResidentContext } from '@/lib/resident';
import { supabase } from '@/lib/supabase';
import { colors, fonts, overline, radius } from '@/theme';

const LOGO = require('@/assets/images/logo-inmobigo.png');
const ADMIN_PANEL_URL = 'https://app.inmobigo.mx';

type Tab = 'admin' | 'resident';
type Notice = { tone: 'error' | 'info' | 'success'; text: string } | null;

/** Login (Figma "Login Screen (Tabs)"). La app es para residentes; la pestaña Administrador lleva al panel web. */
export default function Login() {
  const [tab, setTab] = useState<Tab>('resident');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const signIn = async () => {
    if (!email.trim() || !password) {
      setNotice({ tone: 'error', text: 'Escribe tu correo y tu contraseña.' });
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error || !data.user) {
        setNotice({ tone: 'error', text: 'Correo o contraseña incorrectos.' });
        return;
      }
      // Solo residentes: si la cuenta no está ligada a un residente (p. ej. un administrador), no entra.
      const resident = await fetchResidentContext(data.user.id);
      if (!resident) {
        await supabase.auth.signOut();
        setNotice({
          tone: 'error',
          text: 'Esta cuenta no está registrada como residente. Si eres administrador, usa el panel web.',
        });
        return;
      }
      router.replace('/(tabs)');
    } catch {
      setNotice({ tone: 'error', text: 'No pudimos conectar. Revisa tu internet e inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setNotice({ tone: 'info', text: 'Escribe tu correo arriba y vuelve a tocar "Olvidé mi contraseña".' });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${ADMIN_PANEL_URL}/reset-password`,
    });
    setNotice(
      error
        ? { tone: 'error', text: 'No pudimos enviar el correo. Inténtalo más tarde.' }
        : { tone: 'success', text: 'Te enviamos un correo para restablecer tu contraseña.' }
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.main}>
            <Image source={LOGO} style={styles.logo} contentFit="contain" />

            <View style={styles.header}>
              <Text style={styles.title}>Bienvenido a InmobiGo</Text>
              <Text style={styles.subtitle}>Gestión inteligente de tu propiedad</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.tabs}>
                {(['admin', 'resident'] as const).map(key => {
                  const active = tab === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => {
                        setTab(key);
                        setNotice(null);
                      }}
                      style={[styles.tab, active && styles.tabActive]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}>
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>
                        {key === 'admin' ? 'Administrador' : 'Residente'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {tab === 'admin' ? (
                <View style={styles.adminBox}>
                  <MaterialIcons name="desktop-windows" size={28} color={colors.primary} />
                  <Text style={styles.adminTitle}>El panel de administración es web</Text>
                  <Text style={styles.adminText}>
                    Esta app es para residentes. Administra tus propiedades desde app.inmobigo.mx.
                  </Text>
                  <Pressable style={styles.primaryButton} onPress={() => Linking.openURL(ADMIN_PANEL_URL)}>
                    <Text style={styles.primaryButtonText}>Abrir panel web</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Correo electrónico</Text>
                    <View style={styles.input}>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="tu@correo.com"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        textContentType="emailAddress"
                        style={styles.inputText}
                      />
                      <MaterialIcons name="mail-outline" size={20} color={colors.textMuted} />
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Contraseña</Text>
                    <View style={styles.input}>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        placeholderTextColor={colors.placeholder}
                        secureTextEntry={!showPassword}
                        autoComplete="password"
                        textContentType="password"
                        onSubmitEditing={signIn}
                        returnKeyType="go"
                        style={styles.inputText}
                      />
                      <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={10} accessibilityLabel="Mostrar contraseña">
                        <MaterialIcons name={showPassword ? 'lock-open' : 'lock-outline'} size={20} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  </View>

                  {notice && (
                    <View style={[styles.notice, styles[`notice_${notice.tone}`]]}>
                      <Text style={[styles.noticeText, styles[`noticeText_${notice.tone}`]]}>{notice.text}</Text>
                    </View>
                  )}

                  <View style={styles.actions}>
                    <Pressable
                      style={({ pressed }) => [styles.primaryButton, styles.ingresar, (pressed || loading) && styles.pressed]}
                      onPress={signIn}
                      disabled={loading}>
                      {loading ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <Text style={styles.ingresarText}>Ingresar</Text>
                      )}
                    </Pressable>

                    <View style={styles.dividerRow}>
                      <View style={styles.divider} />
                      <Text style={styles.dividerText}>O accede con</Text>
                      <View style={styles.divider} />
                    </View>

                    <Pressable
                      style={styles.biometric}
                      onPress={() => setNotice({ tone: 'info', text: 'El acceso con biometría estará disponible pronto.' })}>
                      <MaterialIcons name="fingerprint" size={22} color={colors.primaryButton} />
                      <Text style={styles.biometricText}>Biometría</Text>
                    </Pressable>
                  </View>

                  <Pressable onPress={resetPassword} style={styles.forgot}>
                    <Text style={styles.forgotText}>Olvidé mi contraseña</Text>
                  </Pressable>
                </>
              )}
            </View>

            <Text style={styles.footer}>
              ¿No tienes una cuenta? <Text style={styles.footerLink}>Contacta a tu administración</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  main: { width: '100%', maxWidth: 440, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
  logo: { width: 96, height: 96, marginBottom: 14 },
  header: { alignItems: 'center', gap: 4, paddingBottom: 32 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 36, letterSpacing: -0.64, color: colors.text, textAlign: 'center' },
  subtitle: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.textMuted, textAlign: 'center' },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 32,
    gap: 24,
  },
  tabs: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.lg, padding: 4 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: radius.md },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.24, color: colors.textMuted },
  tabTextActive: { color: colors.white },
  field: { gap: 12 },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.24, color: colors.textMuted, paddingLeft: 4 },
  input: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 17,
  },
  inputText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, paddingVertical: 0 },
  notice: { borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  notice_error: { backgroundColor: '#FEF2F2', borderColor: colors.dangerBorder },
  notice_info: { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' },
  notice_success: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  noticeText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  noticeText_error: { color: colors.dangerText },
  noticeText_info: { color: colors.primary },
  noticeText_success: { color: colors.successText },
  actions: { gap: 16, paddingTop: 8 },
  primaryButton: {
    backgroundColor: colors.primaryButton,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryButtonText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  ingresar: { height: 56, paddingVertical: 0 },
  ingresarText: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 28, color: colors.primaryButtonText },
  pressed: { opacity: 0.85 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...overline(11, 1.1), fontFamily: fonts.medium, lineHeight: 14 },
  biometric: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  biometricText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.text },
  forgot: { alignItems: 'center', paddingTop: 4 },
  forgotText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.24, color: colors.primary },
  adminBox: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  adminTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, textAlign: 'center' },
  adminText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center', marginBottom: 8 },
  footer: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.textMuted, textAlign: 'center', paddingTop: 32 },
  footerLink: { fontFamily: fonts.bold, color: colors.primary },
});
