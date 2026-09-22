'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react'
import { resetPasswordWithCodeAction } from '@/app/actions/auth-actions'

function ResetPasswordForm() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const searchParams = useSearchParams()

    // Únicas fuentes válidas de identidad: un código/token emitido por Supabase.
    // Nunca un email o user id sueltos en la URL — cualquiera podría escribirlos a mano.
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    // Respaldo para cuando el navegador pierde la cookie de sesión (ej. salto móvil
    // correo -> navegador): los tokens reales viajan en el fragmento de la URL, nunca
    // en query string, y solo los pone ahí /auth/confirm tras verificar el enlace.
    const [hashAccessToken, setHashAccessToken] = useState<string | null>(null)
    const [hashRefreshToken, setHashRefreshToken] = useState<string | null>(null)
    const [checkedHash, setCheckedHash] = useState(false)

    useEffect(() => {
        const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
        const params = new URLSearchParams(hash)
        setHashAccessToken(params.get('access_token'))
        setHashRefreshToken(params.get('refresh_token'))
        setCheckedHash(true)
    }, [])

    // Solo se puede intentar el cambio de contraseña si llegó un identificador
    // verificable por Supabase (code / token_hash / access_token). Un email o uid
    // sueltos en la URL NO cuentan como prueba de identidad.
    const linkValid = Boolean(code || token_hash || hashAccessToken)

    const handleSave = async (e: React.FormEvent) => {
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
            const result = await resetPasswordWithCodeAction(
                password,
                code || undefined,
                token_hash || undefined,
                type || undefined,
                hashAccessToken || undefined,
                hashRefreshToken || undefined
            )

            if (!result.success) {
                throw new Error(
                    'Este enlace no es válido o ya expiró. Por favor solicita uno nuevo desde la pantalla de inicio de sesión.'
                )
            }

            setSuccess(true)
            setTimeout(() => { router.push('/dashboard') }, 2000)
        } catch (err: any) {
            setError(err.message || 'No se pudo actualizar la contraseña')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="text-center space-y-6 animate-fade-in p-2">
                <div className="flex justify-center">
                    <div className="h-24 w-24 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-white leading-tight uppercase">¡ÉXITO!</h1>
                    <p className="text-zinc-400 font-medium">Contraseña guardada. Te estamos redirigiendo...</p>
                </div>
            </div>
        )
    }

    if (!checkedHash) {
        return (
            <div className="flex justify-center p-10">
                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
            </div>
        )
    }

    if (!linkValid) {
        return (
            <div className="text-center space-y-6 animate-fade-in p-2">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                        <ShieldCheck className="h-10 w-10 text-red-400" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-white leading-tight uppercase">Enlace inválido</h1>
                    <p className="text-zinc-400 font-medium text-sm">
                        Este enlace de recuperación no es válido o ya expiró. Solicita uno nuevo desde la pantalla de inicio de sesión.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="text-center space-y-3">
                <div className="flex justify-center mb-2">
                    <div className="p-4 bg-indigo-500/15 rounded-3xl border border-indigo-500/20 shadow-xl shadow-indigo-500/10">
                        <ShieldCheck className="h-10 w-10 text-indigo-400" />
                    </div>
                </div>
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">CONFIGURAR ACCESO</h1>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold opacity-70">
                    Verificación de Identidad
                </p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs text-center animate-shake leading-relaxed font-semibold uppercase tracking-widest">
                    {error}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-3">
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                        <input
                            type="password"
                            placeholder="NUEVA CONTRASEÑA"
                            className="w-full bg-[#1e293b]/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold text-sm"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                        <input
                            type="password"
                            placeholder="CONFIRMAR CONTRASEÑA"
                            className="w-full bg-[#1e293b]/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold text-sm"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-2xl shadow-white/5 mt-6"
                >
                    {loading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        'GUARDAR Y ACTIVAR'
                    )}
                </button>
            </form>

            <div className="pt-6 border-t border-white/5">
                <p className="text-[10px] text-zinc-600 text-center uppercase tracking-[0.2em] font-black italic">
                    Acceso Seguro Residentes v2.5
                </p>
            </div>
        </div>
    )
}

export default function ResetPasswordClient() {
    return (
        <div className="relative z-10 w-full max-w-sm backdrop-blur-3xl bg-white/[0.01] border border-white/10 rounded-[3rem] p-10 shadow-2xl overflow-hidden min-h-[500px] flex flex-col justify-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20" />
            <Suspense fallback={<Loader2 className="h-10 w-10 text-indigo-500 animate-spin m-auto" />}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    )
}
