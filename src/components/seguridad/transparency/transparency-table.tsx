'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight, Calendar, Tag, FileText } from 'lucide-react'
import { clsx } from 'clsx'

interface Movement {
    id: string
    date: string
    category: string
    description: string
    type: 'ingreso' | 'egreso'
    amount: number
}

interface TransparencyTableProps {
    movements: Movement[]
}

export function TransparencyTable({ movements }: TransparencyTableProps) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white/[0.02] border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-xl"
        >
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black text-white tracking-tight">Detalle de Movimientos</h3>
                    <p className="text-zinc-500 text-sm">Registro histórico de todas las transacciones financieras del condominio.</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.01]">
                            <th className="px-8 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Fecha</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Descriptor</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categoría</th>
                            <th className="px-8 py-4 text-center text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tipo</th>
                            <th className="px-8 py-4 text-right text-[10px] font-black text-zinc-500 uppercase tracking-widest">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {movements.length > 0 ? (
                            movements.map((movement, index) => (
                                <motion.tr 
                                    key={movement.id || index}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group hover:bg-white/[0.03] transition-colors"
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                                            <Calendar size={14} className="opacity-40" />
                                            {new Date(movement.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <FileText size={14} className="text-zinc-600" />
                                            <span className="text-sm font-bold text-white max-w-[200px] truncate">{movement.description}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                                            <span className="text-xs font-bold text-zinc-400 capitalize">{movement.category}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex justify-center">
                                            <span className={clsx(
                                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                                movement.type === 'ingreso' 
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                            )}>
                                                {movement.type === 'ingreso' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                                {movement.type}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-sm text-white">
                                        ${movement.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </td>
                                </motion.tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center text-zinc-500 font-bold text-sm">
                                    No se encontraron movimientos financieros registrados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    )
}

