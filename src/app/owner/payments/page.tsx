'use client'

import { motion } from 'framer-motion'
import { CreditCard, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PaymentsPage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Historial de Pagos</h1>
                    <p className="text-zinc-500 font-medium">Registro global de transacciones de la plataforma.</p>
                </div>
                <Button className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-2xl p-6 font-bold flex items-center gap-2">
                    <ShieldCheck size={18} />
                    Configurar Webhooks
                </Button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 min-h-[500px] flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-20 w-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 mb-4">
                    <CreditCard size={40} />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">Registro de Transacciones</h3>
                <p className="text-zinc-500 max-w-md mx-auto">Aquí aparecerán todos los cobros de suscripciones procesados por Stripe y MercadoPago.</p>
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm pt-6">
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex items-center gap-3">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Sincronizado</span>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex items-center gap-3">
                        <Clock size={16} className="text-amber-400" />
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">En Tiempo Real</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
