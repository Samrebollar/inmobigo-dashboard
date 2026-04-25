'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Loader2, ArrowRight, User } from 'lucide-react'
import { cn } from '@/lib/utils'

function RegisterFormContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const userType = searchParams.get('type') || 'admin'

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
    })

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

        try {
            const cleanEmail = formData.email.trim().toLowerCase();
            
            // Registro del nuevo administrador
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: cleanEmail,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        role: 'admin' // Se le asigna admin genérico, luego onboarding decide el específico
                    }
                }
            });

            if (signUpError) {
                throw signUpError;
            }

            if (!authData.user) throw new Error('No se pudo crear el usuario.');

            // Redirigir al onboarding para que elija su tipo de administración
            console.log(`✅ Registro exitoso. Redirigiendo a onboarding...`);
            router.push('/onboarding');

        } catch (err: any) {
            console.error("REGISTER ERROR:", err.message);
            setError(err.message || 'Error al registrar la cuenta.');
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
                            Crea tu cuenta
                        </h1>
                        <p className="text-sm text-zinc-400">
                            Regístrate como administrador para empezar a gestionar.
                        </p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4 relative z-10">

                        {/* FULL NAME */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400 ml-1">Nombre completo</label>
                            <div className="relative group/input">
                                <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within/input:text-indigo-400 transition-colors" />
                                <input
                                    name="fullName"
                                    type="text"
                                    required
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white placeholder-zinc-600 focus:border-indigo-500/50 focus:bg-indigo-950/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>
                        </div>

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
                            <label className="text-xs font-medium text-zinc-400 ml-1">Contraseña</label>
                            <div className="relative group/input">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within/input:text-indigo-400 transition-colors" />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    minLength={6}
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
                            disabled={!formData.fullName || !formData.email || !formData.password || loading}
                            className={cn(
                                "relative w-full overflow-hidden rounded-xl py-2.5 text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none bg-[length:200%_auto] hover:bg-[position:right_center] duration-500 ease-out active:scale-[0.98] hover:scale-[1.02] bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-500/20 hover:shadow-indigo-500/40"
                            )}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Registrando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Comenzar ahora</span>
                                        <ArrowRight className="h-4 w-4 opacity-70" />
                                    </>
                                )}
                            </span>
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-zinc-500">
                            ¿Ya tienes una cuenta?{' '}
                            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                                Iniciar Sesión
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
