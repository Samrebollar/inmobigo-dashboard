import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, X, Home, MapPin, User, Clock, ShieldCheck, Save, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'

interface ManualVisitModalProps {
    isOpen: boolean
    onClose: () => void
    organizationId?: string
    availableCondos?: any[]
}

export function ManualVisitModal({ isOpen, onClose, organizationId, availableCondos = [] }: ManualVisitModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(false)
    const supabase = createClient()

    // Form States
    const [residents, setResidents] = useState<any[]>([])
    const [selectedCondoId, setSelectedCondoId] = useState('')
    const [selectedResidentId, setSelectedResidentId] = useState('')
    const [unitNumber, setUnitNumber] = useState('')
    const [visitorName, setVisitorName] = useState('')
    const [entryTime, setEntryTime] = useState(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }))

    // 1. Sync Condos from Props
    const condos = availableCondos

    // 2. Fetch Residents when Condo Changes
    useEffect(() => {
        if (selectedCondoId) {
            fetchResidents(selectedCondoId)
        } else {
            setResidents([])
            setSelectedResidentId('')
            setUnitNumber('')
        }
    }, [selectedCondoId])

    // 3. Auto-fill Unit when Resident Changes
    useEffect(() => {
        if (selectedResidentId) {
            const resident = residents.find(r => r.user_id === selectedResidentId)
            if (resident?.units?.unit_number) {
                setUnitNumber(resident.units.unit_number)
            }
        }
    }, [selectedResidentId, residents])

    const fetchResidents = async (condoId: string) => {
        setIsFetching(true)
        try {
            const { data, error } = await supabase
                .from('residents')
                .select('user_id, first_name, last_name, units(unit_number)')
                .eq('condominium_id', condoId)
            
            if (data) {
                const formatted = data.map(r => ({
                    ...r,
                    fullName: `${r.first_name} ${r.last_name || ''}`.trim()
                }))
                setResidents(formatted)
            }
        } catch (err) {
            console.error('Error fetching residents:', err)
        } finally {
            setIsFetching(false)
        }
    }

    if (!isOpen) return null

    const handleSave = () => {
        setIsLoading(true)
        // Aquí iría la lógica de guardado real en la tabla visitor_passes
        setTimeout(() => {
            setIsLoading(false)
            onClose()
        }, 1500)
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-900 rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                >
                    {/* Header - Fixed */}
                    <div className="p-6 md:p-8 pb-4 flex items-center justify-between border-b border-zinc-900/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                <UserPlus className="h-6 w-6 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Registro Manual de Visitas</h2>
                                <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Nueva Entrada</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-3 bg-zinc-900 text-zinc-500 hover:text-white rounded-2xl transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6 md:p-8 overflow-y-auto">
                        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Propiedad */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Propiedad</label>
                                    <div className="relative group">
                                        <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 transition-colors group-focus-within:text-emerald-500" />
                                        <select 
                                            value={selectedCondoId}
                                            onChange={(e) => setSelectedCondoId(e.target.value)}
                                            className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all appearance-none"
                                        >
                                            <option value="">Seleccionar propiedad</option>
                                            {condos.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Unidad */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Unidad / Casa</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 transition-colors group-focus-within:text-emerald-500" />
                                        <input 
                                            type="text" 
                                            value={unitNumber}
                                            readOnly
                                            placeholder="Se llenará automáticamente"
                                            className="w-full h-14 bg-zinc-800/30 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-zinc-400 focus:outline-none transition-all cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {/* Nombre Visitante */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Nombre del Visitante</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 transition-colors group-focus-within:text-emerald-500" />
                                        <input 
                                            type="text" 
                                            value={visitorName}
                                            onChange={(e) => setVisitorName(e.target.value)}
                                            placeholder="Nombre completo"
                                            className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Autorizado Por */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Autorizado Por</label>
                                    <div className="relative group">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 transition-colors group-focus-within:text-emerald-500" />
                                        {isFetching ? (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
                                            </div>
                                        ) : null}
                                        <select 
                                            value={selectedResidentId}
                                            onChange={(e) => setSelectedResidentId(e.target.value)}
                                            disabled={!selectedCondoId}
                                            className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all appearance-none disabled:opacity-50"
                                        >
                                            <option value="">{selectedCondoId ? 'Seleccionar residente' : 'Elige una propiedad primero'}</option>
                                            {residents.map(r => (
                                                <option key={r.user_id} value={r.user_id}>{r.fullName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Hora Entrada */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Hora de Entrada</label>
                                    <div className="relative group">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 transition-colors group-focus-within:text-emerald-500" />
                                        <input 
                                            type="time" 
                                            value={entryTime}
                                            onChange={(e) => setEntryTime(e.target.value)}
                                            className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button 
                                    onClick={handleSave}
                                    disabled={isLoading || !selectedResidentId || !visitorName}
                                    className="w-full h-16 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-950/20 gap-3 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="h-5 w-5" /> Guardar Registro
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
