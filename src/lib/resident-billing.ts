import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Factura de la cuota de mantenimiento del mes en curso para un residente
 * recién dado de alta. La cuota se cobra desde el mes de registro: si ya pasó
 * el día límite de pago, la factura nace vencida (morosidad) igual que la de
 * cualquier otro residente. Mismo formato que el cron generate-monthly-invoices
 * y misma idempotencia (una cuota de mantenimiento por residente por mes).
 *
 * Solo debe llamarse desde código de servidor ya autorizado.
 */

type AdminClient = ReturnType<typeof createAdminClient>

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

type UnitBilling = {
    monto_mensual: number | null
    facturacion_activa: boolean | null
    billing_status: string | null
    payment_deadline: number | null
}

export async function createCurrentMonthMaintenanceInvoice(
    admin: AdminClient,
    residentId: string
): Promise<{ created: boolean, reason?: string }> {
    const { data: resident } = await admin
        .from('residents')
        .select('id, condominium_id, unit_id, status, units(monto_mensual, facturacion_activa, billing_status, payment_deadline)')
        .eq('id', residentId)
        .maybeSingle()

    if (!resident) return { created: false, reason: 'Residente no encontrado' }
    if (resident.status === 'inactive') return { created: false, reason: 'Residente inactivo' }
    const unit = (Array.isArray(resident.units) ? resident.units[0] : resident.units) as UnitBilling | null
    if (!resident.unit_id || !unit) return { created: false, reason: 'Sin unidad asignada' }
    if (unit.facturacion_activa === false || unit.billing_status === 'suspended') {
        return { created: false, reason: 'Facturación desactivada' }
    }
    const fee = Number(unit.monto_mensual || 0)
    if (fee <= 0) return { created: false, reason: 'Cuota mensual en 0' }

    // Mes en curso en hora de México (no UTC)
    const todayMx = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    const [year, monthNum] = todayMx.split('-').map(Number)
    const month = monthNum - 1

    const { data: settings } = await admin
        .from('settings_condominio')
        .select('tipo_cobro, generar_cobros_automaticos')
        .eq('condominio_id', resident.condominium_id)
        .maybeSingle()
    if (settings?.generar_cobros_automaticos === false) return { created: false, reason: 'Cobros automáticos apagados' }
    const tipoCobro = settings?.tipo_cobro || 'mensual'
    if (tipoCobro === 'bimestral' && month % 2 !== 0) return { created: false, reason: 'Mes sin cobro (bimestral)' }
    if (tipoCobro === 'anual' && month !== 0) return { created: false, reason: 'Mes sin cobro (anual)' }

    const mm = String(monthNum).padStart(2, '0')
    const lastDay = new Date(year, month + 1, 0).getDate()
    const firstDayStr = `${year}-${mm}-01`
    const lastDayStr = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
    const deadline = Math.min(Number(unit.payment_deadline) || 10, lastDay)
    const dueDateStr = `${year}-${mm}-${String(deadline).padStart(2, '0')}`

    const { data: existing } = await admin
        .from('resident_invoices')
        .select('id')
        .eq('resident_id', residentId)
        .eq('invoice_type', 'maintenance')
        .neq('status', 'cancelled')
        .gte('due_date', firstDayStr)
        .lte('due_date', lastDayStr)
        .limit(1)
    if (existing && existing.length > 0) return { created: false, reason: 'Ya facturado este mes' }

    const { error } = await admin.from('resident_invoices').insert({
        condominium_id: resident.condominium_id,
        resident_id: resident.id,
        unit_id: resident.unit_id,
        invoice_type: 'maintenance',
        invoice_scope: 'resident',
        status: 'pending',
        amount: fee,
        balance_due: fee,
        currency: 'MXN',
        due_date: dueDateStr,
        period_start: firstDayStr,
        period_end: lastDayStr,
        description: `Cuota de Mantenimiento ${MONTH_NAMES[month]} ${year}`,
        folio: `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        reminder_sent: false,
        recargo_aplicado: false,
    })
    if (error) {
        console.error('[resident-billing] Error creando cuota del mes:', error)
        return { created: false, reason: error.message }
    }
    return { created: true }
}
