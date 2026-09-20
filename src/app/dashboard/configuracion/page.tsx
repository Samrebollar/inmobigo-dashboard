'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { User, Shield, CreditCard, Mail, Trash2, Plus, ArrowRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

import { InviteUserModal } from '@/components/settings/InviteUserModal'
import { Role } from '@/types/auth'
import { inviteTeamMemberAction, removeTeamMemberAction } from '@/app/actions/team-actions'
import { DeleteConfirmModal } from '@/components/dashboard/delete-confirm-modal'

interface TeamMember {
    id: string
    user_id: string
    role: Role
    status: 'active' | 'suspended' | 'pending'
    created_at: string
    // Joined user data
    email?: string
    first_name?: string
    last_name?: string
}

export default function SettingsPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [team, setTeam] = useState<TeamMember[]>([])
    const [orgName, setOrgName] = useState('')
    const [orgId, setOrgId] = useState<string | null>(null)
    const [savingOrg, setSavingOrg] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [subscription, setSubscription] = useState<any>(null)

    // Delete Team Member State
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        initialize()
    }, [])

    const initialize = async () => {
        try {
            const response = await fetch('/api/organizations/status')
            const data = await response.json()

            if (data.error) throw new Error(data.error)

            if (data.organizationId) {
                setOrgId(data.organizationId)
                setOrgName(data.organizationName || 'Mi Organización')

                fetchTeam(data.organizationId)
            }

            // Get Subscription — query by organization_id (same logic as layout.tsx)
            // First try active, then fall back to most recent of any status
            if (data.organizationId) {
                let { data: activeSub } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('organization_id', data.organizationId)
                    .eq('subscription_status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (!activeSub) {
                    const { data: fallbackSub } = await supabase
                        .from('subscriptions')
                        .select('*')
                        .eq('organization_id', data.organizationId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle()
                    activeSub = fallbackSub
                }

                setSubscription(activeSub)
            }
        } catch (error) {
            console.error('Error initializing settings:', error)
            // Fallback al método original si la API falla por alguna razón
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: ownerOrg } = await supabase
                .from('organizations')
                .select('id, name, business_type')
                .eq('owner_id', user.id)
                .maybeSingle()
            
            if (ownerOrg) {
                setOrgId(ownerOrg.id)
                setOrgName(ownerOrg.name || 'Mi Organización')
                fetchTeam(ownerOrg.id)
            }
        }
    }

    const handleSaveOrg = async () => {
        if (!orgId || !orgName.trim()) return
        
        setSavingOrg(true)
        try {
            const res = await fetch('/api/organizations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orgId, name: orgName })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || data.message || 'Error desconocido al actualizar')
            }
            
            // Optionally could add a toast notification here
            toast.success('Nombre de organización actualizado exitosamente')
        } catch (e: any) {
            console.error(e)
            toast.error('Error al guardar el nombre de la organización: ' + e.message)
        } finally {
            setSavingOrg(false)
        }
    }

    const fetchTeam = async (orgId: string) => {
        try {
            const response = await fetch('/api/organizations/team')
            const data = await response.json()

            if (data.error) throw new Error(data.error)

            setTeam(data as TeamMember[])
        } catch (error: any) {
            console.error('Error fetching team:', error)
            toast.error('Error al cargar el equipo: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveMember = (member: TeamMember) => {
        setMemberToDelete(member)
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        if (!memberToDelete) return

        setIsDeleting(true)
        try {
            const result = await removeTeamMemberAction(memberToDelete.id, memberToDelete.user_id)
            
            if (!result.success) {
                throw new Error(result.error)
            }
            
            setTeam(team.filter(m => m.id !== memberToDelete.id))
            toast.success(`Miembro ${memberToDelete.first_name} eliminado correctamente`)
            setShowDeleteModal(false)
        } catch (error: any) {
            console.error('Error removing member:', error)
            toast.error('Error al eliminar: ' + error.message)
        } finally {
            setIsDeleting(false)
            setMemberToDelete(null)
        }
    }

    const handleInvite = async (fullName: string, email: string, role: Role) => {
        if (!orgId) {
            toast.error('No se pudo identificar la organización')
            return
        }

        const promise = inviteTeamMemberAction(fullName, email, role, orgId)

        toast.promise(promise, {
            loading: 'Enviando invitación...',
            success: (result) => {
                if (!result.success) throw new Error(result.error)
                fetchTeam(orgId) // Refresh the list
                return `Invitación enviada a ${email}`
            },
            error: (err) => `Error: ${err.message}`
        })
    }

    return (
        <div className="mx-auto max-w-4xl space-y-8 p-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Configuración</h1>
                <p className="text-zinc-400">Gestiona tu equipo y suscripción.</p>
            </div>

            {/* Organization Profile */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">Perfil de Organización</CardTitle>
                    <CardDescription className="text-zinc-400">Detalles generales de tu empresa.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-white">Nombre</label>
                        <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                    </div>
                    <Button 
                        onClick={handleSaveOrg} 
                        disabled={savingOrg || !orgId}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                        {savingOrg ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </CardContent>
            </Card>

            {/* Team Management */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-white">Equipo</CardTitle>
                        <CardDescription className="text-zinc-400">Gestiona el acceso al panel.</CardDescription>
                    </div>
                    <Button 
                        onClick={() => setShowInviteModal(true)} 
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] px-6 h-11 shadow-lg shadow-indigo-500/10 border-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Invitar Miembro
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <AnimatePresence>
                            {team.map((member, index) => (
                                <motion.div 
                                    key={member.id}
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    className="relative flex items-center justify-between p-5 rounded-2xl border border-zinc-800/60 bg-zinc-950/30 transition-all duration-300 cursor-default group overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:via-transparent group-hover:to-transparent transition-all" />
                                    
                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className="relative">
                                            <div className="h-12 w-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-indigo-400 font-black text-sm border border-zinc-800 shadow-inner group-hover:border-indigo-500/30 transition-colors">
                                                {member.first_name?.[0] || 'U'}{member.last_name?.[0] || 'N'}
                                            </div>
                                            {member.status === 'active' && (
                                                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-zinc-950 border-2 border-zinc-900 flex items-center justify-center">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-black text-white italic group-hover:text-indigo-400 transition-colors">
                                                {member.first_name} {member.last_name || ''}
                                            </p>
                                            <p className="text-xs text-zinc-500 font-medium tracking-tight mt-0.5">{member.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge variant="outline" className={`
                                                px-3 py-1 rounded-lg border font-black text-[9px] uppercase tracking-widest
                                                ${['admin', 'owner', 'admin_condominio', 'admin_propiedad'].includes(member.role) 
                                                    ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                                                    : 'border-zinc-800 bg-zinc-900 text-zinc-500'}
                                            `}>
                                                {['admin', 'owner', 'admin_condominio', 'admin_propiedad'].includes(member.role) ? <Shield className="mr-1.5 h-3 w-3" /> : <User className="mr-1.5 h-3 w-3" />}
                                                {member.role === 'admin_condominio' ? 'AUXILIAR DE CONDOMINIO' : (member.role || 'viewer').toUpperCase().replace('_', ' ')}
                                            </Badge>
                                            
                                            <div className="flex items-center gap-1.5">
                                                <div className={`h-1.5 w-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-tighter ${member.status === 'active' ? 'text-emerald-500/80' : 'text-amber-500/80'}`}>
                                                    {member.status === 'active' ? 'Activo' : 'Pendiente'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {member.role !== 'owner' && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleRemoveMember(member)}
                                                className="h-10 w-10 rounded-xl text-zinc-600 hover:text-rose-400 transition-all hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </CardContent>
            </Card>

            <InviteUserModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onInvite={handleInvite}
            />

            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                isLoading={isDeleting}
                title="¿Confirmar Eliminación?"
                description="¿Estás seguro de que deseas eliminar a este miembro del equipo? Esta acción revocará su acceso inmediatamente."
                itemName={memberToDelete ? `${memberToDelete.first_name} ${memberToDelete.last_name || ''} (${memberToDelete.role})` : undefined}
            />

            {/* Subscription */}
            <Card className="bg-zinc-900 border-zinc-800 flex flex-col justify-between overflow-hidden relative">
                <CardHeader>
                    <CardTitle className="text-white">Suscripción / Plan</CardTitle>
                    <CardDescription className="text-zinc-400">Detalles de tu plan actual.</CardDescription>
                </CardHeader>
                <CardContent>
                    {subscription ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ 
                                scale: 1.01,
                                boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)'
                            }}
                            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700/50 hover:border-indigo-500/50 hover:bg-zinc-800 transition-all cursor-default overflow-hidden relative group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="flex items-center gap-5 relative z-10">
                                <div className={`p-3.5 rounded-full border transition-all duration-300 group-hover:scale-110 ${
                                    subscription.subscription_status === 'active' 
                                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 group-hover:bg-indigo-500/20'
                                        : subscription.subscription_status === 'pending'
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 group-hover:bg-amber-500/20'
                                        : 'bg-zinc-700/30 text-zinc-400 border-zinc-700/40'
                                }`}>
                                    <CreditCard className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-white text-lg tracking-tight">
                                        Plan <span className="text-indigo-400 font-extrabold uppercase">{subscription.plan_name || subscription.plan_type || 'Activo'}</span>
                                    </h3>
                                    <p className="text-sm text-zinc-400 flex items-center gap-1.5">
                                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                            subscription.subscription_status === 'active' ? 'bg-emerald-500 animate-pulse' 
                                            : subscription.subscription_status === 'pending' ? 'bg-amber-400 animate-pulse'
                                            : 'bg-zinc-500'
                                        }`}></span>
                                        {subscription.subscription_status === 'active' && (
                                            <>
                                                Próxima facturación: <span className="text-zinc-300">
                                                    {subscription.next_billing_date && !isNaN(new Date(subscription.next_billing_date).getTime()) 
                                                        ? new Date(subscription.next_billing_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                                                        : subscription.next_payment_date && !isNaN(new Date(subscription.next_payment_date).getTime())
                                                        ? new Date(subscription.next_payment_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                                                        : 'Por determinar'}
                                                </span>
                                            </>
                                        )}
                                        {subscription.subscription_status === 'pending' && (
                                            <span className="text-amber-400/80">En proceso de activación — pago en revisión</span>
                                        )}
                                        {subscription.subscription_status === 'expired' && (
                                            <span className="text-zinc-500">Vencido el {subscription.last_payment_date ? new Date(subscription.last_payment_date).toLocaleDateString('es-MX') : 'fecha desconocida'}</span>
                                        )}
                                        {!['active','pending','expired'].includes(subscription.subscription_status) && (
                                            <span className="text-zinc-500 capitalize">{subscription.subscription_status}</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <Badge className={`px-3 py-1 z-10 transition-colors border ${
                                subscription.subscription_status === 'active'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20'
                                    : subscription.subscription_status === 'pending'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 group-hover:bg-amber-500/20'
                                    : 'bg-zinc-700/20 text-zinc-400 border-zinc-700/30'
                            }`}>
                                {subscription.subscription_status === 'active' && '✅ Activo'}
                                {subscription.subscription_status === 'pending' && '⏳ En revisión'}
                                {subscription.subscription_status === 'expired' && '⚠️ Vencido'}
                                {!['active','pending','expired'].includes(subscription.subscription_status) && subscription.subscription_status}
                            </Badge>
                        </motion.div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 text-center space-y-4">
                            <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
                                <Shield className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-white text-lg">Sin suscripción activa</h3>
                                <p className="text-sm text-zinc-400 max-w-xs">
                                    No se encontró un plan activo para tu organización. Contacta a soporte o adquiere un plan.
                                </p>
                            </div>
                            <Link href="/dashboard/configuracion/planes">
                                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
                                    Ver Planes Disponibles
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
