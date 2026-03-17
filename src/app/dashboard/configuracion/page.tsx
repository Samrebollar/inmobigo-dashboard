'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { User, Shield, CreditCard, Mail, Trash2, Plus, ArrowRight, Zap, Save } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

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
    const [orgId, setOrgId] = useState<string | null>(null)
    const [savingOrg, setSavingOrg] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [subscription, setSubscription] = useState<any>(null)
    
    // Billing Settings State
    const [billingSettings, setBillingSettings] = useState({
        late_fee_percentage: 10,
        grace_days: 5,
        due_days_after_issue: 5,
        auto_generate_charges: false,
        auto_apply_late_fee: false,
        currency: 'MXN',
        billing_mode: 'mensual'
    })
    const [savingBilling, setSavingBilling] = useState(false)

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
            setOrgId(orgUser.organization_id)
            fetchTeam(orgUser.organization_id)
            fetchBillingSettings(orgUser.organization_id)
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
            alert('Nombre de organización actualizado exitosamente')
        } catch (e: any) {
            console.error(e)
            alert('Error al guardar el nombre de la organización: ' + e.message)
        } finally {
            setSavingOrg(false)
        }
    }

    const fetchBillingSettings = async (organizationId: string) => {
        try {
            const { data, error } = await supabase
                .from('organization_settings')
                .select('*')
                .eq('organization_id', organizationId)
                .single()
            
            if (data) {
                setBillingSettings({
                    late_fee_percentage: data.late_fee_percentage ?? 10,
                    grace_days: data.grace_days ?? 5,
                    due_days_after_issue: data.due_days_after_issue ?? 5,
                    auto_generate_charges: data.auto_generate_charges ?? false,
                    auto_apply_late_fee: data.auto_apply_late_fee ?? false,
                    currency: data.currency || 'MXN',
                    billing_mode: data.billing_mode || 'mensual'
                })
            }
        } catch (error: any) {
            // Note: PGRST116 means zero rows found, totally normal on first use if not defined yet
            if (error.code !== 'PGRST116') {
                console.error('Error fetching billing settings:', error)
            }
        }
    }

    const handleSaveBillingSettings = async () => {
        if (!orgId) return
        setSavingBilling(true)
        try {
            const { error } = await supabase
                .from('organization_settings')
                .upsert({
                    organization_id: orgId,
                    ...billingSettings,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'organization_id' })
            
            if (error) throw error
            alert('Configuración de cobros guardada correctamente')
        } catch (error: any) {
            console.error('Error saving billing settings:', error)
            alert('Error al guardar configuración: ' + error.message)
        } finally {
            setSavingBilling(false)
        }
    }

    const fetchTeam = async (orgId: string) => {
        try {
            const { data: teamMembers, error: teamError } = await supabase
                .from('organization_users')
                .select('*')
                .eq('organization_id', orgId)

            if (teamError) throw teamError

            if (!teamMembers || teamMembers.length === 0) {
                setTeam([])
                return
            }

            const userIds = teamMembers.map(tm => tm.user_id)
            
            // Try fetching profiles. Depending on actual schema table might be "profiles" or "users" in public schema. Needs to not fail if missing column.
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds)

            const merged = teamMembers.map(tm => {
                const profile = profiles?.find(p => p.id === tm.user_id)
                // Split full_name into first_name, last_name or fallback to default
                let first_name = 'Usuario'
                let last_name = ''
                if (profile && profile.full_name) {
                    const parts = profile.full_name.split(' ')
                    first_name = parts[0]
                    last_name = parts.slice(1).join(' ')
                }

                return {
                    id: tm.id,
                    user_id: tm.user_id,
                    role: tm.role,
                    status: tm.status,
                    created_at: tm.created_at,
                    email: profile?.email || 'N/A',
                    first_name,
                    last_name
                }
            })

            // Sort so owner/admin are at top
            merged.sort((a, b) => {
                const roleWeight = { 'owner': 0, 'admin': 1, 'manager': 2, 'staff': 3, 'user': 4 }
                return (roleWeight[a.role as keyof typeof roleWeight] || 99) - (roleWeight[b.role as keyof typeof roleWeight] || 99)
            })

            setTeam(merged as TeamMember[])
        } catch (error) {
            console.error('Error fetching team:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm('¿Estás seguro de eliminar a este miembro del equipo?')) return;
        
        try {
            const { error } = await supabase
                .from('organization_users')
                .delete()
                .eq('id', memberId)
                
            if (error) throw error;
            
            setTeam(team.filter(m => m.id !== memberId))
            alert('Miembro eliminado correctamente')
        } catch (error: any) {
            console.error('Error removing member:', error)
            alert('Error al eliminar: ' + error.message)
        }
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
                    <Button onClick={() => setShowInviteModal(true)} variant="outline" className="border-zinc-700 text-zinc-300">
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
                                    whileHover={{ 
                                        scale: 1.02, 
                                        backgroundColor: 'rgba(79, 70, 229, 0.08)', // bg-indigo-500/8
                                        borderColor: 'rgba(99, 102, 241, 0.4)',     // border-indigo-500/40
                                        boxShadow: '0 8px 30px rgba(79, 70, 229, 0.12)'
                                    }}
                                    className="flex items-center justify-between p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 transition-all duration-300 cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20">
                                            {member.first_name?.[0] || 'U'}{member.last_name?.[0] || 'N'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{member.first_name} {member.last_name || ''}</p>
                                            <p className="text-sm text-zinc-500">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge variant="default" className="border-zinc-700 bg-zinc-800 text-zinc-300">
                                                {member.role === 'admin' || member.role === 'owner' ? <Shield className="mr-1 h-3 w-3 text-indigo-400" /> : <User className="mr-1 h-3 w-3" />}
                                                {member.role.toUpperCase()}
                                            </Badge>
                                            <span className={`text-xs ${member.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {member.status === 'active' ? '● Activo' : '● Pendiente'}
                                            </span>
                                        </div>
                                        {member.role !== 'owner' && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleRemoveMember(member.id)}
                                                className="text-zinc-500 hover:text-rose-400 transition-colors hover:bg-rose-500/10"
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

            {/* Políticas de Cobro y Facturación */}
            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-colors duration-700 pointer-events-none" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 relative z-10">
                    <div>
                        <CardTitle className="text-white flex items-center gap-2">
                            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                <Zap className="h-5 w-5" />
                            </span> 
                            Políticas de Cobro y Facturación
                        </CardTitle>
                        <CardDescription className="text-zinc-400 mt-1">
                            Ajusta plazos, recargos y notificaciones automáticas para tus residentes.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">
                    {/* Seccion 1 */}
                    <motion.div 
                        whileHover={{ y: -2, boxShadow: '0 10px 30px -10px rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)' }}
                        className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-all duration-300 relative overflow-hidden group/section"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover/section:opacity-100 transition-opacity" />
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <span className="text-indigo-400">01.</span> Configuración de Cobros
                        </h3>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="group/input">
                                <label className="text-xs text-zinc-400 mb-1.5 block group-focus-within/input:text-indigo-400 transition-colors">Recargo por mora (%)</label>
                                <Input 
                                    type="number" 
                                    min="0"
                                    value={billingSettings.late_fee_percentage} 
                                    onChange={e => setBillingSettings(s => ({...s, late_fee_percentage: parseFloat(e.target.value) || 0}))} 
                                    className="bg-zinc-950 border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:bg-zinc-900"
                                />
                            </div>
                            <div className="group/input">
                                <label className="text-xs text-zinc-400 mb-1.5 block group-focus-within/input:text-indigo-400 transition-colors">Días de gracia</label>
                                <Input 
                                    type="number" 
                                    min="0"
                                    value={billingSettings.grace_days} 
                                    onChange={e => setBillingSettings(s => ({...s, grace_days: parseInt(e.target.value) || 0}))} 
                                    className="bg-zinc-950 border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:bg-zinc-900"
                                />
                            </div>
                            <div className="group/input">
                                <label className="text-xs text-zinc-400 mb-1.5 block group-focus-within/input:text-indigo-400 transition-colors">Límite tras emitir (días)</label>
                                <Input 
                                    type="number" 
                                    min="0"
                                    value={billingSettings.due_days_after_issue} 
                                    onChange={e => setBillingSettings(s => ({...s, due_days_after_issue: parseInt(e.target.value) || 0}))} 
                                    className="bg-zinc-950 border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:bg-zinc-900"
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Seccion 2 */}
                    <motion.div 
                        whileHover={{ y: -2, boxShadow: '0 10px 30px -10px rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)' }}
                        className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-all duration-300 relative overflow-hidden group/section"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500 opacity-0 group-hover/section:opacity-100 transition-opacity" />
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <span className="text-purple-400">02.</span> Automatización de Cobro
                        </h3>
                        <div className="grid gap-6 md:grid-cols-2">
                            <motion.div whileHover={{ scale: 1.01 }} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 border border-transparent hover:border-zinc-700/50 transition-all">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium text-zinc-300">Generar cobros automáticos</label>
                                    <p className="text-xs text-zinc-500">Crea las facturas mensuales automáticamente.</p>
                                </div>
                                <Switch 
                                    checked={billingSettings.auto_generate_charges} 
                                    onCheckedChange={c => setBillingSettings(s => ({...s, auto_generate_charges: c}))} 
                                    className="data-[state=checked]:bg-purple-500"
                                />
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.01 }} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 border border-transparent hover:border-zinc-700/50 transition-all">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium text-zinc-300">Aplicar recargos automáticos</label>
                                    <p className="text-xs text-zinc-500">Aplica recargos por mora tras los días de gracia.</p>
                                </div>
                                <Switch 
                                    checked={billingSettings.auto_apply_late_fee} 
                                    onCheckedChange={c => setBillingSettings(s => ({...s, auto_apply_late_fee: c}))} 
                                    className="data-[state=checked]:bg-purple-500"
                                />
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Seccion 3 */}
                    <motion.div 
                        whileHover={{ y: -2, boxShadow: '0 10px 30px -10px rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)' }}
                        className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-all duration-300 relative overflow-hidden group/section"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-500 to-rose-500 opacity-0 group-hover/section:opacity-100 transition-opacity" />
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <span className="text-pink-400">03.</span> Configuración General
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="group/input">
                                <label className="text-xs text-zinc-400 mb-1.5 block group-focus-within/input:text-pink-400 transition-colors">Moneda</label>
                                <select 
                                    value={billingSettings.currency} 
                                    onChange={e => setBillingSettings(s => ({...s, currency: e.target.value}))} 
                                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/50 transition-all hover:bg-zinc-900"
                                >
                                    <option value="MXN">Pesos Mexicanos (MXN)</option>
                                    <option value="USD">Dólares Estadounidenses (USD)</option>
                                    <option value="COP">Pesos Colombianos (COP)</option>
                                    <option value="CLP">Pesos Chilenos (CLP)</option>
                                    <option value="PEN">Soles Peruanos (PEN)</option>
                                </select>
                            </div>
                            <div className="group/input">
                                <label className="text-xs text-zinc-400 mb-1.5 block group-focus-within/input:text-pink-400 transition-colors">Tipo de cobro</label>
                                <select 
                                    value={billingSettings.billing_mode} 
                                    onChange={e => setBillingSettings(s => ({...s, billing_mode: e.target.value}))} 
                                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/50 transition-all hover:bg-zinc-900"
                                >
                                    <option value="mensual">Mensual (El más común)</option>
                                    <option value="bimensual">Bimensual</option>
                                    <option value="anual">Anual</option>
                                </select>
                            </div>
                        </div>
                    </motion.div>

                    <div className="flex justify-end pt-2">
                        <Button 
                            onClick={handleSaveBillingSettings} 
                            disabled={savingBilling || !orgId}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all"
                        >
                            <Save className="h-4 w-4" />
                            {savingBilling ? 'Guardando...' : 'Guardar Políticas'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

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
                                <div className="p-3.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-300">
                                    <CreditCard className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-white text-lg tracking-tight">
                                        Plan <span className="text-indigo-400 font-extrabold uppercase">{subscription.plan_name || subscription.plan_type || 'Activo'}</span>
                                    </h3>
                                    <p className="text-sm text-zinc-400 flex items-center gap-1.5">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Próxima facturación: <span className="text-zinc-300">
                                            {subscription.next_billing_date && !isNaN(new Date(subscription.next_billing_date).getTime()) 
                                                ? new Date(subscription.next_billing_date).toLocaleDateString() 
                                                : 'Por determinar'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <Badge className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 group-hover:bg-indigo-500/20 transition-colors z-10">
                                Estado Activo
                            </Badge>
                        </motion.div>
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
