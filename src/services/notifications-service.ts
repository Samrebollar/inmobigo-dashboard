import { createClient } from '@/utils/supabase/client'
import { CommunicationLog } from '@/types/residents'
import { Invoice } from '@/types/finance'
import { Resident } from '@/types/residents'
import { differenceInDays, parseISO } from 'date-fns'

interface SmartReminderResult {
    success: boolean
    message: string
    log?: CommunicationLog
}

export const notificationsService = {
    async sendSmartReminder(resident: Resident, invoices: Invoice[]): Promise<SmartReminderResult> {
        const supabase = createClient()

        // 1. Identify Overdue Invoices
        const overdueInvoices = invoices.filter(inv => {
            if (inv.status === 'paid') return false
            if (inv.status === 'overdue') return true
            if (inv.status === 'pending' && new Date() > parseISO(inv.due_date)) return true
            return false
        })

        if (overdueInvoices.length === 0) {
            return { success: false, message: 'No hay facturas vencidas para enviar recordatorio.' }
        }

        // 2. Find Oldest Invoice to determine severity
        const oldestInvoice = overdueInvoices.reduce((prev, curr) =>
            new Date(prev.due_date) < new Date(curr.due_date) ? prev : curr
        )

        const daysOverdue = differenceInDays(new Date(), parseISO(oldestInvoice.due_date))

        // 3. Determine Message Type
        let messageType: 'suave' | 'firme' | 'formal' | 'escalar' = 'suave'
        if (daysOverdue >= 30) messageType = 'escalar'
        else if (daysOverdue >= 15) messageType = 'formal'
        else if (daysOverdue >= 3) messageType = 'firme'
        else if (daysOverdue >= 1) messageType = 'suave'

        if (daysOverdue < 1) {
            return { success: false, message: 'La factura aún no tiene suficientes días de atraso.' }
        }

        // 4. Check for Idempotency (Prevent duplicate of same type today)
        const startOfDay = new Date().toISOString().split('T')[0]
        // Note: This query requires the table to exist
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
                message: `Msj "${messageType}" ya enviado hoy.`
            }
        }

        // 5. Prepare Payload for n8n
        const payload = {
            resident_id: resident.id,
            resident_name: `${resident.first_name} ${resident.last_name}`,
            resident_phone: resident.phone,
            resident_email: resident.email,
            invoice_id: oldestInvoice.id,
            invoice_folio: oldestInvoice.folio,
            amount: oldestInvoice.amount,
            due_date: oldestInvoice.due_date,
            days_overdue: daysOverdue,
            message_type: messageType
        }

        try {
            // 6. Send to n8n
            console.log('Sending to n8n:', payload) // Debug log

            const n8nUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL

            if (n8nUrl) {
                try {
                    await fetch(n8nUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    })
                } catch (fetchError) {
                    console.error('Error contacting n8n:', fetchError)
                    // We continue to save the log even if n8n fails, marking it perhaps?
                    // For now, just log the error.
                }
            } else {
                console.warn('NEXT_PUBLIC_N8N_WEBHOOK_URL is not set. Skipping webhook send.')
            }

            // 6. Log to Database
            const logEntry = {
                organization_id: resident.organization_id || oldestInvoice.organization_id, // Fallback
                resident_id: resident.id,
                invoice_id: oldestInvoice.id,
                folio: oldestInvoice.folio,
                type: 'reminder',
                method: 'n8n',
                message_type: messageType,
                days_overdue: daysOverdue,
                metadata: payload
            }

            const { data: logData, error: logError } = await supabase
                .from('communication_logs')
                .insert(logEntry)
                .select()
                .single()

            if (logError) throw logError

            return {
                success: true,
                message: `Recordatorio "${messageType}" enviado.`,
                log: logData
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
            console.error('Error details:', JSON.stringify(error, null, 2))
            return []
        }
        return data || []
    }
}
