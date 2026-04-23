'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Loader2, CheckCircle2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function ResetPasswordContent() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            return
        }

        setLoading(true)
        setError('')

        try {
            const { error: resetError } = await supabase.auth.updateUser({
                password: password
            })

            if (resetError) throw resetError

            setSuccess(true)
            setTimeout(() => {
                router.push('/login')
            }, 3000)

        } catch (err: any) {
            setError(err.message || 'Error al actualizar la contraseña')
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
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">¡Contraseña configurada!</h1>
                    <p className="text-zinc-400 text-sm">
                        Tu cuenta ha sido activada con éxito. Redirigiendo al portal...
                    </p>
                </div>
                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-progress" />
                </div>
            </div>
        )
    }

    return (
        <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
            <div className="mb-8 flex flex-col items-center text-center">
                <div className="flex items-center gap-3 mb-2">
                    <img src="/inmobigo-logo.png" alt="InmobiGo Logo" className="h-12 w-12 rounded-2xl shadow-lg shadow-indigo-500/20 object-contain" />
                    <span className="text-2xl font-bold tracking-tight text-white">InmobiGo</span>
                </div>
            </div>

            <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/15 rounded-3xl p-6 shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)]">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                        Configura tu Acceso
                    </h1>
                    <p className="text-sm text-zinc-400">
                        Crea una contraseña segura para tu cuenta.
                    </p>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400 ml-1">Nueva Contraseña</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400 ml-1">Confirmar Contraseña</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 animate-fade-in">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="relative w-full overflow-hidden rounded-xl py-2.5 text-sm font-semibold text-white shadow-lg transition-all bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-indigo-500/40 active:scale-[0.98] disabled:opacity-50"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <>
                                    <span>Guardar Contraseña</span>
                                    <ArrowRight className="h-4 w-4 opacity-70" />
                                </>
                            )}
                        </span>
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0F172A]">
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1)_0%,transparent_50%)]" />
            </div>
            <Suspense fallback={<div className="text-white">Cargando...</div>}>
                <ResetPasswordContent />
            </Suspense>
        </div>
    )
}
