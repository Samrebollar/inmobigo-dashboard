'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react'
import { adminResetPasswordAction } from '@/app/actions/auth-actions'

function ActivarResidenteContent() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const email = searchParams.get('e')
    const uid = searchParams.get('uid')

    useEffect(() => {
        if (!email && !uid) {
            setError('Enlace inválido. Por favor, solicita una nueva invitación.')
        }
    }, [email, uid])

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }
        if (password.length < 6) {
            setError('Mínimo 6 caracteres')
            return
        }

        setLoading(true)
        setError('')

        try {
            // USAMOS EL MODO ADMIN DIRECTO (Sin pasar por el sistema de invitaciones roto de Supabase)
            const result = await adminResetPasswordAction(uid || undefined, password, email || undefined)

            if (!result.success) throw new Error(result.error)

            setSuccess(true)
            setTimeout(() => { router.push('/login') }, 3000)
        } catch (err: any) {
            setError(err.message || 'No se pudo activar la cuenta')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="text-center space-y-6 animate-fade-in">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-white">¡Cuenta Activada!</h1>
                <p className="text-zinc-400">Ya puedes iniciar sesión en la aplicación.</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleActivate} className="space-y-6 w-full animate-fade-in-up">
            <div className="space-y-2 text-center mb-8">
                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                        <ShieldCheck className="h-8 w-8 text-indigo-400" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Activar Mi Cuenta</h1>
                <p className="text-zinc-500 text-sm uppercase tracking-widest font-medium italic">
                    {email || 'Verificación de Identidad'}
                </p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm animate-shake text-center">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                    <input
                        type="password"
                        placeholder="Nueva Contraseña"
                        className="w-full bg-[#1e293b]/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                    <input
                        type="password"
                        placeholder="Confirmar Contraseña"
                        className="w-full bg-[#1e293b]/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-white text-black rounded-2xl font-black text-lg hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-white/5"
            >
                {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                    'ESTABLECER CONTRASEÑA'
                )}
            </button>

            <p className="text-[10px] text-zinc-600 text-center uppercase tracking-[0.2em]">
                Servidor de Activación Blindado v2.0
            </p>
        </form>
    )
}

export default function ActivarResidentePage() {
    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
            <div className="w-full max-w-sm backdrop-blur-2xl bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                <Suspense fallback={<Loader2 className="h-10 w-10 text-indigo-500 animate-spin m-auto" />}>
                    <ActivarResidenteContent />
                </Suspense>
            </div>
        </div>
    )
}
