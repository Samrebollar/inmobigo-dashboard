'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Search, 
    Filter, 
    Plus, 
    Trash2, 
    Calendar, 
    ChevronDown, 
    ArrowUpCircle, 
    ArrowDownCircle,
    X,
    FolderPlus,
    CheckCircle2
} from 'lucide-react'
import { FinancialRecord, FiscalRegime, REGIME_CATEGORIES } from '@/types/accounting'
import { createFinancialRecord, deleteFinancialRecord } from '@/app/actions/accounting-server-actions'
import { cn } from '@/lib/utils'

export function MovementManager({ 
    records, 
    regime, 
    organizationId,
    onNewRecord,
    onDelete
}: { 
    records: FinancialRecord[], 
    regime: FiscalRegime,
    organizationId: string,
    onNewRecord: (r: FinancialRecord) => void,
    onDelete: (id: string) => void
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<'all' | 'ingreso' | 'egreso'>('all')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        type: 'ingreso' as 'ingreso' | 'egreso',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    })

    const filteredRecords = records.filter(r => {
        const matchesSearch = r.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              r.category.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = filterType === 'all' || r.type === filterType
        return matchesSearch && matchesType
    })

    const activeCategories = regime ? REGIME_CATEGORIES[regime] : { ingresos: [], egresos: [] }
    const currentCategories = formData.type === 'ingreso' ? activeCategories.ingresos : activeCategories.egresos

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.amount || !formData.category) return

        setIsSubmitting(true)
        try {
            const newRecord = await createFinancialRecord({
                organization_id: organizationId,
                type: formData.type,
                amount: parseFloat(formData.amount),
                category: formData.category,
                description: formData.description || formData.category,
                date: formData.date
            })
            onNewRecord(newRecord)
            setIsModalOpen(false)
            setFormData({
                type: 'ingreso',
                amount: '',
                category: '',
                description: '',
                date: new Date().toISOString().split('T')[0]
            })
        } catch (error) {
            console.error('Error creating record:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este registro?')) return
        try {
            await deleteFinancialRecord(id)
            onDelete(id)
        } catch (error) {
            console.error('Error deleting record:', error)
        }
    }

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/50 p-4 rounded-[24px] border border-zinc-800">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input 
                            type="text"
                            placeholder="Buscar movimientos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-10 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                        />
                    </div>
                    <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                        {(['all', 'ingreso', 'egreso'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                                    filterType === type 
                                        ? "bg-zinc-800 text-white shadow-lg" 
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {type === 'all' ? 'Todos' : type}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all w-full md:w-auto justify-center"
                >
                    <Plus size={18} />
                    <span>Nuevo Movimiento</span>
                </button>
            </div>

            {/* Table */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-[32px] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/50">
                                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Fecha</th>
                                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Categoría</th>
                                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Descripción</th>
                                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest text-right">Monto</th>
                                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            <AnimatePresence mode="popLayout">
                                {filteredRecords.map((record) => (
                                    <motion.tr 
                                        key={record.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="group hover:bg-zinc-800/20 transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Calendar size={14} className="text-zinc-600" />
                                                <span className="text-sm font-medium text-zinc-400">{record.date}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {record.type === 'ingreso' ? (
                                                    <ArrowUpCircle size={16} className="text-emerald-500" />
                                                ) : (
                                                    <ArrowDownCircle size={16} className="text-rose-500" />
                                                )}
                                                <span className="text-sm font-bold text-white">{record.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-zinc-500 truncate max-w-xs">{record.description}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={cn(
                                                "text-sm font-black",
                                                record.type === 'ingreso' ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                                {record.type === 'ingreso' ? '+' : '-'}${record.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleDelete(record.id)}
                                                className="p-2 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                            {filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-600 text-sm italic">
                                        No se encontraron movimientos registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSubmitting && setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 max-w-lg w-full shadow-2xl space-y-6"
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
                                        <FolderPlus size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight">Nuevo Registro</h2>
                                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Flujo Financiero</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleAdd} className="space-y-4">
                                <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
                                    {(['ingreso', 'egreso'] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type, category: '' })}
                                            className={cn(
                                                "py-3 rounded-xl text-sm font-black capitalize transition-all",
                                                formData.type === type 
                                                    ? (type === 'ingreso' ? "bg-emerald-600 text-white shadow-lg" : "bg-rose-600 text-white shadow-lg")
                                                    : "text-zinc-500 hover:bg-zinc-900"
                                            )}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest pl-1">Monto (MXN)</label>
                                        <input 
                                            required
                                            type="number"
                                            step="0.01"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-black text-lg"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest pl-1">Fecha</label>
                                        <input 
                                            required
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest pl-1">Categoría</label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm appearance-none"
                                    >
                                        <option value="" disabled>Seleccionar categoría...</option>
                                        {currentCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest pl-1">Descripción (Opcional)</label>
                                    <textarea 
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Ej: Pago de cuota de mantenimiento depto 201"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm min-h-[100px]"
                                    />
                                </div>

                                <button
                                    disabled={isSubmitting}
                                    type="submit"
                                    className="w-full bg-indigo-600 text-white p-5 rounded-[24px] font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 mt-4"
                                >
                                    {isSubmitting ? (
                                        <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="hidden" /> {/* Not using it but good to have in ref */}
                                            <span>Guardar Movimiento</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
