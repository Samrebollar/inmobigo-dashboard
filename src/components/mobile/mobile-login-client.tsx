'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getUserRoleAction } from '@/app/actions/auth-actions'
import { Mail, Lock, Fingerprint, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type UserType = 'admin' | 'resident'

export default function MobileLoginClient() {
    const [userType, setUserType] = useState<UserType>('resident')
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
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (signInError || !authData.user) {
            setError('Credenciales incorrectas.')
            setLoading(false)
            return
        }

        if (userType === 'resident') {
            router.push('/mobile')
            return
        }

        // Administradores no tienen todavía una versión móvil dedicada:
        // se les manda al panel web, que ya resuelve a dónde ir según su rol.
        const roleResult = await getUserRoleAction(authData.user.id)
        router.push(roleResult.success && roleResult.redirectPath ? roleResult.redirectPath : '/dashboard')
    }

    const isFormValid = email.length > 0 && password.length > 0

    return (
        <div className="flex items-center justify-center p-5">
            <div className="mx-auto flex w-full max-w-[400px] flex-col items-center py-2.5">
                <div className="flex h-[110px] w-[102px] flex-col items-start pb-12">
                    <img src="/logo-inmobigo.png" alt="InmobiGo" className="size-24 object-contain" />
                </div>

                <div className="flex w-full flex-col items-center gap-1 pb-8 text-center">
                    <h1 className="text-[32px] font-bold leading-[40px] tracking-[-0.64px] text-[#191C1D]">
                        Bienvenido a InmobiGo
                    </h1>
                    <p className="text-[16px] leading-[24px] text-[#434655]">
                        Gestión inteligente de tu propiedad
                    </p>
                </div>

                <div className="flex w-full flex-col gap-6 rounded-[20px] border border-[#c3c6d7] bg-white p-[33px] shadow-[0px_4px_10px_rgba(0,0,0,0.03)]">
                    <form onSubmit={handleLogin} className="flex w-full flex-col gap-6">
                        <div className="relative flex w-full rounded-2xl bg-[#f3f4f5] p-1">
                            <div
                                className={cn(
                                    'absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-[#004AC6] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-all duration-300',
                                    userType === 'admin' ? 'left-1' : 'left-[calc(50%+2px)]'
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setUserType('admin')}
                                className={cn(
                                    'relative z-10 flex-1 rounded-xl py-2 text-[12px] font-semibold tracking-[0.24px] transition-colors',
                                    userType === 'admin' ? 'text-white' : 'text-[#434655]'
                                )}
                            >
                                Administrador
                            </button>
                            <button
                                type="button"
                                onClick={() => setUserType('resident')}
                                className={cn(
                                    'relative z-10 flex-1 rounded-xl py-2 text-[12px] font-semibold tracking-[0.24px] transition-colors',
                                    userType === 'resident' ? 'text-white' : 'text-[#434655]'
                                )}
                            >
                                Residente
                            </button>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[12px] font-semibold tracking-[0.24px] text-[#434655]">
                                Correo electrónico
                            </label>
                            <div className="relative flex h-14 items-center rounded-2xl border border-[#c3c6d7] bg-[#f8f9fa] px-[17px]">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@correo.com"
                                    className="w-full bg-transparent text-[14px] text-[#191C1D] placeholder-[#6b7280] focus:outline-none"
                                />
                                <Mail size={20} className="shrink-0 text-[#6b7280]" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[12px] font-semibold tracking-[0.24px] text-[#434655]">
                                Contraseña
                            </label>
                            <div className="relative flex h-14 items-center rounded-2xl border border-[#c3c6d7] bg-[#f8f9fa] px-[17px]">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-transparent text-[14px] text-[#191C1D] placeholder-[#6b7280] focus:outline-none"
                                />
                                <Lock size={16} className="shrink-0 text-[#6b7280]" />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-lg border border-[#ffdad6] bg-[#fff1f0] p-3 text-[12px] text-[#93000a]">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col gap-4 pt-2">
                            <button
                                type="submit"
                                disabled={!isFormValid || loading}
                                className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#2563eb] text-[20px] font-semibold text-[#eeefff] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-opacity disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Ingresar'}
                            </button>

                            <div className="flex items-center justify-center gap-4">
                                <div className="h-px flex-1 bg-[#c3c6d7]" />
                                <span className="text-[11px] font-medium uppercase tracking-[1.1px] text-[#434655]">
                                    O accede con
                                </span>
                                <div className="h-px flex-1 bg-[#c3c6d7]" />
                            </div>

                            <button
                                type="button"
                                onClick={() => toast.info('La autenticación biométrica llegará pronto a la app.')}
                                className="flex h-14 w-full items-center justify-center gap-4 rounded-2xl border border-[#c3c6d7] bg-[#f8f9fa] text-[16px] text-[#191C1D]"
                            >
                                <Fingerprint size={20} className="text-[#004AC6]" />
                                Biometría
                            </button>
                        </div>
                    </form>

                    <button
                        type="button"
                        onClick={() => toast.info('Pide a tu administrador que restablezca tu contraseña, o hazlo desde la versión web.')}
                        className="pt-1 text-center text-[12px] font-semibold tracking-[0.24px] text-[#004AC6]"
                    >
                        Olvidé mi contraseña
                    </button>
                </div>

                <p className="pt-8 text-center text-[11px] text-[#434655]">
                    ¿No tienes una cuenta? <span className="font-bold text-[#004AC6]">Contacta a tu administración</span>
                </p>
            </div>
        </div>
    )
}
