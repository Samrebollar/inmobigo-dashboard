'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
    Wallet, 
    Target, 
    TrendingUp, 
    Zap, 
    PlusCircle, 
    ArrowUpCircle, 
    ArrowDownCircle,
    Calendar,
    AlertTriangle,
    Info,
    ChevronDown,
    Settings,
    Pencil,
    Trash2
} from 'lucide-react'
import { ReserveFund, ReserveFundTransaction } from '@/types/accounting'
import { ConfigureFundModal } from './configure-fund-modal'
import { cn } from '@/lib/utils'
import { DeleteTransactionModal } from './delete-transaction-modal'
import { EditTransactionModal } from './edit-transaction-modal'

interface ReserveFundModuleProps {
    fundData: {
        fund: ReserveFund | null;
        transactions: ReserveFundTransaction[];
        exists: boolean;
    }
    condominiumId: string
    isAdmin?: boolean
}

export function ReserveFundModule({ fundData, condominiumId, isAdmin = false }: ReserveFundModuleProps) {
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedTx, setSelectedTx] = useState<ReserveFundTransaction | null>(null)
    const { fund, transactions, exists } = fundData
    
    const balance = Number(fund?.balance || 0)
    const target = Number(fund?.target_amount || 0)
    const progress = target > 0 ? Math.min(100, (balance / target) * 100) : 0
    const isWarning = target > 0 && progress < 50

    const cards = [
        {
            title: "Saldo del Fondo",
            value: `$${balance.toLocaleString()}`,
            description: "Dinero disponible para contingencias",
            icon: Wallet,
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
            border: "border-cyan-500/20"
        },
        {
            title: "Meta Recomendada",
            value: `$${target.toLocaleString()}`,
            description: "Nivel ideal según el tamaño del condominio",
            icon: Target,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20"
        },
        {
            title: "Progreso",
            value: `${progress.toFixed(1)}%`,
            description: "Avance hacia el fondo ideal",
            icon: TrendingUp,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
            isProgress: true
        },
        {
            title: "Aportación Mensual",
            value: fund ? (fund.contribution_type === 'percentage' ? `${fund.contribution_value}%` : `$${fund.contribution_value.toLocaleString()}`) : 'No config.',
            description: "Ahorro automático mensual",
            icon: Zap,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20"
        }
    ]

    return (
        <div className="space-y-8 py-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <Wallet size={20} />
                        </div>
                        <h3 className="text-2xl font-black text-white tracking-tight">Fondo de Reserva</h3>
                    </div>
                    <p className="text-zinc-500 text-sm max-w-2xl px-1">
                        Asegura la estabilidad financiera del condominio mediante ahorros estratégicos para emergencias y proyectos futuros.
                    </p>
                </div>

                {isAdmin && (
                    <button 
                        onClick={() => condominiumId !== 'all' ? setIsConfigModalOpen(true) : null}
                        disabled={condominiumId === 'all'}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all text-xs group shadow-lg",
                            condominiumId === 'all' 
                                ? "bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50"
                                : "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                        )}
                    >
                        <Settings size={14} className={cn(condominiumId !== 'all' && "group-hover:rotate-45 transition-transform")} />
                        <span>{condominiumId === 'all' ? 'Selecciona una propiedad' : 'Configurar Fondo'}</span>
                    </button>
                )}
            </div>

            {/* Smart Alert */}
            {isWarning && (
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-5 rounded-[2rem] bg-amber-500/5 border border-amber-500/20 flex items-center gap-4"
                >
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-200/90">El fondo de reserva está por debajo del nivel recomendado.</p>
                        <p className="text-[10px] text-amber-500/60 uppercase font-black tracking-widest mt-0.5 text-zinc-500">Se sugiere incrementar las aportaciones mensuales para garantizar la estabilidad.</p>
                    </div>
                </motion.div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        className={cn(
                            "relative overflow-hidden p-6 rounded-[2.5rem] border bg-white/[0.01] backdrop-blur-xl transition-all duration-300",
                            card.border
                        )}
                    >
                        <div className="flex flex-col gap-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", card.bg, card.color)}>
                                <card.icon size={24} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{card.title}</p>
                                <h4 className={cn("text-2xl font-black tracking-tight", card.color)}>{card.value}</h4>
                            </div>
                            
                            {card.isProgress && (
                                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className="h-full bg-emerald-500" 
                                    />
                                </div>
                            )}

                            <p className="text-[10px] text-zinc-500 font-medium leading-tight">
                                {card.description}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* History Section */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h4 className="text-sm font-black text-zinc-300 uppercase tracking-widest px-2">Historial de Operaciones</h4>
                    <div className="p-2 px-4 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                        Últimos movimientos
                    </div>
                </div>

                {/* Desktop view (Table) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white/[0.01] border-b border-white/5">
                                <th className="px-8 py-4 text-left text-[9px] font-black text-zinc-500 uppercase tracking-widest">Fecha</th>
                                <th className="px-8 py-4 text-left text-[9px] font-black text-zinc-500 uppercase tracking-widest">Tipo</th>
                                <th className="px-8 py-4 text-left text-[9px] font-black text-zinc-500 uppercase tracking-widest">Motivo / Descripción</th>
                                <th className="px-8 py-4 text-right text-[9px] font-black text-zinc-500 uppercase tracking-widest">Monto</th>
                                {isAdmin && (
                                    <th className="px-8 py-4 text-center text-[9px] font-black text-zinc-500 uppercase tracking-widest">Acciones</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.length > 0 ? (
                                transactions.map((tx, idx) => (
                                    <tr key={tx.id || idx} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                                                <Calendar size={12} className="opacity-40" />
                                                {new Date(tx.created_at).toLocaleDateString('es-MX')}
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                tx.type === 'deposit' 
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                            )}>
                                                {tx.type === 'deposit' ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                                                {tx.type === 'deposit' ? 'Aportación' : 'Retiro'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="space-y-0.5">
                                                <p className="text-[12px] font-bold text-white capitalize">{tx.reason}</p>
                                                {tx.description && <p className="text-[10px] text-zinc-500 font-medium">{tx.description}</p>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <span className={cn(
                                                "text-sm font-black tracking-tight",
                                                tx.type === 'deposit' ? "text-emerald-400" : "text-rose-400"
                                            )}>
                                                {tx.type === 'deposit' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-8 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button 
                                                        className="p-1.5 rounded-xl text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all duration-200 hover:scale-110"
                                                        title="Editar"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTx(tx);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button 
                                                        className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 hover:scale-110"
                                                        title="Eliminar"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTx(tx);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : null}
                        </tbody>
                    </table>
                </div>

                {/* Mobile view (Cards) */}
                <div className="md:hidden p-4 space-y-4">
                    {transactions.length > 0 ? (
                        transactions.map((tx, idx) => (
                            <motion.div 
                                key={tx.id || idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 space-y-4 relative overflow-hidden"
                            >
                                <div className={cn(
                                    "absolute top-0 right-0 w-20 h-20 blur-3xl opacity-10 rounded-full translate-x-1/2 -translate-y-1/2",
                                    tx.type === 'deposit' ? "bg-emerald-500" : "bg-rose-500"
                                )} />

                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl border flex items-center justify-center",
                                            tx.type === 'deposit' 
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                        )}>
                                            {tx.type === 'deposit' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">
                                                {tx.type === 'deposit' ? 'Aportación' : 'Retiro'}
                                            </p>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400">
                                                <Calendar size={10} className="opacity-40" />
                                                {new Date(tx.created_at).toLocaleDateString('es-MX')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={cn(
                                            "text-lg font-black tracking-tighter",
                                            tx.type === 'deposit' ? "text-emerald-400" : "text-rose-400"
                                        )}>
                                            {tx.type === 'deposit' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h5 className="text-[13px] font-black text-white capitalize tracking-tight">{tx.reason}</h5>
                                    {tx.description && <p className="text-[11px] text-zinc-500 font-medium leading-relaxed italic">"{tx.description}"</p>}
                                </div>
                            </motion.div>
                        ))
                    ) : null}
                </div>

                {/* Empty State */}
                {transactions.length === 0 && (
                    <div className="py-20 text-center space-y-3">
                        <div className="p-4 bg-zinc-950 rounded-full w-fit mx-auto text-zinc-800">
                            <Info size={32} />
                        </div>
                        <div>
                            <p className="text-zinc-500 font-bold text-sm">No se registran operaciones en el fondo de reserva.</p>
                            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Las aportaciones automáticas se verán reflejadas aquí.</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-6">
                <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 shrink-0">
                    <Info size={24} />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-bold text-indigo-200/90">Gestión de Continuidad</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                        Un fondo de reserva sólido evita cuotas extraordinarias y garantiza la continuidad operativa del condominio. 
                        Este fondo es administrado para garantizar transparencia total.
                    </p>
                </div>
            </div>

            <ConfigureFundModal 
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                condominiumId={condominiumId}
                currentConfig={fund}
            />

            <DeleteTransactionModal 
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedTx(null);
                }}
                transaction={selectedTx}
            />

            <EditTransactionModal 
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedTx(null);
                }}
                transaction={selectedTx}
            />
        </div>
    )
}

