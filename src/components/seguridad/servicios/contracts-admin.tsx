'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    FileText, 
    Calendar, 
    DollarSign, 
    Clock, 
    Download, 
    Edit2, 
    Trash2, 
    Plus,
    User,
    Building2,
    Eye,
    AlertCircle,
    CheckCircle2
} from 'lucide-react'
import { format, isAfter, isBefore, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { demoDb } from '@/utils/demo-db'
import { CreateContractModal } from './create-contract-modal'
import { ContractPreviewModal } from './contract-preview-modal'

interface Contract {
    id: string
    tenant_name: string
    property_name: string
    monthly_rent: number
    start_date: string
    end_date: string
    status: 'active' | 'expiring' | 'expired'
    deposit?: number
    notes?: string
    property_id: string
    resident_id: string
}

export function ContractsAdmin({ admin }: { admin: any }) {
    const [contracts, setContracts] = useState<Contract[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [editingContract, setEditingContract] = useState<Contract | null>(null)
    const [previewContract, setPreviewContract] = useState<Contract | null>(null)

    useEffect(() => {
        fetchContracts()
    }, [])

    const fetchContracts = () => {
        setLoading(true)
        const data = demoDb.getContracts()
        setContracts(data)
        setLoading(false)
    }

    const handleDelete = (id: string) => {
        if (confirm('¿Estás seguro de eliminar este contrato?')) {
            demoDb.deleteContract(id)
            setContracts(prev => prev.filter(c => c.id !== id))
            toast.success('Contrato eliminado')
        }
    }

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'active':
                return { bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'Activo' }
            case 'expiring':
                return { bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Por vencer' }
            case 'expired':
                return { bg: 'bg-rose-500/10 text-rose-500 border-rose-500/20', label: 'Vencido' }
            default:
                return { bg: 'bg-zinc-800 text-zinc-400 border-zinc-700', label: 'Desconocido' }
        }
    }

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-64 bg-zinc-900/40 border border-zinc-800 rounded-[2rem] animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Gestión de Contratos</h2>
                        <p className="text-xs text-zinc-500 font-medium">Administra los periodos de renta y vigencia de tus propiedades.</p>
                    </div>
                </div>
                <Button 
                    onClick={() => {
                        setEditingContract(null)
                        setIsModalOpen(true)
                    }}
                    className="h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl px-6 flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                >
                    <Plus size={20} />
                    <span>Nuevo Contrato</span>
                </Button>
            </div>

            {contracts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-4 border-2 border-dashed border-zinc-800 rounded-[3rem] bg-zinc-900/10">
                    <div className="p-6 rounded-3xl bg-zinc-900/50 text-zinc-700 mb-6 group-hover:scale-110 transition-transform">
                        <FileText size={48} />
                    </div>
                    <h3 className="text-zinc-400 font-bold text-xl">Sin contratos registrados</h3>
                    <p className="text-zinc-600 text-sm mt-2 max-w-sm text-center">Comienza agregando un nuevo contrato para tus inquilinos activos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {contracts.map((contract) => {
                            const styles = getStatusStyles(contract.status)
                            return (
                                <motion.div
                                    layout
                                    key={contract.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="group relative h-full"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
                                    
                                    <div className="relative z-10 bg-zinc-900/50 backdrop-blur-3xl border border-zinc-800 hover:border-indigo-500/50 rounded-[2.5rem] p-7 h-full flex flex-col transition-all duration-300">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${styles.bg}`}>
                                                {styles.label}
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingContract(contract); setIsModalOpen(true); }} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-indigo-400 transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(contract.id)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-6 flex-1">
                                            <div>
                                                <p className="text-[10px] font-black text-indigo-400/80 uppercase tracking-[0.2em] mb-1">Inquilino</p>
                                                <h4 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                                    <User size={18} className="text-zinc-600" />
                                                    {contract.tenant_name}
                                                </h4>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                                    <div className="h-10 w-10 rounded-xl bg-zinc-950 flex items-center justify-center text-amber-400">
                                                        <Building2 size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Propiedad</p>
                                                        <p className="text-sm font-bold text-white">{contract.property_name}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                                    <div className="h-10 w-10 rounded-xl bg-zinc-950 flex items-center justify-center text-emerald-400">
                                                        <DollarSign size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Renta Mensual</p>
                                                        <p className="text-sm font-black text-white">${contract.monthly_rent.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                                                <div className="flex items-center gap-2 text-indigo-400 mb-1">
                                                    <Clock size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Vigencia</span>
                                                </div>
                                                <p className="text-xs font-bold text-zinc-300">
                                                    {format(new Date(contract.start_date), 'dd MMM yyyy', { locale: es })} - {format(new Date(contract.end_date), 'dd MMM yyyy', { locale: es })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex gap-2">
                                            <Button 
                                                onClick={() => {
                                                    setPreviewContract(contract)
                                                    setIsPreviewOpen(true)
                                                }}
                                                variant="ghost" 
                                                className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                            >
                                                <Eye size={16} /> Ver
                                            </Button>
                                            <Button 
                                                onClick={() => {
                                                    setPreviewContract(contract)
                                                    setIsPreviewOpen(true)
                                                    // Nota: El botón de descarga real está dentro del modal de previsualización
                                                    // para asegurar que el contenido esté renderizado antes de capturarlo.
                                                    // Pero también podemos disparar un toast indicando que debe previsualizar primero si es necesario.
                                                }}
                                                variant="ghost" 
                                                className="h-12 w-12 bg-zinc-800 hover:bg-emerald-600/20 text-zinc-400 hover:text-emerald-400 border border-zinc-700/50 rounded-2xl flex items-center justify-center"
                                                title="Previsualizar y Descargar PDF"
                                            >
                                                <Download size={18} />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

            <CreateContractModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchContracts}
                editingContract={editingContract}
            />

            <ContractPreviewModal 
                isOpen={isPreviewOpen}
                onClose={() => {
                    setIsPreviewOpen(false)
                    setPreviewContract(null)
                }}
                contract={previewContract}
            />
        </div>
    )
}

