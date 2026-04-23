'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getUserRoleAction } from '@/app/actions/auth-actions'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Loader2, ArrowRight, Building2, Home, User, Phone, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

function RegisterFormContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    })

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

        try {
            const cleanEmail = formData.email.trim().toLowerCase();
            
            // Login directo. Los residentes/inquilinos son pre-creados por el admin.
            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: formData.password
            });

            if (signInError) {
                if (signInError.message === 'Invalid login credentials') {
                    throw new Error('Credenciales incorrectas. Verifica tu correo y contraseña o contacta a tu administrador.');
                }
                throw signInError;
            }

            if (!authData.user) throw new Error('No se pudo verificar el usuario.');

            // Detectar Rol y Redirección Automática
            const roleResult = await getUserRoleAction(authData.user.id);
            
            if (roleResult.success && roleResult.redirectPath) {
                console.log(`✅ Login exitoso. Redirigiendo a ${roleResult.redirectPath}`);
                router.push(roleResult.redirectPath);
            } else {
                router.push('/dashboard');
            }

        } catch (err: any) {
            console.error("LOGIN ERROR:", err.message);
            setError(err.message || 'Error al iniciar sesión.');
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    return (
        <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
            {/* BRANDING */}
            <div className="mb-8 flex flex-col items-center text-center">
                <div className="flex items-center gap-3 mb-2">
                    <img src="/inmobigo-logo.png" alt="InmobiGo Logo" className="h-12 w-12 rounded-2xl shadow-lg shadow-indigo-500/20 object-contain animate-scale-in" />
                    <span className="text-2xl font-bold tracking-tight text-white">InmobiGo</span>
                </div>
            </div>

            {/* FORM CARD */}
            <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/15 rounded-3xl p-1 shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)] relative overflow-hidden group">

                <div className="p-6 pt-4">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                            Portal de Acceso
                        </h1>
                        <p className="text-sm text-zinc-400">
                            Ingresa tus credenciales para acceder al sistema.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4 relative z-10">

                        {/* EMAIL */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400 ml-1">Correo electrónico</label>
                            <div className="relative group/input">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within/input:text-indigo-400 transition-colors" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white placeholder-zinc-600 focus:border-indigo-500/50 focus:bg-indigo-950/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                    placeholder="tu@email.com"
                                />
                            </div>
                        </div>

                        {/* PASSWORD */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-medium text-zinc-400">Contraseña</label>
                                <Link 
                                    href="/forgot-password" 
                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    ¿Primer acceso o olvidaste tu contraseña?
                                </Link>
                            </div>
                            <div className="relative group/input">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within/input:text-indigo-400 transition-colors" />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white placeholder-zinc-600 focus:border-indigo-500/50 focus:bg-indigo-950/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                    placeholder="Min. 6 caracteres"
                                />
                            </div>
                        </div>

                        {/* ERROR */}
                        {error && (
                            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 animate-fade-in">
                                {error}
                            </div>
                        )}

                        {/* SUBMIT */}
                        <button
                            type="submit"
                            disabled={!formData.email || !formData.password || loading}
                            className={cn(
                                "relative w-full overflow-hidden rounded-xl py-2.5 text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none bg-[length:200%_auto] hover:bg-[position:right_center] duration-500 ease-out active:scale-[0.98] hover:scale-[1.02] bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-500/20 hover:shadow-indigo-500/40"
                            )}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Verificando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Entrar al Portal</span>
                                        <ArrowRight className="h-4 w-4 opacity-70" />
                                    </>
                                )}
                            </span>
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
                        </button>
                        
                        <p className="text-[10px] text-center text-zinc-500 mt-4 leading-tight">
                            Los residentes e inquilinos son registrados por la administración y acceden mediante invitación.
                        </p>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-zinc-500">
                            ¿Necesitas ayuda?{' '}
                            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                                Volver al Inicio
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function RegisterForm() {
    return (
        <Suspense fallback={<div className="text-white text-center">Cargando...</div>}>
            <RegisterFormContent />
        </Suspense>
    )
}
