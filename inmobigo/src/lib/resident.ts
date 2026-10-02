import { supabase } from '@/lib/supabase';

/**
 * Datos del residente en sesión. Todo se lee con la sesión del propio
 * residente (llave anon + RLS): solo ve su registro, su unidad, su
 * condominio, sus recibos y sus reservas.
 */
export type ResidentContext = {
  residentId: string;
  userId: string;
  firstName: string;
  lastName: string;
  condominiumId: string | null;
  organizationId: string | null;
  condominiumName: string | null;
  unitNumber: string | null;
  paymentDeadline: number;
};

export type InvoiceRow = {
  id: string;
  amount: number | null;
  balance_due: number | null;
  status: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string | null;
  description: string | null;
  invoice_type: string | null;
  folio: string | null;
};

export type BalanceStatus = 'al_corriente' | 'pendiente' | 'con_adeudo';

export type BalanceSummary = {
  balance: number;
  status: BalanceStatus;
  /** Fecha (YYYY-MM-DD) del próximo pago: el recibo sin pagar más antiguo o el siguiente día límite. */
  nextPaymentDate: string;
  /** Recibo a mostrar con "Ver recibo" (el sin pagar más antiguo o el último pagado). */
  featuredInvoiceId: string | null;
};

export type Notice = {
  id: string;
  title: string;
  type: string | null;
  priority: string | null;
  location: string | null;
  created_at: string;
};

export type ActivityItem = {
  id: string;
  kind: 'payment' | 'reservation';
  title: string;
  subtitle: string;
  date: string;
};

/** Fecha de hoy en la zona horaria de México (YYYY-MM-DD), igual que el panel web. */
export function todayMx(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
}

const UNPAID = ['pending', 'overdue', 'partial'];

/** Devuelve null si la cuenta no está ligada a un residente (p. ej. un administrador). */
export async function fetchResidentContext(userId: string): Promise<ResidentContext | null> {
  const { data, error } = await supabase
    .from('residents')
    .select('id, first_name, last_name, condominium_id, condominiums(name, organization_id), units(unit_number, payment_deadline)')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const condo = data.condominiums as unknown as { name: string | null; organization_id: string | null } | null;
  const unit = data.units as unknown as { unit_number: string | null; payment_deadline: number | null } | null;
  return {
    residentId: data.id,
    userId,
    firstName: (data.first_name || '').trim(),
    lastName: (data.last_name || '').trim(),
    condominiumId: data.condominium_id,
    organizationId: condo?.organization_id ?? null,
    condominiumName: condo?.name ?? null,
    unitNumber: unit?.unit_number ?? null,
    paymentDeadline: Number(unit?.payment_deadline) || 10,
  };
}

export async function fetchInvoices(residentId: string): Promise<InvoiceRow[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, amount, balance_due, status, due_date, paid_at, created_at, description, invoice_type, folio')
    .eq('resident_id', residentId)
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true });
  if (error) throw error;
  return (data || []) as InvoiceRow[];
}

/** Siguiente fecha con el día límite de pago, a partir de mañana. */
function nextDeadline(day: number, today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const clamp = (yy: number, mm: number) => Math.min(day, new Date(Date.UTC(yy, mm, 0)).getUTCDate());
  if (d < day) return `${y}-${pad(m)}-${pad(clamp(y, m))}`;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${pad(nm)}-${pad(clamp(ny, nm))}`;
}

/**
 * Saldo = lo pendiente de los recibos sin pagar. "Con adeudo" si alguno ya
 * venció (misma regla que bloquea reservar amenidades), "Pendiente" si hay
 * saldo dentro del plazo, "Al corriente" si no debe nada.
 */
export function summarizeBalance(invoices: InvoiceRow[], paymentDeadline: number): BalanceSummary {
  const today = todayMx();
  const unpaid = invoices
    .filter(inv => UNPAID.includes(String(inv.status)) && Number(inv.balance_due ?? inv.amount ?? 0) > 0)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  const balance = unpaid.reduce((sum, inv) => sum + Number(inv.balance_due ?? inv.amount ?? 0), 0);
  const overdue = unpaid.some(inv => inv.status === 'overdue' || (inv.due_date && inv.due_date.slice(0, 10) < today));
  const status: BalanceStatus = overdue ? 'con_adeudo' : balance > 0 ? 'pendiente' : 'al_corriente';
  const lastPaid = [...invoices].filter(inv => inv.status === 'paid').sort((a, b) => String(b.paid_at || b.due_date).localeCompare(String(a.paid_at || a.due_date)))[0];
  return {
    balance: Math.round(balance * 100) / 100,
    status,
    nextPaymentDate: unpaid[0]?.due_date?.slice(0, 10) || nextDeadline(paymentDeadline, today),
    featuredInvoiceId: unpaid[0]?.id || lastPaid?.id || null,
  };
}

/** Avisos de la organización. Hoy la RLS de `announcements` solo deja leer a administradores, así que puede venir vacío. */
export async function fetchNotices(organizationId: string | null, condominiumName: string | null, limit = 3): Promise<Notice[]> {
  if (!organizationId) return [];
  let query = supabase
    .from('announcements')
    .select('id, title, type, priority, location, created_at')
    .eq('organization_id', organizationId)
    .eq('is_active', true);
  if (condominiumName) query = query.or(`visibility.eq.Todos,visibility.eq."${condominiumName}"`);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
  if (error) return [];
  return (data || []) as Notice[];
}

export async function fetchRecentActivity(ctx: ResidentContext, invoices: InvoiceRow[], limit = 3): Promise<ActivityItem[]> {
  const payments: ActivityItem[] = invoices
    .filter(inv => inv.status === 'paid')
    .map(inv => ({
      id: `pay-${inv.id}`,
      kind: 'payment' as const,
      title: 'Pago realizado',
      subtitle: inv.description || 'Cuota de mantenimiento',
      date: inv.paid_at || inv.due_date || inv.created_at || '',
    }));

  const { data: reservations } = await supabase
    .from('amenity_reservations')
    .select('id, reservation_date, status, created_at, amenities(name)')
    .eq('resident_id', ctx.userId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(limit);

  const resItems: ActivityItem[] = (reservations || []).map(r => {
    const amenity = r.amenities as unknown as { name: string | null } | null;
    return {
      id: `res-${r.id}`,
      kind: 'reservation' as const,
      title: 'Reserva creada',
      subtitle: `${amenity?.name || 'Amenidad'} • ${formatShortDate(r.reservation_date)}`,
      date: r.created_at || r.reservation_date || '',
    };
  });

  return [...payments, ...resItems]
    .filter(item => item.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** "05 de Octubre" */
export function formatLongDate(ymd: string): string {
  const [, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return `${String(d).padStart(2, '0')} de ${MONTHS[m - 1]}`;
}

/** "27 Sep" */
export function formatShortDate(value: string | null): string {
  if (!value) return '';
  const [, m, d] = value.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/** "Hoy, 09:30 AM" · "Ayer" · "Hace 2d" · "23 Sep" */
export function formatRelative(iso: string, withTime = false): string {
  const date = new Date(iso);
  const dayMx = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
  const today = todayMx();
  const diffDays = Math.round((Date.parse(today) - Date.parse(dayMx(date))) / 86_400_000);
  if (diffDays <= 0) {
    if (!withTime) return 'Hoy';
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' });
    return `Hoy, ${time}`;
  }
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return formatShortDate(dayMx(date));
}

export function formatMoney(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
