'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    X, 
    FileText, 
    Calendar, 
    DollarSign, 
    User, 
    Building2,
    Check,
    ChevronDown,
    Save
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { demoDb } from '@/utils/demo-db'
import { addMonths, format } from 'date-fns'

interface CreateContractModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    editingContract?: any
}

export function CreateContractModal({ isOpen, onClose, onSuccess, editingContract }: CreateContractModalProps) {
    const [properties, setProperties] = useState<any[]>([])
    const [allResidents, setAllResidents] = useState<any[]>([])
    const [filteredResidents, setFilteredResidents] = useState<any[]>([])
    
    const [formData, setFormData] = useState({
        property_id: '',
        resident_id: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
        type: '12 meses',
        monthly_rent: 0,
        deposit: 0,
        notes: ''
    })

    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setProperties(demoDb.getProperties())
            setAllResidents(demoDb.getResidents())
            
            if (editingContract) {
                setFormData({
                    property_id: editingContract.property_id,
                    resident_id: editingContract.resident_id,
                    start_date: editingContract.start_date,
                    end_date: editingContract.end_date,
                    type: editingContract.type || 'Personalizado',
                    monthly_rent: editingContract.monthly_rent,
                    deposit: editingContract.deposit || 0,
                    notes: editingContract.notes || ''
                })
            }
        }
    }, [isOpen, editingContract])

    useEffect(() => {
        if (formData.property_id) {
            const filtered = allResidents.filter(r => r.condominium_id === formData.property_id)
            setFilteredResidents(filtered)
            if (!filtered.find(r => r.id === formData.resident_id)) {
                setFormData(prev => ({ ...prev, resident_id: '' }))
            }
        } else {
            setFilteredResidents([])
            setFormData(prev => ({ ...prev, resident_id: '' }))
        }
    }, [formData.property_id, allResidents])

    const handleTypeChange = (type: string) => {
        let months = 6
        if (type === '12 meses') months = 12
        else if (type === '6 meses') months = 6
        
        if (type !== 'Personalizado') {
            const end = addMonths(new Date(formData.start_date), months)
            setFormData(prev => ({ 
                ...prev, 
                type, 
                end_date: format(end, 'yyyy-MM-dd') 
            }))
        } else {
            setFormData(prev => ({ ...prev, type }))
        }
    }

    const handleSave = async () => {
        if (!formData.property_id || !formData.resident_id || !formData.monthly_rent) {
            toast.error('Por favor completa los campos obligatorios')
            return
        }

        setIsSaving(true)
        try {
            const property = properties.find(p => p.id === formData.property_id)
            const tenant = allResidents.find(r => r.id === formData.resident_id)

            const contract = {
                id: editingContract?.id || `contract-${Date.now()}`,
                ...formData,
                property_name: property?.name || 'Propiedad desconocida',
                tenant_name: `${tenant?.first_name} ${tenant?.last_name}` || 'Inquilino desconocido',
                status: 'active', // Lógica de estado simplificada
                created_at: editingContract?.created_at || new Date().toISOString()
            }

            demoDb.saveContract(contract)
            toast.success(editingContract ? 'Contrato actualizado' : 'Contrato generado con éxito')
            onSuccess()
            onClose()
        } catch (error) {
            toast.error('Error al guardar el contrato')
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
                >
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
                                    <FileText size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight leading-none">
                                        {editingContract ? 'Editar Contrato' : 'Nuevo Contrato de Renta'}
                                    </h2>
                                    <p className="text-zinc-500 text-sm font-medium mt-1">Configura los términos del arrendamiento</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-2xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                            {/* Property Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Propiedad</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                    <select 
                                        value={formData.property_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, property_id: e.target.value }))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                                    >
                                        <option value="">Selecciona propiedad</option>
                                        {properties.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={16} />
                                </div>
                            </div>

                            {/* Tenant Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Inquilino</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                    <select 
                                        disabled={!formData.property_id}
                                        value={formData.resident_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, resident_id: e.target.value }))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Selecciona inquilino</option>
                                        {filteredResidents.map(r => (
                                            <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={16} />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Fecha Inicio</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                    <input 
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Fecha Fin</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                    <input 
                                        type="date"
                                        disabled={formData.type !== 'Personalizado'}
                                        value={formData.end_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold [color-scheme:dark] disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            {/* Type */}
                            <div className="col-span-full grid grid-cols-3 gap-4 p-2 bg-zinc-950 rounded-3xl border border-zinc-800">
                                {['6 meses', '12 meses', 'Personalizado'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => handleTypeChange(t)}
                                        className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                            formData.type === t 
                                            ? 'bg-zinc-800 text-white shadow-lg' 
                                            : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>

                            {/* Money */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Renta Mensual ($)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                    <input 
                                        type="number"
                                        value={formData.monthly_rent}
                                        onChange={(e) => setFormData(prev => ({ ...prev, monthly_rent: parseFloat(e.target.value) || 0 }))}
                                        placeholder="0.00"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-black text-xl"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Depósito (Garantía)</label>
                                <div className="relative">
                                    <Save className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={18} />
                                    <input 
                                        type="number"
                                        value={formData.deposit}
                                        onChange={(e) => setFormData(prev => ({ ...prev, deposit: parseFloat(e.target.value) || 0 }))}
                                        placeholder="0.00"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mb-8">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Notas Adicionales</label>
                            <textarea 
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Cláusulas especiales, condiciones de entrega..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium min-h-[100px] resize-none"
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button 
                                variant="ghost" 
                                onClick={onClose}
                                className="flex-1 h-14 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-2xl uppercase tracking-widest text-xs transition-all"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Check size={18} /> 
                                        {editingContract ? 'Guardar Cambios' : 'Generar Contrato'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

