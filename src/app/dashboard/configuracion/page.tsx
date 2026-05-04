'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { User, Shield, CreditCard, Mail, Trash2, Plus, ArrowRight, Zap, Save, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

import { InviteUserModal } from '@/components/settings/InviteUserModal'
import { AmenityModal } from '@/components/settings/AmenityModal'
import { Role } from '@/types/auth'
import { saveAmenityAction, getAmenitiesAction, deleteAmenityAction } from '@/app/actions/service-actions'
import { inviteTeamMemberAction } from '@/app/actions/team-actions'

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

    // Amenities State
    const [amenities, setAmenities] = useState<any[]>([])
    const [loadingAmenities, setLoadingAmenities] = useState(false)
    const [showAmenityModal, setShowAmenityModal] = useState(false)
    const [editingAmenity, setEditingAmenity] = useState<any>(null)
    const [businessType, setBusinessType] = useState('condominio')

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
                setBusinessType(data.businessType || 'condominio')
                
                fetchTeam(data.organizationId)
                fetchBillingSettings(data.organizationId)
                
                if (data.businessType !== 'propiedades') {
                    fetchAmenities(data.organizationId)
                }
            }

            // Get Subscription (Can still use client since it's simple)
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: sub } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('subscription_status', 'active')
                    .maybeSingle()
                setSubscription(sub)
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
                setBusinessType(ownerOrg.business_type || 'condominio')
                fetchTeam(ownerOrg.id)
                fetchBillingSettings(ownerOrg.id)
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
            toast.success('Configuración de cobros guardada correctamente')
        } catch (error: any) {
            console.error('Error saving billing settings:', error)
            toast.error('Error al guardar configuración: ' + error.message)
        } finally {
            setSavingBilling(false)
        }
    }

    const fetchAmenities = async (organizationId: string) => {
        setLoadingAmenities(true)
        try {
            const result = await getAmenitiesAction(organizationId)
            if (result.success && result.data) {
                setAmenities(result.data)
            } else {
                console.error('Error fetching amenities:', result.error)
            }
        } catch (e) {
            console.error('Error fetching amenities:', e)
        } finally {
            setLoadingAmenities(false)
        }
    }

    const handleSaveAmenity = async (amenityData: any) => {
        try {
            const result = await saveAmenityAction(amenityData)
            
            if (!result.success) {
                console.error('Error in handleSaveAmenity:', result)
                throw new Error(result.error || 'Error al guardar amenidad')
            }
            
            const data = result.data
            setAmenities(prev => {
                const exists = prev.find(a => a.id === data.id)
                if (exists) return prev.map(a => a.id === data.id ? data : a)
                return [...prev, data]
            })
            toast.success(amenityData.id ? 'Amenidad actualizada' : 'Amenidad creada')
        } catch (e: any) {
            console.error('Error detallado saving amenity:', e)
            toast.error('Error guardando amenidad: ' + e.message)
            throw e 
        }
    }

    const handleDeleteAmenity = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('¿Seguro de que deseas eliminar esta amenidad? Se perderá el acceso a futuras reservas en este espacio.')) return
        try {
            const result = await deleteAmenityAction(id)
            if (!result.success) throw new Error(result.error)
            
            setAmenities(prev => prev.filter(a => a.id !== id))
            toast.success('Espacio eliminado permanentemente')
        } catch (e: any) {
            console.error('Error deleting amenity:', e)
            toast.error('Error eliminando amenidad: ' + e.message)
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

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm('¿Estás seguro de eliminar a este miembro del equipo?')) return;
        
        try {
            const { error } = await supabase
                .from('organization_users')
                .delete()
                .eq('id', memberId)
                
            if (error) throw error;
            
            setTeam(team.filter(m => m.id !== memberId))
            toast.success('Miembro eliminado correctamente')
        } catch (error: any) {
            console.error('Error removing member:', error)
            toast.error('Error al eliminar: ' + error.message)
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
                                                {(member.role || 'viewer').toUpperCase().replace('_', ' ')}
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
                                                onClick={() => handleRemoveMember(member.id)}
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

            {/* Menu Amenidades */}
            {businessType !== 'propiedades' && (
                <>
                    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:to-emerald-500/5 transition-colors duration-700 pointer-events-none" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 relative z-10">
                            <div>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                        <Zap className="h-5 w-5" />
                                    </span> 
                                    Espacios y Amenidades
                                </CardTitle>
                                <CardDescription className="text-zinc-400 mt-1">
                                    Crea instalaciones reservables (Gimnasio, Salón de Eventos) y configura sus costos y normativas.
                                </CardDescription>
                            </div>
                            <motion.div
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Button 
                                    onClick={() => { setEditingAmenity(null); setShowAmenityModal(true); }} 
                                    className="whitespace-nowrap shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border border-indigo-400/30 px-6 hover:scale-105 transition-all duration-300"
                                >
                                    Registrar Amenidad
                                </Button>
                            </motion.div>
                        </CardHeader>
                        <CardContent className="space-y-6 relative z-10">
                            <div className="grid gap-4 md:grid-cols-2">
                                {loadingAmenities ? (
                                    <div className="text-zinc-500 text-sm py-4 animate-pulse md:col-span-2">Cargando amenidades...</div>
                                ) : amenities.length === 0 ? (
                                    <div className="border border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3 bg-zinc-900/50 md:col-span-2">
                                        <span className="p-4 bg-zinc-800/80 rounded-full text-zinc-500">
                                            <Plus className="h-8 w-8" />
                                        </span>
                                        <h3 className="font-bold text-white">Ningún Espacio Registrado</h3>
                                        <p className="text-sm text-zinc-400 max-w-sm">No has agregado amenidades a tu condominio. Comienza creando un espacio para que los residentes puedan reservar.</p>
                                    </div>
                                ) : (
                                    amenities.map(amenity => (
                                        <motion.div 
                                            key={amenity.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => { setEditingAmenity(amenity); setShowAmenityModal(true); }}
                                            className={`relative p-5 rounded-2xl border bg-zinc-950 transition-all duration-300 cursor-pointer group/card flex flex-col justify-between overflow-hidden ${amenity.status === 'maintenance' ? 'border-orange-500/30 opacity-80 hover:opacity-100 hover:border-orange-500/60 shadow-[inset_0_0_20px_rgba(249,115,22,0.05)]' : 'border-zinc-800/80 hover:bg-zinc-900/90 shadow-none hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:-translate-y-1 hover:border-indigo-500/30'}`}
                                        >
                                            <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent ${amenity.status === 'maintenance' ? 'via-orange-500' : 'via-indigo-500'} to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out`} />
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-inner ${amenity.status === 'maintenance' ? 'from-orange-800 to-orange-950 grayscale-[0.5]' : amenity.color || 'from-zinc-700 to-zinc-900'} text-white`}>
                                                        <Zap className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-base font-bold text-white truncate max-w-[140px]">{amenity.name}</h4>
                                                            {amenity.status === 'maintenance' && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1 shrink-0 animate-pulse">
                                                                    Pausado
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${amenity.status === 'maintenance' ? 'text-orange-500/60' : 'text-emerald-400'}`}>
                                                            {amenity.base_price > 0 ? `$${amenity.base_price} • ` : 'Gratis • '} 
                                                            Depósito: {amenity.deposit_required ? `$${amenity.deposit_amount}` : 'NO'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={(e) => handleDeleteAmenity(amenity.id, e)}
                                                    className="text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover/card:opacity-100 transition-all rounded-full shrink-0"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 group-hover/card:border-zinc-700 transition-colors mt-auto">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <span className="opacity-70">Aforo:</span> 
                                                    <span className="text-white">{amenity.capacity} pers.</span>
                                                </div>
                                                <div className="w-1 h-1 rounded-full bg-zinc-700 shrink-0"></div>
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <span className="opacity-70">Horario:</span> 
                                                    <span className="text-white truncate max-w-[100px]">{amenity.use_hours || 'ND'}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <AmenityModal 
                        isOpen={showAmenityModal}
                        onClose={() => { setShowAmenityModal(false); setEditingAmenity(null); }}
                        orgId={orgId || ''}
                        amenityToEdit={editingAmenity}
                        onSave={handleSaveAmenity}
                    />
                </>
            )}

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
