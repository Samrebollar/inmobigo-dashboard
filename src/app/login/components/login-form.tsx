'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Loader2, ArrowRight, Building2, Home, UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type UserType = 'admin' | 'resident'

export function LoginForm() {
    const [userType, setUserType] = useState<UserType>('admin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError('Credenciales incorrectas.')
            setLoading(false)
            return
        }

        router.push('/dashboard')
    }

    const isFormValid = email.length > 0 && password.length > 0

    return (
        <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
            {/* BRANDING */}
            <div className="mb-8 flex flex-col items-center text-center">
                <div className="flex flex-col items-center gap-1 mb-2">
                    <img src="/logo-inmobigo.png" alt="InmobiGo Logo" className="h-28 w-auto object-contain animate-scale-in drop-shadow-[0_0_25px_rgba(79,70,229,0.5)] bg-transparent" />
                    <span className="text-3xl font-bold tracking-tight text-white">InmobiGo</span>
                </div>
            </div>

            {/* FORM CARD */}
            <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/15 rounded-3xl p-1 shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)] relative overflow-hidden group">

                {/* User Type Toggle */}
                <div className="grid grid-cols-2 p-1 bg-black/40 rounded-xl mb-1 relative">
                    <div
                        className={cn(
                            "absolute inset-y-1 w-[calc(50%-4px)] bg-zinc-800/80 rounded-lg shadow-sm transition-all duration-300 ease-spring",
                            userType === 'admin' ? "left-1" : "left-[calc(50%+2px)]"
                        )}
                    />
                    <button
                        onClick={() => setUserType('admin')}
                        className={cn(
                            "relative z-10 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors duration-200",
                            userType === 'admin' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <Building2 size={16} />
                        <span>Administración</span>
                    </button>
                    <button
                        onClick={() => setUserType('resident')}
                        className={cn(
                            "relative z-10 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors duration-200",
                            userType === 'resident' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <Home size={16} />
                        <span>Residentes</span>
                    </button>
                </div>

                <div className="p-6 pt-4">
                    <div className="text-center mb-6">
                        <div className="transition-all duration-300">
                            <h1 className="text-2xl font-bold tracking-tight text-white">
                                <span>{userType === 'admin' ? 'Portal Corporativo' : 'Portal de Residentes'}</span>
                            </h1>
                            <p className="mt-1 text-sm text-zinc-400">
                                <span>{userType === 'admin'
                                    ? 'Gestiona tus condominios y finanzas.'
                                    : 'Accede a tus pagos y avisos.'}</span>
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5 relative z-10">

                        {/* EMAIL INPUT */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400 ml-1">
                                <span>{userType === 'admin' ? 'Correo corporativo' : 'Correo personal'}</span>
                            </label>
                            <div className="relative group/input">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-500 group-focus-within/input:text-indigo-400 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-indigo-500/50 focus:bg-indigo-950/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                    placeholder={userType === 'admin' ? "admin@empresa.com" : "tu@email.com"}
                                />
                            </div>
                        </div>

                        {/* PASSWORD INPUT */}
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <label className="text-xs font-medium text-zinc-400 ml-1"><span>Contraseña</span></label>
                                <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"><span>¿Olvidaste tu contraseña?</span></a>
                            </div>
                            <div className="relative group/input">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-500 group-focus-within/input:text-indigo-400 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:border-indigo-500/50 focus:bg-indigo-950/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* ERROR MESSAGE */}
                        {error && (
                            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 flex items-center gap-2 animate-fade-in">
                                <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* BUTTON */}
                        <button
                            type="submit"
                            disabled={!isFormValid || loading}
                            className={cn(
                                "relative w-full overflow-hidden rounded-xl py-2.5 text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none bg-[length:200%_auto] hover:bg-[position:right_center] duration-500 ease-out active:scale-[0.98] hover:scale-[1.02]",
                                userType === 'admin'
                                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-500/20 hover:shadow-indigo-500/40"
                                    : "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20 hover:shadow-emerald-500/40"
                            )}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Iniciando sesión...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Ingresar</span>
                                        <ArrowRight className="h-4 w-4 opacity-70" />
                                    </>
                                )}
                            </span>
                            {/* Shine effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
                        </button>

                    </form>

                    {/* Footer Text */}
                    <div className="mt-6 text-center space-y-4">
                        <p className="text-xs text-zinc-500">
                            ¿No tienes una cuenta?{' '}
                            <Link href={`/register?type=${userType}`} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                                Crear cuenta de {userType === 'admin' ? 'Administrador' : 'Residente'}
                            </Link>
                        </p>
                        <p className="text-xs text-zinc-600">
                            &copy; 2026 InmobiGo — {userType === 'admin' ? 'Plataforma Administrativa' : 'Portal de Residentes'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
