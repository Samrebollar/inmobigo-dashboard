'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react'
import { resetPasswordWithCodeAction } from '@/app/actions/auth-actions'

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
        const checkAuth = async () => {
            // 1. Revisar Params (?code=...)
            const params = new URLSearchParams(window.location.search)
            const code = params.get('code')
            const token_hash = params.get('token_hash')
            const type = params.get('type')
            
            // 2. Revisar Fragmento (#access_token=...) muy común en móviles
            const hash = window.location.hash
            if (hash.includes('access_token=')) {
                // Si hay un token en el fragmento, el usuario YA está autenticado en el cliente.
                // Intentamos capturar la sesión para estar seguros.
                const { data: { session } } = await supabase.auth.getSession()
                if (session) {
                    setActivated(true)
                } else {
                    // Si el fragmento está pero la sesión no, esperamos un poco (proceso de Supabase)
                    await new Promise(r => setTimeout(r, 1000))
                    const { data: { session: retrySession } } = await supabase.auth.getSession()
                    if (retrySession) setActivated(true)
                }
            }

            // 3. Si tenemos parámetros directos, guardarlos para la acción de servidor
            if (code || token_hash) {
                setAuthParams({ 
                    code: code || undefined, 
                    token_hash: token_hash || undefined, 
                    type: type || undefined 
                })
            }
        }
        checkAuth()
    }, [activated])

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
            // Pequeña pausa para asegurar que el estado de auth se sincronice
            await new Promise(r => setTimeout(r, 500))
            setActivated(true)
        } catch (err: any) {
            console.error('Activation error:', err)
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
            // Obtener el token de acceso actual si existe una sesión en el cliente
            const { data: { session } } = await supabase.auth.getSession()

            // USAR LA ACCIÓN DE SERVIDOR ROBUSTA PASANDO EL ACCESS TOKEN COMO RESPALDO
            const result = await resetPasswordWithCodeAction(
                password,
                authParams?.code,
                authParams?.token_hash,
                authParams?.type,
                session?.access_token // Pasar el token de la sesión del móvil
            )

            if (!result.success) {
                throw new Error(result.error || 'Error al actualizar la contraseña')
            }

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

    // --- ESTADO: ÉXITO ---
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

    // --- ESTADO: ESCUDO DE ACTIVACIÓN (SOLO SI HAY PARÁMETROS Y NO ESTÁ ACTIVADO) ---
    if (!activated && authParams) {
        return (
            <div className="relative z-10 w-full max-w-sm backdrop-blur-2xl bg-white/[0.04] border border-white/15 rounded-[2.5rem] p-8 shadow-2xl space-y-8 animate-fade-in-up">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-3xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                        <ShieldCheck className="h-10 w-10 text-indigo-400" />
                    </div>
                </div>
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold text-white tracking-widest text-[10px] uppercase opacity-50 mb-1">InmobiGo</h1>
                    <h2 className="text-xl font-bold text-white leading-tight">Activar Acceso</h2>
                    <p className="text-zinc-400 text-sm">
                        Haga clic para validar su identidad y configurar su contraseña.
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
                    className="group relative flex items-center justify-center gap-3 w-full py-4 bg-white text-black rounded-2xl font-bold hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {verifying ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <span>VALIDAR MI CUENTA</span>
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        )
    }

    // --- ESTADO: FORMULARIO DE CONTRASEÑA ---
    return (
        <div className="relative z-10 w-full max-w-sm animate-fade-in-up px-4">
            <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/15 rounded-3xl p-6 shadow-2xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-white mb-2">Nueva Contraseña</h1>
                    <p className="text-zinc-400 text-xs">Configure una contraseña segura para su cuenta.</p>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400 ml-1">Contraseña</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white focus:border-indigo-500/50 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400 ml-1">Confirmar</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400" />
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white focus:border-indigo-500/50 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'GUARDAR CONTRASEÑA'}
                    </button>
                </form>
            </div>
        </div>
    )
}
