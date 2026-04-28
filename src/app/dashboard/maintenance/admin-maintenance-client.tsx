'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus, Filter } from 'lucide-react'
import { Ticket } from '@/types/tickets'
import { maintenanceService } from '@/services/maintenance-service'
import { MaintenanceBoard } from '@/components/maintenance/MaintenanceBoard'
import { CreateTicketModal } from '@/components/maintenance/CreateTicketModal'

export default function AdminMaintenanceClient() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [orgId, setOrgId] = useState<string | null>(null)

    useEffect(() => {
        initialize()
    }, [])

    const initialize = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: orgUser } = await supabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', user.id)
            .single()

        if (orgUser) {
            setOrgId(orgUser.organization_id)
            fetchTickets(orgUser.organization_id)
        } else {
            setLoading(false)
        }
    }

    const fetchTickets = async (organizationId: string) => {
        try {
            setLoading(true)
            const data = await maintenanceService.getByOrganization(organizationId)
            setTickets(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen space-y-6 p-6 pb-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Gestión de Mantenimiento</h1>
                    <p className="text-zinc-400">Administra los reportes y solicitudes de los residentes.</p>
                </div>
            </div>

            <div className="w-full">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-indigo-500"></div>
                    </div>
                ) : (
                    <MaintenanceBoard
                        tickets={tickets}
                        onUpdateTicket={(t) => {
                            console.log('Update ticket', t)
                            // Implement update logic (e.g., drag and drop or click)
                        }}
                    />
                )}
            </div>

            <CreateTicketModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => orgId && fetchTickets(orgId)}
            />
        </div>
    )
}
