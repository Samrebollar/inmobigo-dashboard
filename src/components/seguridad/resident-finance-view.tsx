'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CreditCard, Loader2, AlertCircle } from 'lucide-react'
import { TransparencyClient } from '@/components/seguridad/transparency/transparency-client'
import { getAccountingData } from '@/app/actions/accounting-server-actions'

interface ResidentFinanceViewProps {
    condominiumId: string | null
}

export function ResidentFinanceView({ condominiumId }: ResidentFinanceViewProps) {
    const [loading, setLoading] = useState(true)
    const [transparencyData, setTransparencyData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchTransparency() {
            if (!condominiumId) {
                setLoading(false)
                return
            }
            
            try {
                setLoading(true)
                const result = await getAccountingData(condominiumId)
                if (result.success) {
                    setTransparencyData(result)
                } else {
                    setError('No se pudieron cargar los datos de transparencia.')
                }
            } catch (err) {
                console.error('Error fetching transparency data:', err)
                setError('Error de conexión al cargar datos financieros.')
            } finally {
                setLoading(false)
            }
        }

        fetchTransparency()
    }, [condominiumId])

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                    <div className="absolute inset-0 blur-xl bg-indigo-500/20 rounded-full animate-pulse" />
                </div>
                <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-[0.2em] text-[10px]">Cargando Transparencia Financiera...</p>
            </div>
        )
    }

    if (!condominiumId || error || !transparencyData) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-6 text-center">
                <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center text-amber-500 shadow-2xl relative overflow-hidden">
                    <AlertCircle size={32} />
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent animate-pulse" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">Información en Proceso</h2>
                    <p className="text-zinc-500 max-w-sm mx-auto leading-relaxed font-medium">
                        Tu condominio aún no tiene datos de transparencia publicados para este periodo.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-12">
            {/* NEW TRANSPARENCY DASHBOARD */}
            <TransparencyClient data={transparencyData} isAdmin={false} />
            
            {/* PERSONAL ACTIONS (Optional but kept for functionality) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6"
            >
                <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-xl font-black text-white tracking-tight">¿Tienes un pago pendiente?</h3>
                    <p className="text-zinc-400 text-sm font-medium">Puedes realizar tu pago de mantenimiento de forma segura desde aquí.</p>
                </div>
                <Button className="h-14 px-10 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black shadow-2xl shadow-indigo-500/20 transition-all active:scale-95 group">
                    <CreditCard size={20} className="mr-3 group-hover:rotate-12 transition-transform" />
                    IR A PAGAR
                </Button>
            </motion.div>
        </div>
    )
}

