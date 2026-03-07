'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export function CreateOrgForm({ userId }: { userId: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [name, setName] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

        try {
            // 1. Create Organization
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert({
                    name,
                    owner_id: userId,
                    plan: 'free',
                    status: 'active'
                })
                .select()
                .single()

            if (orgError) throw orgError

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

            // 3. Create Default Subscription (Optional, but good practice)
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
            setError(err.message || 'Error al crear organización')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="orgName">Nombre del Condominio u Organización</Label>
                <Input
                    id="orgName"
                    placeholder="Ej. Condominio Las Palmas"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-black/20 border-zinc-700 text-white placeholder-zinc-500"
                />
            </div>

            {error && (
                <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">
                    {error}
                </div>
            )}

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear y Continuar
            </Button>
        </form>
    )
}
