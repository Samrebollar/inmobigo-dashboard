'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, CheckCircle2, ArrowRight } from 'lucide-react'
import { resetPasswordWithCodeAction, adminResetPasswordAction } from '@/app/actions/auth-actions'

export default function ResetPasswordClient() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    // Datos de la invitación
    const [authData, setAuthData] = useState<{code?: string, token_hash?: string, type?: string, access_token?: string, email?: string, uid?: string} | null>(null)

    useEffect(() => {
        const checkAuth = async () => {
            const params = new URLSearchParams(window.location.search)
            const code = params.get('code')
            const token_hash = params.get('token_hash')
            const type = params.get('type')
            const email = params.get('e') // Capturamos el correo de respaldo
            const uid = params.get('uid') // Capturamos el UID de respaldo
            
            const hash = window.location.hash
            const hasHashToken = hash.includes('access_token=')

            // 1. Si vienes con parámetros, hash o email de respaldo
            if (code || token_hash || hasHashToken || email || uid) {
                setShowForm(true)
                
                // Guardamos los datos para usarlos al momento de Guardar
                setAuthData({ 
                    code: code || undefined, 
                    token_hash: token_hash || undefined, 
                    type: type || undefined,
                    email: email || undefined,
                    uid: uid || undefined
                })

                // Si hay un hash, esperamos un momento a que Supabase lo procese
                if (hasHashToken) {
                    await new Promise(r => setTimeout(r, 1000))
                    const { data: { session } } = await supabase.auth.getSession()
                    if (session) {
                        setAuthData(prev => ({ ...prev, access_token: session.access_token }))
                    }
                }
            } else {
                // Verificar si ya existe una sesión normal
                const { data: { session } } = await supabase.auth.getSession()
                if (session) {
                    setShowForm(true)
                    setAuthData({ access_token: session.access_token })
                } else {
                    setError('No se detectó una invitación válida. Por favor, usa el enlace enviado a tu correo.')
                }
            }
        }
        checkAuth()
    }, [])

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
            // Intentar primero el método estándar por servidor
            const { data: { session } } = await supabase.auth.getSession()
            
            let result = await resetPasswordWithCodeAction(
                password,
                authData?.code,
                authData?.token_hash,
                authData?.type,
                session?.access_token || authData?.access_token
            )

            // SI FALLA EL MÉTODO ESTÁNDAR (Común en móviles por sesión/tokens)
            // Pero tenemos el ID del usuario en el cliente o en la URL, usamos el MODO ADMIN
            const finalUserId = session?.user?.id || authData?.uid;
            if (!result.success && (finalUserId || authData?.email)) {
                console.log('🔄 [ResetPasswordClient] Falló método estándar, intentando MODO ADMIN...');
                result = await adminResetPasswordAction(finalUserId, password, authData?.email);
            }

            if (!result.success) throw new Error(result.error)

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
            <div className="relative z-10 w-full max-w-sm text-center space-y-6 animate-fade-in p-6 bg-white/[0.04] border border-white/15 rounded-3xl backdrop-blur-2xl">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">¡Todo listo!</h1>
                <p className="text-zinc-400 text-sm">Tu contraseña ha sido guardada. Redirigiendo...</p>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-[progress_3s_linear_forwards]" />
                </div>
            </div>
        )
    }

    if (error && !showForm) {
        return (
            <div className="relative z-10 w-full max-w-sm backdrop-blur-2xl bg-white/[0.04] border border-red-500/20 rounded-3xl p-8 text-center space-y-4">
                <div className="text-red-500 text-4xl mb-4 text-center mx-auto">!</div>
                <h2 className="text-white font-bold text-xl">Enlace Inválido</h2>
                <p className="text-zinc-400 text-sm">{error}</p>
                <a href="/login" className="block w-full py-3 bg-zinc-800 text-white rounded-xl">Volver al inicio</a>
            </div>
        )
    }

    if (!showForm && !error) {
        return <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
    }

    return (
        <div className="relative z-10 w-full max-w-sm animate-fade-in px-4">
            <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/15 rounded-3xl p-6 shadow-2xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-white">Configura tu Acceso</h1>
                    <p className="text-zinc-400 text-xs">Ingresa tu nueva contraseña para activar tu cuenta.</p>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Contraseña</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 px-4 text-sm text-white focus:border-indigo-500 outline-none"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Confirmar</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 px-4 text-sm text-white focus:border-indigo-500 outline-none"
                            placeholder="Repite tu contraseña"
                        />
                    </div>
                    {error && <div className="text-red-400 text-xs text-center">{error}</div>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl py-4 bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>GUARDAR Y ACTIVAR <ArrowRight className="h-4 w-4" /></>}
                    </button>
                </form>
            </div>
        </div>
    )
}
