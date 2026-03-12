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
        <div className="h-[calc(100vh-6rem)] flex flex-col space-y-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Gestión de Mantenimiento</h1>
                    <p className="text-zinc-400">Administra los reportes y solicitudes de los residentes.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 rounded-2xl h-12 font-bold shadow-lg shadow-indigo-600/20 transition-all border-none">
                        <Plus className="mr-2 h-5 w-5" /> Nuevo Ticket
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
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
