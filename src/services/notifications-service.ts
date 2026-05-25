import { createClient } from '@/utils/supabase/client'
import { CommunicationLog } from '@/types/residents'
import { ResidentInvoice } from '@/types/finance'
import { Resident } from '@/types/residents'
import { differenceInDays, parseISO } from 'date-fns'
import { buildPaymentLink, buildN8NPayload } from './legacy-sync-service'

interface SmartReminderResult {
    success: boolean
    message: string
    webhook_sent?: boolean
    log?: CommunicationLog
}

export const notificationsService = {
    async sendSmartReminder(resident: Resident, invoices: ResidentInvoice[]): Promise<SmartReminderResult> {
        const supabase = createClient()

        // 1. Identificar facturas vencidas
        const overdueInvoices = invoices.filter(inv => {
            if (inv.status === 'paid') return false
            if (inv.status === 'overdue') return true
            if (inv.status === 'pending' && new Date() > parseISO(inv.due_date)) return true
            return false
        })

        if (overdueInvoices.length === 0) {
            return { success: false, message: 'No hay facturas vencidas para enviar recordatorio.' }
        }

        // 2. Encontrar factura más antigua para determinar severidad
        const oldestInvoice = overdueInvoices.reduce((prev, curr) =>
            new Date(prev.due_date) < new Date(curr.due_date) ? prev : curr
        )

        const daysOverdue = differenceInDays(new Date(), parseISO(oldestInvoice.due_date))

        // 3. Determinar tipo de mensaje
        let messageType: 'suave' | 'firme' | 'formal' | 'escalar' = 'suave'
        if (daysOverdue >= 30) messageType = 'escalar'
        else if (daysOverdue >= 15) messageType = 'formal'
        else if (daysOverdue >= 3) messageType = 'firme'

        if (daysOverdue < 1) {
            return { success: false, message: 'La factura aún no tiene suficientes días de atraso.' }
        }

        // 4. Idempotencia: evitar duplicados del mismo tipo hoy
        const startOfDay = new Date().toISOString().split('T')[0]
        const { data: existingLogs } = await supabase
            .from('communication_logs')
            .select('*')
            .eq('resident_id', resident.id)
            .eq('method', 'n8n')
            .eq('message_type', messageType)
            .gte('created_at', startOfDay)

        if (existingLogs && existingLogs.length > 0) {
            return {
                success: false,
                message: `Msj "${messageType}" ya enviado hoy.`,
            }
        }

        // 5. Construir payload para n8n — compatible con estructura legacy
        // payment_link generado dinámicamente (no existe columna en BD)
        const payload = buildN8NPayload({
            tipo: 'recordatorio',
            residentName: `${resident.first_name} ${resident.last_name}`,
            phone: resident.phone || '',
            amount: oldestInvoice.amount,
            dueDate: oldestInvoice.due_date,
            residentInvoiceId: oldestInvoice.id,
            daysOverdue,
        })

        // Agregar campos extra para n8n de recordatorio
        const fullPayload = {
            ...payload,
            resident_id: resident.id,
            resident_email: resident.email,
            invoice_id: oldestInvoice.id,
            invoice_folio: oldestInvoice.folio || payload.folio,
            message_type: messageType,
        }

        let webhookSent = false
        try {
            // 6. Enviar a n8n
            const n8nUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL

            if (n8nUrl) {
                try {
                    const response = await fetch(n8nUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(fullPayload),
                    })
                    webhookSent = response.ok
                } catch (fetchError) {
                    console.error('Error contacting n8n:', fetchError)
                }
            } else {
                console.warn('NEXT_PUBLIC_N8N_WEBHOOK_URL is not set. Skipping webhook send.')
            }

            // 7. Registrar en communication_logs
            const logEntry = {
                organization_id: resident.organization_id || oldestInvoice.organization_id,
                resident_id: resident.id,
                invoice_id: oldestInvoice.id,
                folio: oldestInvoice.folio || payload.folio,
                type: 'reminder',
                method: 'n8n',
                message_type: messageType,
                days_overdue: daysOverdue,
                metadata: fullPayload,
            }

            const { data: logData, error: logError } = await supabase
                .from('communication_logs')
                .insert(logEntry)
                .select()
                .single()

            if (logError) throw logError

            return {
                success: true,
                webhook_sent: webhookSent,
                message: `Recordatorio "${messageType}" enviado.`,
                log: logData,
            }
        } catch (error: any) {
            console.error('Error sending smart reminder:', error)
            return { success: false, message: `Error: ${error.message}` }
        }
    },

    async getHistory(residentId: string): Promise<CommunicationLog[]> {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('communication_logs')
            .select('*')
            .eq('resident_id', residentId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching logs:', error)
            return []
        }
        return data || []
    },
}
