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
    const [condos, setCondos] = useState<{ id: string, name: string }[]>([])
    const [selectedCondoId, setSelectedCondoId] = useState<string>('all')

    useEffect(() => {
        initialize()
    }, [])
    
    // Real-time subscription
    useEffect(() => {
        if (!orgId) return

        const channel = supabase
            .channel('realtime_tickets')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tickets',
                    filter: `organization_id=eq.${orgId}`
                },
                (payload) => {
                    console.log('Real-time update received:', payload)
                    // Simply refetch for consistency, or we could surgically update state
                    fetchTickets(orgId)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [orgId])

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
            
            const { data: condosData } = await supabase
                .from('condominiums')
                .select('id, name')
                .eq('organization_id', orgUser.organization_id)
            
            if (condosData) {
                setCondos(condosData)
            }
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

    const filteredTickets = selectedCondoId === 'all'
        ? tickets
        : tickets.filter(t => t.condominium_id === selectedCondoId)

    return (
        <div className="min-h-screen space-y-6 p-6 pb-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Gestión de Mantenimiento</h1>
                    <p className="text-zinc-400">Administra los reportes y solicitudes de los residentes.</p>
                </div>
                
                {condos.length > 0 && (
                    <div className="flex items-center gap-3 bg-zinc-900/40 px-4 py-2 rounded-2xl border border-zinc-800/50 shadow-sm">
                        <Filter className="h-4 w-4 text-indigo-400" />
                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Propiedad:</span>
                        <select
                            value={selectedCondoId}
                            onChange={(e) => setSelectedCondoId(e.target.value)}
                            className="bg-zinc-950/50 border border-zinc-800 text-zinc-200 rounded-xl px-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer font-black uppercase tracking-wider"
                        >
                            <option value="all">TODAS LAS PROPIEDADES</option>
                            {condos.map((condo) => (
                                <option key={condo.id} value={condo.id}>
                                    {condo.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="w-full">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-indigo-500"></div>
                    </div>
                ) : (
                    <MaintenanceBoard
                        tickets={filteredTickets}
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
