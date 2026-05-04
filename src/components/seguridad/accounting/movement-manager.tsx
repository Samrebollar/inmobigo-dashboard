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
    CheckCircle2,
    Building,
    Home,
    Zap,
    Droplets,
    Shield,
    Clock,
    HandCoins,
    Users2,
    Briefcase,
    Receipt,
    Repeat,
    ArrowRight,
    AlertCircle,
    Sparkles,
    Leaf,
    Wrench,
    Minus,
    TrendingDown,
    UploadCloud,
    File as FileIcon,
    ExternalLink,
    Eye,
    Wallet,
    Scale
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { FinancialRecord, FiscalRegime, REGIME_CATEGORIES, PaymentStatus } from '@/types/accounting'
import { createFinancialRecord, deleteFinancialRecord } from '@/app/actions/accounting-server-actions'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { parse_CFDI_XML } from '@/utils/cfdi-parser'
import { parseInvoicePDF } from '@/app/actions/pdf-parser-action'

const CATEGORY_ICONS: Record<string, any> = {
    // Condominio
    'Cuotas de mantenimiento': HandCoins,
    'Recargos': AlertCircle,
    'Limpieza': Sparkles,
    'Jardinería': Leaf,
    'Mantenimiento': Wrench,
    'Seguridad': Shield,
    'Servicios (agua, luz)': Zap,
    'Administración': Briefcase,
    
    // Arrendamiento / Negocio
    'Rentas': Home,
    'Honorarios': Users2,
    'Impuestos': Receipt,
    'Otros ingresos': Plus,
    'Otros gastos': Minus
}

export function MovementManager({ 
    records, 
    regime, 
    organizationId,
    units,
    condominiums,
    onNewRecord,
    onDelete,
    selectedCondoId
}: { 
    records: any[], 
    regime: FiscalRegime,
    organizationId: string,
    units: any[],
    condominiums: any[],
    onNewRecord: (r: any) => void,
    onDelete: (id: string) => void,
    selectedCondoId: string
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<'all' | 'ingreso' | 'egreso'>('all')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [localTargetCondoId, setLocalTargetCondoId] = useState('')

    // Form State v4 - Specialized for Expenses
    const [formData, setFormData] = useState({
        type: 'egreso' as 'ingreso' | 'egreso',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        unit_id: '',
        status: 'pagado' as PaymentStatus,
        es_recurrente: false,
        frecuencia: 'mensual' as 'mensual' | 'semanal',
        dia_corte: 1,
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: '',
        use_reserve_fund: false,
        reserve_reason: 'emergencia',
        iva_amount: '0'
    })

    const [isParsing, setIsParsing] = useState(false)
    const [parsedFromCFDI, setParsedFromCFDI] = useState(false)
    const [isReviewingData, setIsReviewingData] = useState(false)

    const filteredRecords = records.filter(r => {
        const matchesSearch = r.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              r.category?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = filterType === 'all' || r.type === filterType
        return matchesSearch && matchesType
    })

    const activeCategories = regime ? REGIME_CATEGORIES[regime] : REGIME_CATEGORIES['condominio_no_lucrativo']
    const currentCategories = activeCategories?.egresos || [] // Refactored: Only Expenses allowed

    const handleCategoryChange = (cat: string) => {
        setFormData(prev => ({
            ...prev,
            category: cat,
            description: prev.description === '' ? cat : prev.description
        }))
    }

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (parseFloat(formData.amount) <= 0 || !formData.category) return

        setIsSubmitting(true)
        try {
            let receipt_url = undefined

            if (selectedFile) {
                const supabase = createClient()
                const fileExt = selectedFile.name.split('.').pop()
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
                const filePath = `${organizationId}/${selectedCondoId}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('accounting_receipts')
                    .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false })

                if (uploadError) {
                    throw new Error('Error al subir el comprobante: ' + uploadError.message)
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('accounting_receipts')
                    .getPublicUrl(filePath)
                
                receipt_url = publicUrl
            }

            const newRecord = await createFinancialRecord({
                condominium_id: selectedCondoId === 'all' ? localTargetCondoId : selectedCondoId,
                amount: parseFloat(formData.amount),
                category: formData.category,
                description: formData.description || formData.category,
                date: formData.date,
                receipt_url,
                use_reserve_fund: formData.use_reserve_fund,
                reserve_reason: formData.reserve_reason
            })
            onNewRecord(newRecord)
            setIsModalOpen(false)
            setSelectedFile(null)
            setFormData({
                type: 'egreso',
                amount: '',
                category: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                unit_id: '',
                status: 'pagado',
                es_recurrente: false,
                frecuencia: 'mensual',
                dia_corte: 1,
                fecha_inicio: new Date().toISOString().split('T')[0],
                fecha_fin: '',
                use_reserve_fund: false,
                reserve_reason: 'emergencia'
            })
        } catch (error: any) {
            console.error('Error creating record:', error)
            toast.error('Error en la operación', {
                description: error.message || 'No se pudo guardar el registro financiero.',
                duration: 5000,
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteClick = (id: string, isInvoice: boolean) => {
        if (isInvoice) {
            toast.info('Acceso Restringido', {
                description: 'Las facturas procesadas son de solo lectura. Para gestionarlas, dirígete al módulo de Facturación centralizada.',
                icon: <Shield size={16} className="text-blue-500" />
            })
            return
        }
        setRecordToDelete(id)
    }

    const confirmDelete = async () => {
        if (!recordToDelete) return
        setIsDeleting(true)
        try {
            await deleteFinancialRecord(recordToDelete)
            onDelete(recordToDelete)
        } catch (error) {
            console.error('Error deleting record:', error)
        } finally {
            setIsDeleting(false)
            setRecordToDelete(null)
        }
    }

    const canSubmit = parseFloat(formData.amount) > 0 && formData.category !== ''

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/50 p-4 rounded-[24px] border border-zinc-800">
                <div className="flex items-center gap-4 w-full md:w-auto text-sm">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input 
                            type="text"
                            placeholder="Buscar en movimientos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-10 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                        {(['all', 'ingreso', 'egreso'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-xs font-black capitalize transition-all tracking-wider",
                                    filterType === type 
                                        ? "bg-zinc-800 text-white shadow-lg" 
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {type === 'all' ? 'Ver Todo' : type === 'ingreso' ? 'Facturación (Pagada)' : 'Gastos'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-rose-600 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-rose-600/20 hover:bg-rose-500 transition-all justify-center whitespace-nowrap"
                    >
                        <Plus size={18} />
                        <span>Registrar Gasto</span>
                    </button>
                </div>
            </div>

            {/* Table / Cards View */}
            <div className="space-y-4">
                {/* Desktop View (Table) */}
                <div className="hidden lg:block bg-zinc-900/30 border border-zinc-800 rounded-[32px] overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/50">
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Propiedad</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Unidad</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Estatus</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Origen</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Categoría</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Descripción</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] text-right">Monto</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            <AnimatePresence mode="popLayout">
                                {filteredRecords.map((record) => {
                                    const CategoryIcon = record.is_invoice ? Receipt : (CATEGORY_ICONS[record.category] || FolderPlus)
                                    
                                    return (
                                        <motion.tr 
                                            key={record.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="group hover:bg-zinc-800/20 transition-colors"
                                        >
                                            {/* 1. Fecha */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                                                    <Calendar size={12} className="text-zinc-600" />
                                                    <span>{record.date}</span>
                                                </div>
                                            </td>
                                            
                                            {/* 2. Propiedad */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {record.condominium_name ? (
                                                    <div className="text-[12px] text-zinc-300 font-bold flex items-center gap-2">
                                                        <Building size={14} className="text-zinc-500" />
                                                        <span className="truncate max-w-[150px]">{record.condominium_name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-zinc-600 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* 3. Unidad */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {record.unit_number ? (
                                                    <div className="text-[12px] text-zinc-300 font-bold flex items-center gap-2">
                                                        <Home size={14} className="text-zinc-500" />
                                                        <span>{record.unit_number}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest bg-zinc-800/50 px-2 py-1 rounded-md">General</span>
                                                )}
                                            </td>

                                            {/* 4. Estatus */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={cn(
                                                    "inline-flex px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest",
                                                    record.status === 'pagado' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                                                    record.status === 'pendiente' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                                                    "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                                )}>
                                                    {record.status}
                                                </div>
                                            </td>

                                            {/* 5. Origen */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "p-2 rounded-xl border",
                                                        record.is_invoice 
                                                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                                                            : "bg-zinc-800/50 text-rose-400 border-rose-500/10"
                                                    )}>
                                                        {record.is_invoice ? <Sparkles size={14} /> : <Wrench size={14} />}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                        {record.is_invoice ? 'Facturación' : 'Manual'}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 6. Categoría */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <CategoryIcon size={14} className="text-zinc-500" />
                                                    <span className="text-[13px] font-black text-white">{record.category}</span>
                                                </div>
                                            </td>

                                            {/* 7. Descripción */}
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-zinc-400 font-medium truncate max-w-[180px]" title={record.description}>
                                                    {record.description}
                                                </p>
                                            </td>

                                            {/* 8. Monto */}
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <span className={cn(
                                                    "text-sm font-black tracking-tight",
                                                    record.type === 'ingreso' ? "text-emerald-500" : "text-rose-500"
                                                )}>
                                                    {record.type === 'ingreso' ? '+' : '-'}${Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>

                                            {/* 9. Acciones */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {record.receipt_url && (
                                                        <a 
                                                            href={record.receipt_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 bg-indigo-500/10 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 shadow-md border border-indigo-500/20"
                                                            title="Ver Comprobante"
                                                        >
                                                            <Eye size={16} className="animate-pulse" />
                                                        </a>
                                                    )}
                                                    
                                                    <button 
                                                        onClick={() => handleDeleteClick(record.id, false)}
                                                        className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 bg-rose-500/10 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 shadow-md border border-rose-500/20"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    )
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {filteredRecords.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-4 bg-zinc-900 rounded-full text-zinc-700">
                            <Search size={40} />
                        </div>
                        <div>
                            <p className="text-white font-bold">No hay movimientos registrados</p>
                            <p className="text-zinc-500 text-sm">Prueba ajustando los filtros o seleccionando otra propiedad.</p>
                        </div>
                    </div>
                )}
                </div>

                {/* Mobile View (Cards) */}
                <div className="lg:hidden space-y-4">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {filteredRecords.map((record) => {
                            const CategoryIcon = record.is_invoice ? Receipt : (CATEGORY_ICONS[record.category] || FolderPlus)
                            
                            return (
                                <motion.div
                                    key={record.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-5 relative overflow-hidden group shadow-xl"
                                >
                                    {/* Decorative Type Background */}
                                    <div className={cn(
                                        "absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-10 -translate-y-1/2 translate-x-1/2 rounded-full",
                                        record.type === 'ingreso' ? "bg-emerald-500" : "bg-rose-500"
                                    )} />

                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-12 w-12 rounded-2xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                                                record.is_invoice 
                                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                                                    : "bg-zinc-950 text-rose-500 border-rose-500/20"
                                            )}>
                                                <CategoryIcon size={24} />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-black text-white text-base tracking-tight">{record.category}</h3>
                                                    {record.is_invoice && (
                                                        <Sparkles size={12} className="text-indigo-400 animate-pulse" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                                    <Calendar size={10} className="text-zinc-600" />
                                                    <span>{record.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(
                                                "text-xl font-black tracking-tighter",
                                                record.type === 'ingreso' ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                                {record.type === 'ingreso' ? '+' : '-'}${Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                            <div className={cn(
                                                "inline-flex px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] mt-1 border",
                                                record.status === 'pagado' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                            )}>
                                                {record.status}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Propiedad</p>
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-300">
                                                <Building size={12} className="text-zinc-500" />
                                                <span className="truncate">{record.condominium_name || '-'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Unidad</p>
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-300">
                                                <Home size={12} className="text-zinc-500" />
                                                <span>{record.unit_number || 'General'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 pt-1">
                                        <p className="text-xs text-zinc-500 font-medium italic truncate flex-1 underline underline-offset-4 decoration-zinc-800">
                                            {record.description || record.category}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            {record.receipt_url && (
                                                <a 
                                                    href={record.receipt_url} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 bg-indigo-500/10 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 shadow-md border border-indigo-500/20"
                                                    title="Ver Comprobante"
                                                >
                                                    <Eye size={16} className="animate-pulse" />
                                                </a>
                                            )}
                                            <button 
                                                onClick={() => handleDeleteClick(record.id, false)} 
                                                className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 bg-rose-500/10 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 shadow-md border border-rose-500/20"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>

                {filteredRecords.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-4 bg-zinc-900 rounded-full text-zinc-700">
                            <Search size={40} />
                        </div>
                        <div>
                            <p className="text-white font-bold">No hay movimientos registrados</p>
                            <p className="text-zinc-500 text-sm">Prueba ajustando los filtros o seleccionando otra propiedad.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal for Manual Expenses ONLY */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSubmitting && setIsModalOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-zinc-900 border border-zinc-800 rounded-[32px] md:rounded-[48px] p-6 md:p-10 max-w-xl w-full shadow-2xl my-8 overflow-y-auto max-h-[90vh] scrollbar-hide"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-rose-600 rounded-3xl text-white shadow-xl shadow-rose-600/30">
                                        <TrendingDown size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-white tracking-tight leading-none">Registrar Gasto</h2>
                                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 underline decoration-rose-500 underline-offset-4">Control de Egresos Manual</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleAdd} className="space-y-6">
                                {isReviewingData && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 mb-4 flex items-start gap-4"
                                    >
                                        <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                                            <Sparkles size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-indigo-300">Datos extraídos por IA</p>
                                            <p className="text-[11px] text-indigo-300/70 leading-relaxed">Hemos rellenado los campos automáticamente basándonos en tu factura. Por favor, verifica que el Monto e IVA sean correctos antes de guardar.</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setIsReviewingData(false)}
                                            className="text-indigo-400 hover:text-white transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </motion.div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 group">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <HandCoins size={12} className="text-rose-400" />
                                            <span>Monto del Gasto</span>
                                        </label>
                                        <input 
                                            required
                                            type="number"
                                            step="0.01"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:border-rose-500/50 transition-all font-black text-2xl placeholder:opacity-20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <Calendar size={12} className="text-rose-400" />
                                            <span>Fecha</span>
                                        </label>
                                        <input 
                                            required
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:border-rose-500/50 transition-all text-sm font-bold [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <Building size={12} className={selectedCondoId === 'all' ? "text-indigo-400" : "text-rose-400"} />
                                        <span>Propiedad de Destino</span>
                                    </label>
                                    
                                    {selectedCondoId === 'all' ? (
                                        <div className="relative group">
                                            <select 
                                                required
                                                value={localTargetCondoId}
                                                onChange={(e) => setLocalTargetCondoId(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all text-sm font-bold appearance-none shadow-inner"
                                            >
                                                <option value="" disabled>Selecciona un condominio...</option>
                                                {condominiums.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={16} />
                                        </div>
                                    ) : (
                                        <div className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-4 text-zinc-400 text-sm font-bold flex items-center gap-2">
                                            <CheckCircle2 size={16} className="text-emerald-500" />
                                            <span>Gasto asociado a {condominiums.find(c => c.id === selectedCondoId)?.name || 'Propiedad Seleccionada'}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <Filter size={12} className="text-rose-400" />
                                        <span>Categoría del Gasto</span>
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {currentCategories.map(cat => {
                                            const Icon = CATEGORY_ICONS[cat] || FolderPlus
                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => handleCategoryChange(cat)}
                                                    className={cn(
                                                        "flex items-center gap-2 p-3 rounded-2xl border text-[11px] font-bold transition-all",
                                                        formData.category === cat 
                                                            ? "bg-rose-500/10 border-rose-500/50 text-white shadow-lg" 
                                                            : "bg-zinc-950/50 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                                    )}
                                                >
                                                    <Icon size={14} className={formData.category === cat ? "text-rose-400" : "text-zinc-600"} />
                                                    <span className="truncate">{cat}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Descripción corta</label>
                                    <textarea 
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Ej: Pago de reparacion de bomba de agua"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:border-rose-500/50 transition-all text-sm min-h-[80px]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1 border-rose-500">Comprobante o Factura (Opcional)</label>
                                    <div className="w-full bg-zinc-950 border border-dashed border-zinc-800 rounded-2xl p-4 transition-all hover:bg-zinc-900 overflow-hidden relative">
                                        <input 
                                            type="file" 
                                            accept=".pdf,image/jpeg,image/png,.xml"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0] || null;
                                                setSelectedFile(file);
                                                
                                                if (!file) return;

                                                if (file.name.toLowerCase().endsWith('.xml')) {
                                                    setIsParsing(true);
                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        const content = event.target?.result as string;
                                                        const data = parse_CFDI_XML(content);
                                                        if (data) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                amount: data.total.toString(),
                                                                iva_amount: data.iva.toString(),
                                                                date: data.fecha,
                                                                description: `Factura ${data.emisor}`
                                                            }));
                                                            setIsReviewingData(true);
                                                            setParsedFromCFDI(true);
                                                            toast.success('Factura analizada con éxito.');
                                                        } else {
                                                            toast.error('No se pudo parsear el CFDI');
                                                        }
                                                        setIsParsing(false);
                                                    };
                                                    reader.readAsText(file);
                                                } else if (file.name.toLowerCase().endsWith('.pdf')) {
                                                    setIsParsing(true);
                                                    try {
                                                        const pdfFormData = new FormData();
                                                        pdfFormData.append('file', file);
                                                        const result = await parseInvoicePDF(pdfFormData);
                                                        
                                                        if (result.success && result.data) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                amount: result.data!.total.toString(),
                                                                iva_amount: result.data!.iva.toString(),
                                                                date: result.data!.fecha,
                                                                description: result.data!.description
                                                            }));
                                                            setIsReviewingData(true);
                                                            setParsedFromCFDI(true);
                                                            toast.success('PDF analizado con éxito.');
                                                        } else {
                                                            toast.error(result.error || 'No se pudo extraer información del PDF');
                                                        }
                                                    } catch (err) {
                                                        toast.error('Error al procesar el PDF');
                                                    } finally {
                                                        setIsParsing(false);
                                                    }
                                                } else {
                                                    setParsedFromCFDI(false);
                                                }
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="flex flex-col items-center justify-center gap-2 pointer-events-none text-center">
                                            {isParsing ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="animate-spin text-indigo-500">
                                                        <Sparkles size={24} />
                                                    </div>
                                                    <p className="text-xs font-black text-indigo-500 uppercase tracking-widest animate-pulse">
                                                        {selectedFile?.name.toLowerCase().endsWith('.pdf') ? 'Analizando PDF con IA...' : 'Extrayendo datos SAT...'}
                                                    </p>
                                                </div>
                                            ) : selectedFile ? (
                                                <>
                                                    <div className={cn(
                                                        "p-3 rounded-full",
                                                        parsedFromCFDI ? "bg-indigo-500/10 text-indigo-400" : "bg-emerald-500/10 text-emerald-400"
                                                    )}>
                                                        <FileIcon size={24} />
                                                    </div>
                                                    <p className={cn(
                                                        "text-sm font-bold truncate w-full px-4",
                                                        parsedFromCFDI ? "text-indigo-400" : "text-emerald-400"
                                                    )}>{selectedFile.name}</p>
                                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                                        {parsedFromCFDI ? 'Validado por CFDI 4.0' : 'Listo para subir'}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-full">
                                                        <UploadCloud size={24} />
                                                    </div>
                                                    <p className="text-sm font-bold text-zinc-400">Haz clic o arrastra un archivo aquí</p>
                                                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">SOPORTA PDF, XML (CFDI), JPG, PNG</p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <Scale size={12} className="text-indigo-400" />
                                            <span>IVA Acreditable ($)</span>
                                        </label>
                                        <input 
                                            type="number"
                                            step="0.01"
                                            value={formData.iva_amount}
                                            onChange={(e) => setFormData({ ...formData, iva_amount: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-indigo-400 focus:outline-none focus:border-indigo-500/50 transition-all font-bold text-lg shadow-inner"
                                        />
                                    </div>
                                    <div className="flex items-end pb-2">
                                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl w-full">
                                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Subtotal (Calculado)</p>
                                            <p className="text-sm font-black text-white">
                                                ${(parseFloat(formData.amount || '0') - parseFloat(formData.iva_amount || '0')).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between p-5 rounded-3xl bg-amber-500/5 border border-amber-500/10 transition-all hover:bg-amber-500/10">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                                                <Wallet size={20} />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-black text-amber-200/90">Usar Fondo de Reserva</p>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Afecta saldos de contingencia</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={formData.use_reserve_fund}
                                                onChange={(e) => setFormData({...formData, use_reserve_fund: e.target.checked})}
                                            />
                                            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 peer-checked:after:bg-white"></div>
                                        </label>
                                    </div>

                                    {formData.use_reserve_fund && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            className="space-y-2 overflow-hidden"
                                        >
                                            <label className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest pl-1">Motivo del uso (Obligatorio)</label>
                                            <div className="relative">
                                                <select
                                                    required={formData.use_reserve_fund}
                                                    value={formData.reserve_reason}
                                                    onChange={(e) => setFormData({...formData, reserve_reason: e.target.value})}
                                                    className="w-full bg-zinc-950 border border-amber-500/20 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all text-sm font-bold appearance-none"
                                                >
                                                    <option value="emergencia">🆘 Emergencia</option>
                                                    <option value="mantenimiento mayor">🛠️ Mantenimiento mayor</option>
                                                    <option value="proyecto especial">✨ Proyecto especial</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500/50 pointer-events-none" size={16} />
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                                </div>

                                <button
                                    disabled={!canSubmit || isSubmitting}
                                    type="submit"
                                    className={cn(
                                        "w-full p-5 rounded-[28px] font-black transition-all duration-500 flex items-center justify-center gap-3 mt-4 text-lg",
                                        canSubmit && !isSubmitting && (selectedCondoId !== 'all' || localTargetCondoId !== '')
                                            ? "bg-rose-600 text-white shadow-2xl shadow-rose-600/30 hover:scale-[1.02] hover:bg-rose-500"
                                            : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                    )}
                                >
                                    {isSubmitting ? (
                                        <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
                                            <span>Guardar Gasto</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Delete Confirmation Modal */}
            <AnimatePresence>
                {recordToDelete && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isDeleting && setRecordToDelete(null)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-zinc-900 border border-rose-500/20 rounded-[32px] p-6 max-w-sm w-full shadow-2xl shadow-rose-500/10"
                        >
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="p-4 bg-rose-500/10 text-rose-500 rounded-full">
                                    <Trash2 size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">¿Eliminar Registro?</h3>
                                    <p className="text-sm text-zinc-400 mt-2">Esta acción no se puede deshacer. El balance financiero se actualizará automáticamente.</p>
                                </div>
                                <div className="flex gap-3 w-full mt-4">
                                    <button 
                                        onClick={() => setRecordToDelete(null)}
                                        disabled={isDeleting}
                                        className="flex-1 py-3 px-4 bg-zinc-800 text-white rounded-2xl font-bold hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={confirmDelete}
                                        disabled={isDeleting}
                                        className="flex-1 py-3 px-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50 flex items-center justify-center"
                                    >
                                        {isDeleting ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Sí, Eliminar"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

