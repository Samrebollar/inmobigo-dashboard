'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet, DollarSign, Calculator, CheckCircle2, AlertCircle, TrendingDown, TrendingUp, Save, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { Invoice } from '@/types/finance'
import { isToday, parseISO } from 'date-fns'

interface CashRegisterArqueoModalProps {
    isOpen: boolean
    onClose: () => void
    invoices: Invoice[]
    getPaymentMethod: (inv: any) => string
}

export function CashRegisterArqueoModal({ isOpen, onClose, invoices, getPaymentMethod }: CashRegisterArqueoModalProps) {
    const [selectedCondo, setSelectedCondo] = useState<string>('all')

    // Denominations State
    const [bills, setBills] = useState({
        b1000: 0,
        b500: 0,
        b200: 0,
        b100: 0,
        b50: 0,
        b20: 0
    })
    
    const [coins, setCoins] = useState({
        c10: 0,
        c5: 0,
        c2: 0,
        c1: 0
    })

    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    const supabase = createClient()

    // 1. Get unique condominiums from invoices
    const condominiums = useMemo(() => {
        const names = invoices.map(inv => inv.condominium_name).filter(Boolean) as string[]
        return Array.from(new Set(names))
    }, [invoices])

    // 2. Filter daily cash invoices
    const expectedTotal = useMemo(() => {
        return invoices.reduce((acc, inv) => {
            // Check if it's paid, cash, and today
            const isCash = getPaymentMethod(inv) === 'Efectivo'
            const isPaid = inv.status === 'paid'
            // We use paid_at if available, otherwise created_at or due_date as fallback for "today"
            const dateToUse = inv.paid_at ? parseISO(inv.paid_at) : parseISO(inv.created_at)
            const isFromToday = isToday(dateToUse)
            
            const matchesCondo = selectedCondo === 'all' || inv.condominium_name === selectedCondo

            if (isCash && isPaid && isFromToday && matchesCondo) {
                return acc + (Number(inv.amount) || 0)
            }
            return acc
        }, 0)
    }, [invoices, selectedCondo, getPaymentMethod])

    // 3. Calculate input total
    const countedTotal = useMemo(() => {
        const billsTotal = 
            (bills.b1000 * 1000) + 
            (bills.b500 * 500) + 
            (bills.b200 * 200) + 
            (bills.b100 * 100) + 
            (bills.b50 * 50) + 
            (bills.b20 * 20)
        
        const coinsTotal = 
            (coins.c10 * 10) + 
            (coins.c5 * 5) + 
            (coins.c2 * 2) + 
            (coins.c1 * 1)
            
        return billsTotal + coinsTotal
    }, [bills, coins])

    const difference = countedTotal - expectedTotal

    const handleBillChange = (key: keyof typeof bills, value: string) => {
        const num = parseInt(value) || 0
        setBills(prev => ({ ...prev, [key]: Math.max(0, num) }))
    }

    const handleCoinChange = (key: keyof typeof coins, value: string) => {
        const num = parseInt(value) || 0
        setCoins(prev => ({ ...prev, [key]: Math.max(0, num) }))
    }

    const handleSave = async () => {
        if (!selectedCondo || selectedCondo === 'all') {
            alert('Por favor, seleccione un condominio específico para guardar el arqueo.')
            return
        }

        setIsSubmitting(true)
        try {
            const { data: userData } = await supabase.auth.getUser()
            const user = userData?.user
            if (!user) throw new Error('No autorizado')

            const { data: orgUser } = await supabase
                .from('organization_users')
                .select('organization_id')
                .eq('user_id', user.id)
                .maybeSingle()
                
            if (!orgUser) throw new Error('Organización no encontrada')

            const userName = user.user_metadata?.full_name || 
                             (user.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim() : '') || 
                             'Usuario Desconocido'

            const { error } = await supabase
                .from('cash_registers')
                .insert({
                    organization_id: orgUser.organization_id,
                    condominium_name: selectedCondo,
                    expected_amount: expectedTotal,
                    counted_amount: countedTotal,
                    difference: difference,
                    notes: notes.trim(),
                    created_by: user.id,
                    created_by_name: userName
                })

            if (error) throw error

            setShowSuccess(true)
            setTimeout(() => {
                setShowSuccess(false)
                onClose()
                // Reset states
                setBills({ b1000: 0, b500: 0, b200: 0, b100: 0, b50: 0, b20: 0 })
                setCoins({ c10: 0, c5: 0, c2: 0, c1: 0 })
                setNotes('')
            }, 2000)

        } catch (error: any) {
            console.error('Error al guardar arqueo:', error)
            alert(error.message || 'Ocurrió un error al guardar el arqueo')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
                                <Calculator className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Arqueo de Caja Diario</h2>
                                <p className="text-sm text-zinc-400">Verifique el efectivo físico contra el sistema</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                        
                        {/* Left Side: Forms */}
                        <div className="w-full lg:w-3/5 p-6 overflow-y-auto border-r border-zinc-800/50 bg-zinc-950/50 [&::-webkit-scrollbar]:hidden">
                            
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Seleccione Propiedad / Condominio</label>
                                <select 
                                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    value={selectedCondo}
                                    onChange={(e) => setSelectedCondo(e.target.value)}
                                >
                                    <option value="all">Todas las propiedades</option>
                                    {condominiums.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-8">
                                {/* Billetes */}
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Wallet size={16} className="text-emerald-400" /> Billetes
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {[
                                            { label: '$1,000', key: 'b1000' },
                                            { label: '$500', key: 'b500' },
                                            { label: '$200', key: 'b200' },
                                            { label: '$100', key: 'b100' },
                                            { label: '$50', key: 'b50' },
                                            { label: '$20', key: 'b20' }
                                        ].map(bill => (
                                            <div key={bill.key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
                                                <span className="text-xs font-medium text-emerald-400">{bill.label}</span>
                                                <input 
                                                    type="number"
                                                    min="0"
                                                    value={bills[bill.key as keyof typeof bills] || ''}
                                                    onChange={(e) => handleBillChange(bill.key as keyof typeof bills, e.target.value)}
                                                    placeholder="0"
                                                    className="w-full bg-transparent border-none text-xl font-bold text-white focus:outline-none placeholder:text-zinc-700"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Monedas */}
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <DollarSign size={16} className="text-amber-400" /> Monedas
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {[
                                            { label: '$10', key: 'c10' },
                                            { label: '$5', key: 'c5' },
                                            { label: '$2', key: 'c2' },
                                            { label: '$1', key: 'c1' }
                                        ].map(coin => (
                                            <div key={coin.key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
                                                <span className="text-xs font-medium text-amber-400">{coin.label}</span>
                                                <input 
                                                    type="number"
                                                    min="0"
                                                    value={coins[coin.key as keyof typeof coins] || ''}
                                                    onChange={(e) => handleCoinChange(coin.key as keyof typeof coins, e.target.value)}
                                                    placeholder="0"
                                                    className="w-full bg-transparent border-none text-xl font-bold text-white focus:outline-none placeholder:text-zinc-700"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Observaciones */}
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        Observaciones (Opcional)
                                    </h3>
                                    <textarea 
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none h-24 placeholder:text-zinc-700"
                                        placeholder="Ingrese observaciones sobre sobrantes o faltantes..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Totals & Results */}
                        <div className="w-full lg:w-2/5 bg-zinc-900/30 p-6 flex flex-col">
                            
                            <div className="space-y-6 flex-1">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl" />
                                    <span className="text-sm font-medium text-zinc-400">Total Efectivo en Sistema (Hoy)</span>
                                    <div className="text-4xl font-black text-white mt-1">
                                        ${expectedTotal.toLocaleString()}
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-2">Suma de recibos marcados como pagados en efectivo el día de hoy.</p>
                                </div>

                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl" />
                                    <span className="text-sm font-medium text-zinc-400">Total Contado Físicamente</span>
                                    <div className="text-4xl font-black text-emerald-400 mt-1">
                                        ${countedTotal.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Result Banner */}
                            <div className="mt-8">
                                <AnimatePresence mode="wait">
                                    {difference === 0 && countedTotal > 0 ? (
                                        <motion.div
                                            key="cuadrada"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center"
                                        >
                                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-3">
                                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                            </div>
                                            <h3 className="text-xl font-bold text-emerald-400">¡La caja está cuadrada!</h3>
                                            <p className="text-emerald-500/80 text-sm mt-1">El efectivo físico coincide perfectamente con el sistema.</p>
                                        </motion.div>
                                    ) : difference > 0 ? (
                                        <motion.div
                                            key="sobra"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center"
                                        >
                                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 mb-3">
                                                <TrendingUp className="w-6 h-6 text-amber-500" />
                                            </div>
                                            <h3 className="text-xl font-bold text-amber-400">Sobra Efectivo</h3>
                                            <div className="text-2xl font-black text-amber-500 mt-1">+${difference.toLocaleString()}</div>
                                            <p className="text-amber-500/80 text-sm mt-1">Hay más efectivo físico del registrado.</p>
                                        </motion.div>
                                    ) : difference < 0 && countedTotal > 0 ? (
                                        <motion.div
                                            key="falta"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center"
                                        >
                                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/20 mb-3">
                                                <TrendingDown className="w-6 h-6 text-rose-500" />
                                            </div>
                                            <h3 className="text-xl font-bold text-rose-400">Falta Efectivo</h3>
                                            <div className="text-2xl font-black text-rose-500 mt-1">-${Math.abs(difference).toLocaleString()}</div>
                                            <p className="text-rose-500/80 text-sm mt-1">Falta efectivo para cuadrar con el sistema.</p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center"
                                        >
                                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 mb-3">
                                                <AlertCircle className="w-6 h-6 text-zinc-500" />
                                            </div>
                                            <h3 className="text-lg font-medium text-zinc-400">Esperando ingreso...</h3>
                                            <p className="text-zinc-500 text-sm mt-1">Ingrese las denominaciones contadas.</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Save Button */}
                            <div className="mt-auto pt-6 flex flex-col gap-4">
                                <button
                                    onClick={handleSave}
                                    disabled={isSubmitting || showSuccess || selectedCondo === 'all'}
                                    className="relative overflow-hidden w-full group rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] transition-all hover:bg-indigo-500 hover:shadow-[0_0_60px_-15px_rgba(79,70,229,0.7)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <AnimatePresence mode="wait">
                                        {showSuccess ? (
                                            <motion.div
                                                key="success"
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ y: -20, opacity: 0 }}
                                                className="flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle2 className="w-5 h-5" /> Arqueo Guardado
                                            </motion.div>
                                        ) : isSubmitting ? (
                                            <motion.div
                                                key="loading"
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ y: -20, opacity: 0 }}
                                                className="flex items-center justify-center gap-2"
                                            >
                                                <Loader2 className="w-5 h-5 animate-spin" /> Guardando...
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="idle"
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                exit={{ y: -20, opacity: 0 }}
                                                className="flex items-center justify-center gap-2"
                                            >
                                                <Save className="w-5 h-5" /> Guardar Arqueo
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </button>
                                {selectedCondo === 'all' && (
                                    <p className="text-xs text-rose-400 text-center -mt-2">Debe seleccionar un condominio específico para poder guardar.</p>
                                )}
                            </div>
                        </div>

                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
