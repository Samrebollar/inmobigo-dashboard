'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { User, Shield, CreditCard, Mail, Trash2, Plus, ArrowRight, Zap } from 'lucide-react'
import Link from 'next/link'

import { InviteUserModal } from '@/components/settings/InviteUserModal'
import { Role } from '@/types/auth'

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
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [subscription, setSubscription] = useState<any>(null)

    useEffect(() => {
        initialize()
    }, [])

    const initialize = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get Org Info
        const { data: orgUser } = await supabase
            .from('organization_users')
            .select(`
                organization_id,
                role,
                organizations (name)
            `)
            .eq('user_id', user.id)
            .single()

        if (orgUser && orgUser.organizations) {
            // @ts-ignore
            const orgName = Array.isArray(orgUser.organizations) ? orgUser.organizations[0]?.name : orgUser.organizations.name
            setOrgName(orgName || 'Mi Organización')
            fetchTeam(orgUser.organization_id)
        }

        // Get Subscription
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('subscription_status', 'active')
            .maybeSingle()

        setSubscription(sub)
    }

    const fetchTeam = async (orgId: string) => {
        // Mock data for now since we don't have full user profile joining yet for all members
        // In a real app, we'd join with a 'profiles' table.
        // For this demo, we'll list the current user and some mocks.

        // Real fetch for current user to show we can
        const { data: teamMembers } = await supabase
            .from('organization_users')
            .select('*')
            .eq('organization_id', orgId)

        // Mocking the display data
        setTeam([
            {
                id: '1',
                user_id: 'u1',
                role: 'owner',
                status: 'active',
                email: 'admin@inmobigo.com',
                first_name: 'Admin',
                last_name: 'User',
                created_at: new Date().toISOString()
            },
            {
                id: '2',
                user_id: 'u2',
                role: 'manager',
                status: 'active',
                email: 'gerente@inmobigo.com',
                first_name: 'Juan',
                last_name: 'Gerente',
                created_at: new Date().toISOString()
            },
            {
                id: '3',
                user_id: 'u3',
                role: 'staff',
                status: 'active',
                email: 'conserje@inmobigo.com',
                first_name: 'Pedro',
                last_name: 'Conserje',
                created_at: new Date().toISOString()
            }
        ])
        setLoading(false)
    }

    const handleInvite = async (email: string, role: Role) => {
        // Here we would call an API or Supabase function to invite the user
        console.log('Inviting', email, role)

        // Mock UI update
        const newMember: TeamMember = {
            id: Math.random().toString(),
            user_id: 'new',
            role: role,
            status: 'pending',
            created_at: new Date().toISOString(),
            email: email,
            first_name: 'Invitado',
            last_name: ''
        }

        setTeam([...team, newMember])
        alert(`Invitación enviada a ${email} con rol ${role.toUpperCase()}`)
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
                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">Guardar Cambios</Button>
                </CardContent>
            </Card>

            {/* Team Management */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-white">Equipo</CardTitle>
                        <CardDescription className="text-zinc-400">Gestiona el acceso al panel.</CardDescription>
                    </div>
                    <Button onClick={() => setShowInviteModal(true)} variant="outline" className="border-zinc-700 text-zinc-300">
                        <Plus className="mr-2 h-4 w-4" /> Invitar Miembro
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {team.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-950/30">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20">
                                        {member.first_name?.[0] || 'U'}{member.last_name?.[0] || 'N'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{member.first_name} {member.last_name || 'Usuario'}</p>
                                        <p className="text-sm text-zinc-500">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant="default" className="border-zinc-700 text-zinc-400">
                                            {member.role === 'admin' || member.role === 'owner' ? <Shield className="mr-1 h-3 w-3 text-indigo-400" /> : <User className="mr-1 h-3 w-3" />}
                                            {member.role.toUpperCase()}
                                        </Badge>
                                        <span className={`text-xs ${member.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            {member.status === 'active' ? '● Activo' : '● Pendiente'}
                                        </span>
                                    </div>
                                    {member.role !== 'owner' && (
                                        <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-rose-400">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <InviteUserModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onInvite={handleInvite}
            />

            {/* Subscription */}
            <Card className="bg-zinc-900 border-zinc-800 flex flex-col justify-between overflow-hidden relative">
                <CardHeader>
                    <CardTitle className="text-white">Suscripción / Plan</CardTitle>
                    <CardDescription className="text-zinc-400">Detalles de tu plan actual.</CardDescription>
                </CardHeader>
                <CardContent>
                    {subscription ? (
                        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-400">
                                    <CreditCard className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Plan {subscription.plan_name || 'Activo'}</h3>
                                    <p className="text-sm text-zinc-400">Próxima facturación: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <Badge className="bg-indigo-500 text-white hover:bg-indigo-600">Activo</Badge>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 text-center space-y-4">
                            <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
                                <Shield className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-white text-lg">Estás en Modo Demo</h3>
                                <p className="text-sm text-zinc-400 max-w-xs">
                                    No tienes un plan activo actualmente. Suscríbete para desbloquear todas las funciones.
                                </p>
                            </div>
                            <Link href="/dashboard/settings/plans">
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
