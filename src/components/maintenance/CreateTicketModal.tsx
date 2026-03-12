'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/utils/supabase/client'
import { maintenanceService } from '@/services/maintenance-service'
import { TicketPriority, TicketStatus } from '@/types/tickets'

interface CreateTicketModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    residentId?: string
    defaultCondominiumId?: string
    defaultOrganizationId?: string
}

export function CreateTicketModal({ 
    isOpen, 
    onClose, 
    onSuccess, 
    residentId, 
    defaultCondominiumId,
    defaultOrganizationId 
}: CreateTicketModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [condominiums, setCondominiums] = useState<{ id: string, name: string }[]>([])
    const [orgId, setOrgId] = useState<string | null>(defaultOrganizationId || null)

    const [formData, setFormData] = useState({
        condominium_id: defaultCondominiumId || '',
        title: '',
        description: '',
        priority: 'medium' as TicketPriority,
        unit_number: '' // Optional, for context
    })

    useEffect(() => {
        if (isOpen) {
            fetchCondominiums()
        }
    }, [isOpen])

    const fetchCondominiums = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: orgUser } = await supabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', user.id)
            .single()

        if (orgUser) {
            setOrgId(orgUser.organization_id)
            const { data: condos } = await supabase
                .from('condominiums')
                .select('id, name')
                .eq('organization_id', orgUser.organization_id)
                .eq('status', 'active')

            setCondominiums(condos || [])
            if (condos && condos.length > 0) {
                setFormData(prev => ({ ...prev, condominium_id: condos[0].id }))
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!orgId) return

        try {
            setLoading(true)
            await maintenanceService.create({
                ...formData,
                organization_id: orgId,
                resident_id: residentId,
                status: 'open'
            })
            onSuccess()
            onClose()
            setFormData({
                condominium_id: condominiums[0]?.id || defaultCondominiumId || '',
                title: '',
                description: '',
                priority: 'medium',
                unit_number: ''
            })
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reportar Mantenimiento">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1 block">Condominio</label>
                    <select
                        className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white focus:border-indigo-500"
                        value={formData.condominium_id}
                        onChange={e => setFormData({ ...formData, condominium_id: e.target.value })}
                    >
                        {condominiums.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <Input
                    label="Título del problema"
                    placeholder="Ej. Fuga de agua en recepción"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                />

                <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1 block">Descripción</label>
                    <textarea
                        className="w-full min-h-[100px] rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-white focus:border-indigo-500 focus:outline-none placeholder:text-zinc-600"
                        placeholder="Detalla el problema..."
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-zinc-400 mb-1 block">Prioridad</label>
                        <select
                            className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white focus:border-indigo-500"
                            value={formData.priority}
                            onChange={e => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
                        >
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="critical">Crítica</option>
                        </select>
                    </div>
                    <Input
                        label="Unidad (Opcional)"
                        placeholder="A-101"
                        value={formData.unit_number}
                        onChange={e => setFormData({ ...formData, unit_number: e.target.value })}
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="mr-2">Cancelar</Button>
                    <Button type="submit" isLoading={loading}>Crear Reporte</Button>
                </div>
            </form>
        </Modal>
    )
}
