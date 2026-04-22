'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Briefcase, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CreatePropertyPortfolioFlow({ userId }: { userId: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    
    const [formData, setFormData] = useState({
        name: '',
        type: 'rentas',
        propertyCount: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

        try {
            // 1. Create Organization (Property Portfolio)
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert({
                    name: formData.name,
                    owner_id: userId,
                    plan: 'free',
                    status: 'active',
                    type: 'admin_propiedades',
                    portfolio_type: formData.type,
                    total_units: parseInt(formData.propertyCount) || 0,
                    units_limit: (parseInt(formData.propertyCount) || 0) + 5, // Buffer
                })
                .select()
                .single()

            if (orgError) throw orgError

            // Update profile
            await supabase.from('profiles').update({ 
                user_type: 'admin_propiedades',
                organization_id: org.id 
            }).eq('id', userId)

            // 2. Create Organization User
            const { error: memberError } = await supabase
                .from('organization_users')
                .insert({
                    organization_id: org.id,
                    user_id: userId,
                    role: 'owner',
                    status: 'active'
                })

            if (memberError) throw memberError

            // 3. Create Subscription
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
            setError(err.message || 'Error al crear portafolio')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            <div className="space-y-4">
                <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <Label htmlFor="name" className="text-zinc-400">Nombre del Portafolio</Label>
                    <div className="relative group">
                        <Briefcase className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                        <Input
                            id="name"
                            placeholder="Ej. Portafolio Centro Histórico"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                            className="bg-black/40 border-zinc-800 text-white pl-10 focus:border-emerald-500/50 transition-all hover:border-zinc-700"
                        />
                    </div>
                </div>

                <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <Label className="text-zinc-400">Tipo de Portafolio</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            { id: 'rentas', label: 'Rentas', desc: 'Largo plazo' },
                            { id: 'airbnb', label: 'Airbnb', desc: 'Corta estancia' },
                            { id: 'mixto', label: 'Mixto', desc: 'Ambos' }
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setFormData({...formData, type: opt.id})}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 transform active:scale-95",
                                    formData.type === opt.id
                                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]"
                                        : "bg-black/20 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-black/40"
                                )}
                            >
                                <span className={cn(
                                    "text-sm font-bold transition-colors",
                                    formData.type === opt.id ? "text-emerald-300" : "text-zinc-400"
                                )}>{opt.label}</span>
                                <span className="text-[10px] opacity-70 mt-0.5">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <Label htmlFor="count" className="text-zinc-400">Número de Propiedades (Opcional)</Label>
                    <div className="relative group">
                        <LayoutGrid className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                        <Input
                            id="count"
                            type="number"
                            placeholder="Ej. 12"
                            value={formData.propertyCount}
                            onChange={(e) => setFormData({...formData, propertyCount: e.target.value})}
                            className="bg-black/40 border-zinc-800 text-white pl-10 focus:border-emerald-500/50 transition-all hover:border-zinc-700"
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    {error}
                </div>
            )}

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-11" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Finalizar Configuración"}
            </Button>
        </form>
    )
}
