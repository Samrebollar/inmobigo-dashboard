import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/cron/generate-monthly-invoices
 * POST /api/cron/generate-monthly-invoices
 *
 * Genera facturas de cuota de mantenimiento para residentes activos.
 * Se ejecuta el día 1 de cada mes vía Vercel Cron (todos los condominios).
 *
 * También puede llamarse manualmente desde la UI del admin — en ese caso
 * SIEMPRE debe traer un condominiumId y quien llama debe ser un admin
 * autenticado de la organización dueña de ese condominio.
 *
 * Parámetros opcionales (query o body JSON):
 *   - month: 0-11 (por defecto el mes actual)
 *   - year:  YYYY (por defecto el año actual)
 *   - condominiumId: UUID (obligatorio salvo para la llamada de Vercel Cron)
 *
 * Seguridad: la corrida global (sin condominiumId) SOLO se permite con
 * Bearer CRON_SECRET en el header Authorization. Una corrida manual para
 * un condominio puntual requiere sesión activa + que el usuario administre
 * la organización dueña de ese condominio.
 */
export async function GET(request: Request) {
    return handleRequest(request)
}

export async function POST(request: Request) {
    return handleRequest(request)
}

async function handleRequest(request: Request) {
    const admin = createAdminClient()

    // ── Parámetros (los necesitamos antes de autenticar, para saber a qué condominio se pide acceso) ──
    const now = new Date()
    const url = new URL(request.url)
    let month = parseInt(url.searchParams.get('month') ?? String(now.getMonth()))
    let year  = parseInt(url.searchParams.get('year')  ?? String(now.getFullYear()))
    let filterCondoId = url.searchParams.get('condominiumId') || null

    if (request.method === 'POST') {
        try {
            const body = await request.json()
            if (body.month !== undefined) month = parseInt(body.month)
            if (body.year  !== undefined) year  = parseInt(body.year)
            if (body.condominiumId)       filterCondoId = body.condominiumId
        } catch (_) {
            // body vacío o no es JSON — usar valores de query
        }
    }

    // ── Autenticación ───────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCronCall = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`

    if (!isCronCall) {
        // No es la llamada automática de Vercel Cron. Solo se permite una corrida
        // manual acotada a UN condominio, y solo si el usuario logueado lo administra.
        if (!filterCondoId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: condo } = await admin
            .from('condominiums')
            .select('organization_id')
            .eq('id', filterCondoId)
            .maybeSingle()

        if (!condo) {
            return NextResponse.json({ error: 'Condominio no encontrado' }, { status: 404 })
        }

        const { data: orgUser } = await admin
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', user.id)
            .eq('organization_id', condo.organization_id)
            .maybeSingle()

        if (!orgUser) {
            return NextResponse.json({ error: 'No administras este condominio' }, { status: 403 })
        }
    }

    try {
        const supabase = admin

        // Rango del mes a facturar
        // Build ISO date strings directly to avoid UTC timezone-offset bugs
        // (new Date(y,m,d).toISOString() subtracts the local UTC offset, shifting day-1 to prev month)
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
        const mm = String(month + 1).padStart(2, '0')

        const firstDayStr = `${year}-${mm}-01`          // 01/MM/YYYY — fecha de emisión
        const lastDayStr  = `${year}-${mm}-${String(lastDayOfMonth).padStart(2, '0')}`
        // due_date = 1er día del mes de facturación (identifica el período de cobro)
        const dueDateStr  = firstDayStr


        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ]
        const monthLabel = `${monthNames[month]} ${year}`

        console.log(`[GenerateInvoices] Generando facturas para ${monthLabel} (${firstDayStr} → ${lastDayStr})`)

        // ── 1. Obtener residentes activos con su unidad ─────────────────────────
        let residentsQuery = supabase
            .from('residents')
            .select(`
                id,
                condominium_id,
                unit_id,
                units (
                    id,
                    unit_number,
                    monto_mensual,
                    facturacion_activa,
                    billing_status
                )
            `)
            .eq('status', 'active')

        if (filterCondoId) {
            residentsQuery = residentsQuery.eq('condominium_id', filterCondoId)
        }

        const { data: residents, error: residentsError } = await residentsQuery

        if (residentsError) {
            console.error('[GenerateInvoices] Error fetching residents:', residentsError)
            return NextResponse.json(
                { error: 'Error al obtener residentes', details: residentsError.message },
                { status: 500 }
            )
        }

        if (!residents || residents.length === 0) {
            return NextResponse.json({
                message: 'No hay residentes activos para facturar',
                generated: 0,
                skipped: 0,
                errors: 0,
                period: monthLabel,
            })
        }

        // ── Configuración de facturación por propiedad (tipo_cobro, generar_cobros_automaticos) ──
        // Sin fila en settings_condominio → comportamiento por defecto: mensual, automático activado.
        const condoIds = Array.from(new Set(residents.map(r => r.condominium_id).filter(Boolean)))
        const { data: condoSettingsRows } = await supabase
            .from('settings_condominio')
            .select('condominio_id, tipo_cobro, generar_cobros_automaticos')
            .in('condominio_id', condoIds)

        const condoSettingsMap = new Map(
            (condoSettingsRows || []).map((s: any) => [s.condominio_id, s])
        )

        // "Mismo monto, solo cambia la frecuencia": bimestral factura en meses pares
        // (Ene, Mar, May, Jul, Sep, Nov), anual factura únicamente en Enero.
        const isBillingMonthForCondo = (condominiumId: string): boolean => {
            const settings = condoSettingsMap.get(condominiumId)
            const tipoCobro = settings?.tipo_cobro || 'mensual'
            if (tipoCobro === 'bimestral') return month % 2 === 0
            if (tipoCobro === 'anual') return month === 0
            return true
        }

        const isAutoGenerationEnabledForCondo = (condominiumId: string): boolean => {
            const settings = condoSettingsMap.get(condominiumId)
            return settings?.generar_cobros_automaticos ?? true
        }

        // ── 2. Obtener facturas de mantenimiento ya existentes en el periodo ────
        // Para evitar duplicados (idempotencia)
        let existingQuery = supabase
            .from('resident_invoices')
            .select('resident_id')
            .eq('invoice_type', 'maintenance')
            .gte('due_date', firstDayStr)
            .lte('due_date', lastDayStr)

        if (filterCondoId) {
            existingQuery = existingQuery.eq('condominium_id', filterCondoId)
        }

        const { data: existingInvoices } = await existingQuery
        const alreadyBilledResidentIds = new Set(
            (existingInvoices || []).map((inv: any) => inv.resident_id)
        )

        console.log(`[GenerateInvoices] Residentes activos: ${residents.length}, ya facturados este mes: ${alreadyBilledResidentIds.size}`)

        // ── 3. Generar facturas faltantes ───────────────────────────────────────
        const results = { generated: 0, skipped: 0, errors: 0, details: [] as string[] }

        for (const resident of residents) {
            const unit = resident.units as any

            // Validaciones
            if (!unit) {
                results.skipped++
                results.details.push(`Residente ${resident.id}: sin unidad asignada`)
                continue
            }
            if (unit.facturacion_activa === false) {
                results.skipped++
                continue
            }
            if (unit.billing_status === 'suspended') {
                results.skipped++
                continue
            }

            // Las políticas de tipo_cobro/generar_cobros_automaticos (Propiedades >
            // Configuración) solo aplican a la corrida automática de Vercel Cron.
            // Una corrida manual disparada por un admin para un condominio puntual
            // es una orden explícita y siempre debe generar la factura, sin importar
            // la frecuencia configurada — es precisamente el "modo manual" que se
            // ofrece cuando "Generar cobros automáticos" está apagado.
            if (isCronCall) {
                if (!isAutoGenerationEnabledForCondo(resident.condominium_id)) {
                    results.skipped++
                    continue
                }
                if (!isBillingMonthForCondo(resident.condominium_id)) {
                    results.skipped++
                    continue
                }
            }

            const fee = Number(unit.monto_mensual || 0)
            if (fee <= 0) {
                results.skipped++
                results.details.push(`Residente ${resident.id}: cuota mensual es 0`)
                continue
            }

            // Ya tiene factura este mes → saltar (idempotencia)
            if (alreadyBilledResidentIds.has(resident.id)) {
                results.skipped++
                continue
            }

            // Generar folio único
            const folioSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
            const folio = `INV-${folioSuffix}`

            // Crear factura
            const { error: insertError } = await supabase
                .from('resident_invoices')
                .insert({
                    condominium_id:  resident.condominium_id,
                    resident_id:     resident.id,
                    unit_id:         resident.unit_id,
                    invoice_type:    'maintenance',
                    invoice_scope:   'resident',
                    status:          'pending',
                    amount:          fee,
                    balance_due:     fee,
                    currency:        'MXN',
                    due_date:        dueDateStr,
                    period_start:    firstDayStr,
                    period_end:      lastDayStr,
                    description:     `Cuota de Mantenimiento ${monthLabel}`,
                    folio:           folio,
                    reminder_sent:   false,
                    recargo_aplicado: false,
                })

            if (insertError) {
                console.error(`[GenerateInvoices] Error creando factura para residente ${resident.id}:`, insertError)
                results.errors++
                results.details.push(`Error residente ${resident.id}: ${insertError.message}`)
            } else {
                results.generated++
                console.log(`[GenerateInvoices] ✓ Factura creada: residente ${resident.id}, unidad ${unit.unit_number}, $${fee}`)
            }
        }

        console.log(`[GenerateInvoices] Completado: ${results.generated} generadas, ${results.skipped} omitidas, ${results.errors} errores`)

        return NextResponse.json({
            message: `Facturas generadas para ${monthLabel}`,
            period: monthLabel,
            due_date: dueDateStr,
            ...results,
            timestamp: new Date().toISOString(),
        })

    } catch (err: any) {
        console.error('[GenerateInvoices] Error inesperado:', err)
        return NextResponse.json(
            { error: 'Error del sistema', details: err.message },
            { status: 500 }
        )
    }
}
