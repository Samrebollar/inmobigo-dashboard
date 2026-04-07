'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { checkResidentPreApprovalAction, registerResidentAction } from '@/app/actions/resident-actions'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Loader2, ArrowRight, Building2, Home, User, Phone, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

function RegisterFormContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [userType, setUserType] = useState<'admin' | 'resident'>('admin')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        password: '',
        orgName: '' // Only for admin
    })

    useEffect(() => {
        const typeParam = searchParams.get('type')
        if (typeParam === 'resident') {
            setUserType('resident')
        }
    }, [searchParams])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

        try {
            const cleanEmail = formData.email.trim().toLowerCase();
            
            // 1. Pre-validation for Residents (Closed Access)
            if (userType === 'resident') {
                console.log('🔍 Iniciando verificación para residente:', cleanEmail);
                const { exists, registered } = await checkResidentPreApprovalAction(cleanEmail);
                console.log('📊 Resultado verificación:', { exists, registered });
                
                if (!exists) {
                    throw new Error(`El correo ${cleanEmail} no está en la lista de residentes pre-aprobados. Por favor, contacta a tu administración.`);
                }
                
                if (registered) {
                    throw new Error('Este correo ya ha completado su registro. Por favor, usa la opción de Iniciar Sesión.');
                }
            }

            // 2. REGISTRATION FLOW
            if (userType === 'resident') {
                // Use the custom server action for residents to handle database conflicts
                const regResult = await registerResidentAction(formData);
                
                if (!regResult.success) {
                    const errorObj = regResult.error as any;
                    const error = new Error(errorObj.message || 'Error al registrar.');
                    (error as any).code = errorObj.code;
                    (error as any).status = errorObj.status;
                    (error as any).details = errorObj.details;
                    (error as any).hint = errorObj.hint;
                    throw error;
                }

                // If registration was successful, we need to sign in manually 
                // because admin.createUser doesn't establish a client session.
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password: formData.password
                });

                if (signInError) {
                    console.warn('Registro exitoso pero falló el inicio de sesión automático:', signInError);
                    router.push('/login?registered=true');
                    return;
                }
            } else {
                // Standard flow for Admins
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: cleanEmail,
                    password: formData.password,
                    options: {
                        data: {
                            first_name: formData.firstName,
                            last_name: formData.lastName,
                            full_name: `${formData.firstName} ${formData.lastName}`,
                            phone: formData.phone,
                            role: userType,
                            user_type: userType
                        }
                    }
                })

                if (authError) throw authError;
                if (!authData.user) throw new Error('No se pudo crear el usuario.');
            }

            // 3. Success -> Redirect
            router.push('/dashboard')

        } catch (err: any) {
            // 🔍 ESTRATEGIA DE LOGGING AVANZADA (Solicitada por el Usuario)
            console.error("RAW ERROR:", err);
            
            // Serialización manual para evitar el objeto vacío {}
            const serializableError = {
                message: err.message || "Error desconocido",
                code: err.code || err.status || "UNKNOWN",
                details: err.details || null,
                hint: err.hint || null,
                stack: err.stack
            };
            
            console.error("ERROR STRING:", JSON.stringify(serializableError, null, 2));
            console.error("ERROR MESSAGE:", err.message);
            console.error("ERROR CODE:", err.code || err.status);

            // Extraer mensaje amigable para la UI
            let errorMessage = err.message || 'Error al registrar usuario.';
            
            // Si el error viene de nuestra Action (serializado)
            if (err.info?.error?.message) {
                errorMessage = err.info.error.message;
            }

            setError(errorMessage);
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const isFormValid =
        formData.email.length > 0 &&
        formData.password.length > 0 &&
        formData.firstName.length > 0

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

                {/* User Type Toggle */}
                <div className="grid grid-cols-2 p-1 bg-black/40 rounded-xl mb-1 relative">
                    <div
                        className={cn(
                            "absolute inset-y-1 w-[calc(50%-4px)] bg-zinc-800/80 rounded-lg shadow-sm transition-all duration-300 ease-spring",
                            userType === 'admin' ? "left-1" : "left-[calc(50%+2px)]"
                        )}
                    />
                    <button
                        type="button"
                        onClick={() => setUserType('admin')}
                        className={cn(
                            "relative z-10 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors duration-200",
                            userType === 'admin' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <Building2 size={16} />
                        <span>Administrador</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setUserType('resident')}
                        className={cn(
                            "relative z-10 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors duration-200",
                            userType === 'resident' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <Home size={16} />
                        <span>Residente</span>
                    </button>
                </div>

                <div className="p-6 pt-4">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
                            Crear cuenta
                        </h1>
                        <p className="text-sm text-zinc-400">
                            {userType === 'admin'
                                ? 'Empieza a gestionar tu condominio hoy.'
                                : 'Únete a tu comunidad digital.'}
                        </p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4 relative z-10">

                        {/* NAME FIELDS */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-400 ml-1">Nombre</label>
                                <div className="relative group/input">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within/input:text-indigo-400 transition-colors" />
                                    <input
                                        name="firstName"
                                        type="text"
                                        required
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white placeholder-zinc-600 focus:border-indigo-500/50 focus:bg-indigo-950/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                        placeholder="Juan"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-400 ml-1">Apellido</label>
                                <div className="relative group/input">
                                    <input
                                        name="lastName"
                                        type="text"
                                        required
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 px-3 text-sm text-white placeholder-zinc-600 focus:border-indigo-500/50 focus:bg-indigo-950/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                        placeholder="Pérez"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* CONTACT */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400 ml-1">Teléfono</label>
                            <div className="relative group/input">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within/input:text-indigo-400 transition-colors" />
                                <input
                                    name="phone"
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white placeholder-zinc-600 focus:border-indigo-500/50 focus:bg-indigo-950/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                    placeholder="+52 55..."
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
                                        <span>Creando cuenta...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Registrarse</span>
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
                            ¿Ya tienes cuenta?{' '}
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
