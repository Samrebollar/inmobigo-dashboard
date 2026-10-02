import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import {
  fetchInvoices,
  fetchNotices,
  fetchRecentActivity,
  fetchResidentContext,
  formatLongDate,
  formatMoney,
  formatRelative,
  summarizeBalance,
  type ActivityItem,
  type BalanceStatus,
  type BalanceSummary,
  type Notice,
  type ResidentContext,
} from '@/lib/resident';
import { colors, fonts, overline, radius, softShadow } from '@/theme';

type QuickAction = {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
};

const STATUS_UI: Record<BalanceStatus, { label: string; bg: string; border: string; dot: string; text: string }> = {
  al_corriente: { label: 'Al corriente', bg: colors.successBg, border: colors.successBorder, dot: colors.successDot, text: colors.successText },
  pendiente: { label: 'Pago pendiente', bg: colors.warningBg, border: colors.warningBorder, dot: colors.warningDot, text: colors.warningText },
  con_adeudo: { label: 'Con adeudo', bg: '#FEF2F2', border: colors.dangerBorder, dot: colors.dangerDot, text: colors.dangerText },
};

const comingSoon = (title: string) => () => router.push({ pathname: '/proximamente', params: { title } });

export default function Dashboard() {
  const { session } = useAuth();
  const [ctx, setCtx] = useState<ResidentContext | null>(null);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setError(null);
      const resident = await fetchResidentContext(session.user.id);
      if (!resident) {
        setError('Tu cuenta no está ligada a un residente. Contacta a tu administración.');
        return;
      }
      const invoices = await fetchInvoices(resident.residentId);
      const [noticeRows, activityRows] = await Promise.all([
        fetchNotices(resident.organizationId, resident.condominiumName),
        fetchRecentActivity(resident, invoices),
      ]);
      setCtx(resident);
      setBalance(summarizeBalance(invoices, resident.paymentDeadline));
      setNotices(noticeRows);
      setActivity(activityRows);
    } catch {
      setError('No pudimos cargar tu información. Desliza hacia abajo para reintentar.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const actions: QuickAction[] = [
    { label: 'Mis pagos', icon: <MaterialIcons name="payments" size={24} color={colors.primary} />, onPress: () => router.navigate('/(tabs)/pagos') },
    { label: 'Pase\nvisita', icon: <MaterialIcons name="qr-code-2" size={24} color={colors.primary} />, onPress: () => router.navigate('/(tabs)/qr') },
    { label: 'Amenidades', icon: <MaterialIcons name="pool" size={24} color={colors.primary} />, onPress: comingSoon('Amenidades') },
    { label: 'Incidencias', icon: <MaterialIcons name="warning-amber" size={24} color={colors.primary} />, onPress: comingSoon('Incidencias') },
    { label: 'Paquetería', icon: <MaterialCommunityIcons name="package-variant-closed" size={24} color={colors.primary} />, onPress: comingSoon('Paquetería') },
    { label: 'Documentos', icon: <MaterialCommunityIcons name="file-document-outline" size={24} color={colors.primary} />, onPress: comingSoon('Documentos') },
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const status = STATUS_UI[balance?.status ?? 'al_corriente'];
  const initials = `${ctx?.firstName?.[0] ?? ''}${ctx?.lastName?.[0] ?? ''}`.toUpperCase() || 'IG';
  const location = [ctx?.condominiumName, ctx?.unitNumber].filter(Boolean).join(' • ');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, softShadow]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerTexts}>
            <Text style={styles.hello} numberOfLines={1}>Hola {ctx?.firstName || 'vecino'} 👋</Text>
            {!!location && <Text style={styles.location} numberOfLines={1}>{location}</Text>}
          </View>
        </View>
        <Pressable style={[styles.bell, softShadow]} onPress={() => router.navigate('/(tabs)/avisos')} accessibilityLabel="Avisos">
          <MaterialCommunityIcons name="bell-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.main}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}>
        {error ? (
          <View style={[styles.card, styles.errorCard]}>
            <MaterialIcons name="error-outline" size={22} color={colors.dangerText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={[styles.card, styles.hero, softShadow]}>
            <View style={styles.heroTop}>
              <View style={[styles.badge, { backgroundColor: status.bg, borderColor: status.border }]}>
                <View style={[styles.badgeDot, { backgroundColor: status.dot }]} />
                <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
              </View>
              <View style={styles.walletIcon}>
                <MaterialCommunityIcons name="wallet-outline" size={17} color={colors.textMuted} />
              </View>
            </View>
            <View style={styles.balanceBlock}>
              <Text style={overline(11, 1.1, colors.textSubtle)}>Saldo actual</Text>
              <Text style={styles.balance}>{formatMoney(balance?.balance ?? 0)}</Text>
            </View>
            <View style={styles.heroBottom}>
              <View style={styles.nextPayment}>
                <Text style={overline(10, 0.5, colors.textSubtle)}>Próximo pago</Text>
                <Text style={styles.nextPaymentDate}>{balance ? formatLongDate(balance.nextPaymentDate) : '—'}</Text>
              </View>
              <Pressable style={styles.receiptButton} onPress={() => router.navigate('/(tabs)/pagos')}>
                <Text style={styles.receiptButtonText}>Ver recibo</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceso rápido</Text>
          <View style={styles.grid}>
            {actions.map(action => (
              <Pressable key={action.label} style={({ pressed }) => [styles.tile, softShadow, pressed && styles.pressed]} onPress={action.onPress}>
                <View style={styles.tileIcon}>{action.icon}</View>
                <Text style={styles.tileLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Avisos</Text>
            <Pressable onPress={() => router.navigate('/(tabs)/avisos')} hitSlop={8}>
              <Text style={styles.link}>Ver todos</Text>
            </Pressable>
          </View>
          {notices.length === 0 ? (
            <View style={[styles.card, styles.empty, softShadow]}>
              <Text style={styles.emptyText}>No hay avisos por ahora.</Text>
            </View>
          ) : (
            notices.map(notice => {
              const urgent = notice.priority === 'high' || notice.priority === 'urgent' || notice.type === 'urgent';
              return (
                <View key={notice.id} style={[styles.notice, softShadow]}>
                  <View style={styles.noticeTop}>
                    <View style={[styles.tag, { backgroundColor: urgent ? colors.dangerBg : colors.surfaceMuted }]}>
                      <Text style={[overline(10, 0.5, urgent ? colors.dangerText : colors.textMuted), styles.tagText]}>
                        {urgent ? 'Urgente' : 'General'}
                      </Text>
                    </View>
                    <Text style={styles.meta}>{formatRelative(notice.created_at, true)}</Text>
                  </View>
                  <Text style={styles.noticeTitle}>{notice.title}</Text>
                  {!!notice.location && (
                    <View style={styles.noticeMeta}>
                      <MaterialCommunityIcons name="map-marker-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.noticeMetaText}>{notice.location}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>Actividad reciente</Text>
          <View style={[styles.card, styles.activityCard, softShadow]}>
            {activity.length === 0 ? (
              <Text style={[styles.emptyText, styles.activityEmpty]}>Aquí verás tus pagos y reservas.</Text>
            ) : (
              activity.map((item, i) => (
                <View key={item.id} style={[styles.activityRow, i < activity.length - 1 && styles.activityDivider]}>
                  <View style={styles.activityIcon}>
                    <MaterialCommunityIcons
                      name={item.kind === 'payment' ? 'check-circle-outline' : 'calendar-blank-outline'}
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.activityTexts}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activitySubtitle} numberOfLines={1}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.meta}>{formatRelative(item.date)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(248,249,250,0.9)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  headerTexts: { flex: 1 },
  hello: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 28, letterSpacing: -0.45, color: colors.text },
  location: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  bell: { width: 40, height: 40, borderRadius: 9999, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  main: { paddingHorizontal: 20, paddingBottom: 24, gap: 32 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xxl },
  hero: { minHeight: 220, paddingHorizontal: 25, paddingTop: 25, paddingBottom: 23, justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 9999, paddingHorizontal: 17, paddingVertical: 9 },
  badgeDot: { width: 8, height: 8, borderRadius: 9999 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 16.5, letterSpacing: 0.275, textTransform: 'uppercase' },
  walletIcon: { width: 32, height: 32, borderRadius: 9999, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  balanceBlock: { paddingTop: 16, gap: 4 },
  balance: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 48, letterSpacing: -1.6, color: colors.text },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 16 },
  nextPayment: { gap: 2 },
  nextPaymentDate: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.text },
  receiptButton: { backgroundColor: colors.primaryButton, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 8 },
  receiptButtonText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.white },
  errorCard: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 20 },
  errorText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.dangerText },
  section: { gap: 16 },
  lastSection: { paddingBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...overline(14, 1.4), lineHeight: 20 },
  link: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  tile: {
    width: '29.5%',
    flexGrow: 1,
    minHeight: 120,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileLabel: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 13.75, color: colors.textMuted, textAlign: 'center' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  notice: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    padding: 17,
    gap: 7.5,
  },
  noticeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tag: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { lineHeight: 15 },
  meta: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 15, color: colors.textSubtle },
  noticeTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.text },
  noticeMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noticeMetaText: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 15, color: colors.textMuted },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSubtle },
  activityCard: { overflow: 'hidden' },
  activityEmpty: { padding: 20, textAlign: 'center' },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  activityDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  activityIcon: { width: 40, height: 40, borderRadius: 9999, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  activityTexts: { flex: 1 },
  activityTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.text },
  activitySubtitle: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.textMuted },
});
