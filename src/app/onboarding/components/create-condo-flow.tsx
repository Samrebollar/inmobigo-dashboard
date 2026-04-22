'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Building2, MapPin, LayoutGrid } from 'lucide-react'

export function CreateCondominiumFlow({ userId }: { userId: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    
    const [formData, setFormData] = useState({
        name: '',
        units: '',
        address: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

        try {
            // 1. Create Organization (Condominium)
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert({
                    name: formData.name,
                    owner_id: userId,
                    plan: 'free',
                    status: 'active',
                    type: 'admin_condominio',
                    address: formData.address,
                    total_units: parseInt(formData.units) || 0,
                    units_limit: (parseInt(formData.units) || 0) + 10, // Buffer for limit
                })
                .select()
                .single()

            if (orgError) throw orgError

            // Update profile user_type if not already set (safety)
            await supabase.from('profiles').update({ 
                user_type: 'admin_condominio',
                organization_id: org.id 
            }).eq('id', userId)

            // 2. Create Organization User (Owner)
            const { error: memberError } = await supabase
                .from('organization_users')
                .insert({
                    organization_id: org.id,
                    user_id: userId,
                    role: 'owner',
                    status: 'active'
                })

            if (memberError) throw memberError

            // 3. Create Default Subscription
            await supabase.from('subscriptions').insert({
                organization_id: org.id,
                plan_type: 'free',
                status: 'active',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            })

            router.push('/dashboard')
            router.refresh()

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error al crear condominio')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            <div className="space-y-4">
                <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <Label htmlFor="name" className="text-zinc-400">Nombre del Condominio</Label>
                    <div className="relative group">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                        <Input
                            id="name"
                            placeholder="Ej. Residencial Las Nubes"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                            className="bg-black/40 border-zinc-800 text-white pl-10 focus:border-indigo-500/50 transition-all hover:border-zinc-700"
                        />
                    </div>
                </div>

                <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <Label htmlFor="units" className="text-zinc-400">Número de Unidades</Label>
                    <div className="relative group">
                        <LayoutGrid className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                        <Input
                            id="units"
                            type="number"
                            placeholder="Ej. 48"
                            value={formData.units}
                            onChange={(e) => setFormData({...formData, units: e.target.value})}
                            required
                            className="bg-black/40 border-zinc-800 text-white pl-10 focus:border-indigo-500/50 transition-all hover:border-zinc-700"
                        />
                    </div>
                </div>

                <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <Label htmlFor="address" className="text-zinc-400">Dirección</Label>
                    <div className="relative group">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                        <Input
                            id="address"
                            placeholder="Calle, Ciudad, Estado"
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                            required
                            className="bg-black/40 border-zinc-800 text-white pl-10 focus:border-indigo-500/50 transition-all hover:border-zinc-700"
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    {error}
                </div>
            )}

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-11" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Finalizar Configuración"}
            </Button>
        </form>
    )
}
