'use client'

import { motion } from 'framer-motion'
import { Lock, CreditCard, Mail, ArrowRight, ShieldAlert, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface SubscriptionLockProps {
    role: 'admin' | 'resident' | 'security' | 'staff' | string
}

export function SubscriptionLock({ role }: SubscriptionLockProps) {
    const isAdmin = ['admin', 'owner', 'admin_condominio', 'admin_propiedad'].includes(role)

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-[0_0_100px_-20px_rgba(79,70,229,0.3)]"
            >
                {/* Background Glow */}
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-indigo-500/20 blur-[100px]" />
                <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-rose-500/10 blur-[100px]" />

                <div className="relative z-10 p-8 sm:p-10 flex flex-col items-center text-center">
                    
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 shadow-xl relative"
                    >
                        {isAdmin ? (
                            <CreditCard className="h-10 w-10 text-indigo-400" />
                        ) : (
                            <Lock className="h-10 w-10 text-rose-400" />
                        )}
                        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 border border-zinc-800">
                            <ShieldAlert className={cn("h-4 w-4", isAdmin ? "text-indigo-500" : "text-rose-500")} />
                        </div>
                    </motion.div>

                    <h2 className="mb-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
                        {isAdmin ? 'Suscripción Expirada' : 'Acceso Restringido'}
                    </h2>
                    
                    <p className="mb-8 text-zinc-400 text-sm sm:text-base leading-relaxed max-w-sm">
                        {isAdmin ? (
                            <>
                                Su plan premium ha llegado a su fin. Para seguir operando InmobiGo y mantener el acceso de sus residentes, renueve su suscripción ahora.
                            </>
                        ) : (
                            <>
                                El sistema ha sido bloqueado temporalmente debido al estado de la suscripción del condominio. <strong className="text-zinc-300">Por favor, comuníquese con la administración</strong> para restaurar el acceso.
                            </>
                        )}
                    </p>

                    {isAdmin ? (
                        <div className="w-full space-y-4">
                            <Link href="/dashboard/configuracion?tab=billing" className="block w-full">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] transition-all hover:bg-indigo-500 hover:shadow-[0_0_60px_-15px_rgba(79,70,229,0.7)]"
                                >
                                    <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                                        <div className="relative h-full w-8 bg-white/20" />
                                    </div>
                                    <span>Ir a Facturación y Pagos</span>
                                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </motion.button>
                            </Link>
                            
                            <p className="text-xs text-zinc-500 flex items-center justify-center gap-2">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>Al renovar, el acceso se restaurará instantáneamente para todos.</span>
                            </p>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center">
                            <div className="flex items-center gap-3 rounded-xl bg-zinc-900/50 border border-white/5 px-6 py-4 w-full justify-center">
                                <Mail className="h-5 w-5 text-zinc-400" />
                                <span className="text-sm font-medium text-zinc-300">Contactar Administración</span>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
