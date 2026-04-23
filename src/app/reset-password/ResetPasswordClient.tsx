'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, CheckCircle2, ArrowRight } from 'lucide-react'

export default function ResetPasswordClient() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [activated, setActivated] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    // Detectar si necesitamos activar la cuenta primero
    const [authParams, setAuthParams] = useState<{code?: string, token_hash?: string, type?: string} | null>(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const token_hash = params.get('token_hash')
        const type = params.get('type')
        
        if (code || token_hash) {
            setAuthParams({ 
                code: code || undefined, 
                token_hash: token_hash || undefined, 
                type: type || undefined 
            })
        } else {
            // Si no hay parámetros, verificar si ya existe una sesión
            const checkSession = async () => {
                const { data: { session } } = await supabase.auth.getSession()
                if (session) setActivated(true)
            }
            checkSession()
        }
    }, [])

    const handleActivateAndProceed = async () => {
        if (!authParams) return
        setVerifying(true)
        setError('')

        try {
            if (authParams.code) {
                const { error: err } = await supabase.auth.exchangeCodeForSession(authParams.code)
                if (err) throw err
            } else if (authParams.token_hash && authParams.type) {
                const { error: err } = await supabase.auth.verifyOtp({ 
                    token_hash: authParams.token_hash, 
                    type: authParams.type as any 
                })
                if (err) throw err
            }
            setActivated(true)
        } catch (err: any) {
            setError('El enlace de seguridad es inválido o ha expirado. Por favor solicita uno nuevo.')
        } finally {
            setVerifying(false)
        }
    }

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
            setTimeout(() => { router.push('/login') }, 3000)
        } catch (err: any) {
            setError(err.message || 'Error al actualizar la contraseña')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="relative z-10 w-full max-w-sm text-center space-y-6 animate-fade-in p-6 bg-white/[0.04] border border-white/15 rounded-3xl backdrop-blur-2xl">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                    </div>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">¡Todo listo!</h1>
                    <p className="text-zinc-400 text-sm">
                        Tu contraseña ha sido guardada. Redirigiendo al portal de acceso...
                    </p>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-[progress_3s_linear_forwards]" />
                </div>
            </div>
        )
    }

    // --- ESCUDO DE ACTIVACIÓN (PARA MÓVILES) ---
    if (!activated && authParams) {
        return (
            <div className="relative z-10 w-full max-w-sm backdrop-blur-2xl bg-white/[0.04] border border-white/15 rounded-[2.5rem] p-8 shadow-2xl space-y-8 animate-fade-in-up">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-3xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                        <ShieldCheck className="h-10 w-10 text-indigo-400" />
                    </div>
                </div>
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold text-white">Verificación de Acceso</h1>
                    <p className="text-zinc-400 text-sm">
                        Haga clic en el botón de abajo para activar su invitación y configurar su contraseña.
                    </p>
                </div>
                {error && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center animate-shake">
                        {error}
                    </div>
                )}
                <button 
                    onClick={handleActivateAndProceed}
                    disabled={verifying}
                    className="group relative flex items-center justify-center gap-3 w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                    {verifying ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <span>ACTIVAR MI CUENTA</span>
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        )
    }

    return (
        <div className="relative z-10 w-full max-w-sm animate-fade-in-up px-4">
            <div className="mb-8 flex flex-col items-center text-center">
                <div className="flex items-center gap-3 mb-2">
                    <img src="/logo-inmobigo.png" alt="Logo" className="h-14 w-auto object-contain" />
                    <span className="text-2xl font-bold tracking-tight text-white">InmobiGo</span>
                </div>
            </div>

            <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/15 rounded-3xl p-6 shadow-2xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1 uppercase tracking-widest text-xs opacity-50">
                        Bienvenido al Portal
                    </h1>
                    <h2 className="text-xl font-semibold text-white">Configura tu Acceso</h2>
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
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 animate-shake">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="relative w-full overflow-hidden rounded-xl py-3 text-sm font-bold text-white shadow-lg transition-all bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-50"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <>
                                    <span>DEFINIR CONTRASEÑA</span>
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </span>
                    </button>
                </form>
            </div>
        </div>
    )
}
