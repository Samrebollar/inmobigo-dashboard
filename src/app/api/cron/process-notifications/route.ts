import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cronService } from '@/services/cron-service'

/**
 * GET /api/cron/process-notifications
 *
 * Procesa automáticamente:
 *   1. Facturas vencidas → marca como 'overdue' en resident_invoices
 *   2. Aplica recargos según configuración del condominio
 *   3. Dispara webhooks a n8n (recordatorio / morosidad)
 *   4. Sincroniza estado hacia tabla `invoices` legacy (para n8n)
 *
 * MIGRADO: Lee de `resident_invoices` (fuente de verdad).
 * La tabla `invoices` se actualiza vía legacy-sync-service.
 */
export async function GET(request: Request) {
    // Verificar API key de cron (seguridad básica)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const supabase = createAdminClient()
        const now = new Date()
        const todayStr = now.toISOString().split('T')[0]

        // ── 1. Obtener facturas pendientes/vencidas de resident_invoices ─────────
        const { data: facturas, error: fetchError } = await supabase
            .from('resident_invoices')
            .select(`
                id,
                organization_id,
                condominium_id,
                resident_id,
                amount,
                balance_due,
                status,
                due_date,
                description,
                invoice_type,
                created_at,
                updated_at,
                residents (
                    first_name,
                    last_name,
                    phone,
                    email,
                    unit_number
                ),
                condominiums (
                    name
                )
            `)
            .in('status', ['pending', 'overdue'])
            .lte('due_date', todayStr)
            .order('due_date', { ascending: true })

        if (fetchError) {
            console.error('[Cron] Error fetching resident_invoices:', fetchError)
            return NextResponse.json(
                { error: 'Error al obtener facturas', details: fetchError.message },
                { status: 500 }
            )
        }

        if (!facturas || facturas.length === 0) {
            return NextResponse.json({
                message: 'Cron ejecutado — sin facturas pendientes',
                processed: 0,
                timestamp: now.toISOString(),
            })
        }

        const results = {
            updated_to_overdue: 0,
            recargos_applied: 0,
            webhooks_sent: 0,
            errors: 0,
        }

        // ── 2. Procesar cada factura ──────────────────────────────────────────────
        for (const factura of facturas) {
            try {
                const diasAtraso = cronService.calcularDiasDiferencia(factura.due_date)
                const resident = factura.residents as any
                const condo = factura.condominiums as any

                // 2a. Marcar como 'overdue' si aún está 'pending' y ya venció
                if (factura.status === 'pending' && diasAtraso > 0) {
                    const { error: updateErr } = await supabase
                        .from('resident_invoices')
                        .update({
                            status: 'overdue',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', factura.id)

                    if (!updateErr) {
                        results.updated_to_overdue++

                        // Sync al legacy para n8n
                        await supabase
                            .from('invoices')
                            .update({ status: 'overdue', updated_at: new Date().toISOString() })
                            .eq('external_payment_id', factura.id)
                    }
                }

                // 2b. Obtener configuración del condominio para recargos
                if (factura.condominium_id) {
                    const config = await cronService.obtenerConfiguracion(factura.condominium_id)

                    if (config) {
                        const facturaParaRecargo = {
                            id: factura.id,
                            amount: Number(factura.amount),
                            balance_due: Number(factura.balance_due ?? factura.amount),
                            status: factura.status === 'pending' && diasAtraso > 0 ? 'overdue' : factura.status,
                            due_date: factura.due_date,
                            resident_id: factura.resident_id,
                            condominium_id: factura.condominium_id,
                            organization_id: factura.organization_id,
                            description: factura.description || 'Cuota de Mantenimiento',
                            created_at: factura.created_at,
                        }

                        await cronService.aplicarRecargo(facturaParaRecargo, config)
                        results.recargos_applied++
                    }
                }

                // 2c. Disparar webhook a n8n si hay días de atraso significativos
                const shouldNotify = diasAtraso >= 1
                if (shouldNotify && resident?.phone) {
                    const tipoNotif = diasAtraso >= 30 ? 'morosidad' : 'recordatorio'

                    await cronService.dispararWebhookN8N(
                        {
                            id: factura.id,
                            amount: Number(factura.amount),
                            balance_due: Number(factura.balance_due),
                            due_date: factura.due_date,
                            residents: {
                                first_name: resident?.first_name,
                                last_name: resident?.last_name,
                                phone: resident?.phone,
                            },
                            condominiums: { name: condo?.name },
                            unit_number: resident?.unit_number,
                        },
                        tipoNotif,
                        diasAtraso
                    )
                    results.webhooks_sent++
                }
            } catch (facturaErr: any) {
                console.error(`[Cron] Error procesando resident_invoice ${factura.id}:`, facturaErr.message)
                results.errors++
            }
        }

        return NextResponse.json({
            message: 'Cron ejecutado exitosamente',
            source: 'resident_invoices',
            legacy_sync: 'invoices',
            total_found: facturas.length,
            results,
            timestamp: now.toISOString(),
        })
    } catch (err: any) {
        console.error('[CRON ERROR]:', err)
        return NextResponse.json(
            { error: 'System Error', details: err.message },
            { status: 500 }
        )
    }
}