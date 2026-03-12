'use client'

import { motion } from 'framer-motion'
import { 
    CreditCard, 
    Calendar, 
    Download, 
    ExternalLink, 
    ChevronRight,
    Bell,
    CheckCircle2,
    Clock,
    DollarSign,
    ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ResidentPaymentsClientProps {
    resident: any
}

export default function ResidentPaymentsClient({ resident }: ResidentPaymentsClientProps) {
    const paymentHistory = [
        {
            date: '03 Mar 2026',
            concept: 'Cuota de mantenimiento',
            amount: '$2,500',
            status: 'Pagado',
            color: 'emerald'
        },
        {
            date: '05 Feb 2026',
            concept: 'Cuota de mantenimiento',
            amount: '$2,500',
            status: 'Pagado',
            color: 'emerald'
        },
        {
            date: '05 Ene 2026',
            concept: 'Cuota de mantenimiento',
            amount: '$2,500',
            status: 'Pagado',
            color: 'emerald'
        }
    ]

    return (
        <div className="mx-auto max-w-7xl space-y-10 p-6 md:p-10 animate-in fade-in duration-500">
            {/* Page Header */}
            <div>
                <h1 className="text-4xl font-black text-white tracking-tight">Pagos</h1>
            </div>

            {/* Pending Balance Hero Card */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-[#1a1c2e] to-indigo-950/40 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl group"
            >
                <div className="absolute top-0 right-0 -m-20 h-80 w-80 bg-blue-600/10 rounded-full blur-[100px] group-hover:bg-blue-600/20 transition-colors duration-700" />
                <div className="absolute bottom-0 left-0 -m-20 h-60 w-60 bg-indigo-600/10 rounded-full blur-[80px]" />

                <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
                    <div className="flex-1 space-y-8 w-full">
                        <div className="space-y-4">
                            <motion.h2 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-2xl font-bold text-zinc-400"
                            >
                                Saldo pendiente
                            </motion.h2>
                            <div className="space-y-2">
                                <motion.h3 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, delay: 0.3 }}
                                    className="text-7xl font-black text-white tracking-tighter"
                                >
                                    $2,500
                                </motion.h3>
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="inline-flex items-center px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-sm font-bold border border-amber-500/20"
                                >
                                    Vence el 5 Abril
                                </motion.div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button className="bg-blue-600 hover:bg-blue-500 text-white h-16 px-10 rounded-2xl text-xl font-black shadow-xl shadow-blue-600/20 transition-all flex items-center gap-4 w-full sm:w-auto relative overflow-hidden group/btn">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] transition-transform" />
                                    Pagar ahora
                                    <ChevronRight className="h-6 w-6 group-hover/btn:translate-x-1 transition-transform" />
                                </Button>
                            </motion.div>
                            
                            <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium">
                                <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-3 w-3 text-blue-400" />
                                </div>
                                Pago seguro con MercadoPago
                            </div>
                        </div>
                    </div>

                    {/* Illustration Placeholder - Representing the mockup image */}
                    <div className="relative flex-1 hidden lg:flex justify-center items-center">
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 rounded-full blur-3xl" />
                        <div className="relative z-10 scale-110">
                            {/* Simple visual representation of mockup elements */}
                            <div className="relative h-64 w-80">
                                <motion.div 
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute top-0 right-0 h-48 w-32 bg-zinc-800 rounded-3xl border border-zinc-700 shadow-2xl p-4 transform rotate-12"
                                >
                                    <div className="h-full w-full bg-zinc-900 rounded-2xl overflow-hidden p-2 flex flex-col gap-2">
                                        <div className="h-4 w-full bg-zinc-800 rounded-lg" />
                                        <div className="h-20 w-full bg-indigo-600/20 rounded-lg flex items-center justify-center">
                                            <CheckCircle2 className="h-10 w-10 text-indigo-400" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-2 w-3/4 bg-zinc-800 rounded-lg" />
                                            <div className="h-2 w-1/2 bg-zinc-800 rounded-lg" />
                                        </div>
                                    </div>
                                </motion.div>
                                <motion.div 
                                    animate={{ y: [0, 10, 0] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                    className="absolute bottom-0 left-0 h-40 w-56 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl p-6 transform -rotate-6"
                                >
                                    <div className="h-8 w-14 bg-amber-400/20 rounded-lg mb-4" />
                                    <div className="h-4 w-32 bg-zinc-700 rounded-lg mb-2" />
                                    <div className="h-2 w-20 bg-zinc-800 rounded-lg" />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Payment History Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Clock className="h-6 w-6 text-indigo-400" />
                        Historial de pagos
                    </h2>
                    <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800/50 flex items-center gap-2 font-bold px-4">
                        Ver todo
                    </Button>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl"
                >
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800/50 bg-zinc-900/50">
                                <th className="px-8 py-6 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Fecha</th>
                                <th className="px-8 py-6 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Concepto</th>
                                <th className="px-8 py-6 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Monto</th>
                                <th className="px-8 py-6 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Estado</th>
                                <th className="px-8 py-6 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentHistory.map((payment, i) => (
                                <motion.tr 
                                    key={i} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 + (i * 0.1) }}
                                    className="group hover:bg-indigo-500/[0.03] transition-colors border-b border-zinc-800/30 last:border-0 font-medium"
                                >
                                    <td className="px-8 py-6 text-white text-base group-hover:text-indigo-400 transition-colors">{payment.date}</td>
                                    <td className="px-8 py-6 text-zinc-400 text-base">{payment.concept}</td>
                                    <td className="px-8 py-6 text-white font-black text-xl">{payment.amount}</td>
                                    <td className="px-8 py-6">
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-xl font-bold">
                                            {payment.status}
                                        </Badge>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-6 text-sm font-bold text-zinc-500">
                                            <button className="hover:text-white transition-all flex items-center gap-2 group/act">
                                                <Download className="h-4 w-4 group-hover/act:translate-y-0.5 transition-transform" />
                                                Ver recibo
                                            </button>
                                            <span className="text-zinc-800 text-xl font-light">/</span>
                                            <button className="hover:text-white transition-all flex items-center gap-2 group/pdf">
                                                <Download className="h-4 w-4 group-hover/pdf:scale-110 transition-transform" />
                                                PDF
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            </div>

            {/* Bottom Tracker Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ y: -5, borderColor: 'rgba(79, 70, 229, 0.3)' }}
                className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl transition-all duration-300 relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex-1 w-full space-y-4 relative z-10">
                    <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-zinc-400 text-base">Tu próximo pago vence en <span className="text-amber-500 animate-pulse">5 días</span></span>
                        <span className="text-indigo-400">80% completado</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden shadow-inner p-1">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '80%' }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 1 }}
                            className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                        />
                    </div>
                </div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" className="border-indigo-500/30 bg-indigo-500/5 text-indigo-300 font-black h-14 rounded-2xl flex items-center gap-3 px-8 hover:bg-indigo-600 hover:text-white transition-all shadow-lg group-hover:shadow-indigo-600/20 relative z-10">
                        <Bell className="h-5 w-5" />
                        Configurar recordatorio
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    )
}
