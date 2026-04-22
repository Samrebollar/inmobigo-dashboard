import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Loader2, Plus, Mail, Phone, ChevronRight } from 'lucide-react'
import { residentsService } from '@/services/residents-service'
import { financeService } from '@/services/finance-service'
import { propertiesService } from '@/services/properties-service'
import { Resident } from '@/types/residents'
import { Condominium } from '@/types/properties'
import { Switch } from '@/components/ui/switch'
import { format } from 'date-fns'
import { useDemoMode } from '@/hooks/use-demo-mode'
import { demoDb } from '@/utils/demo-db'

interface CreateInvoiceModalProps {
    isOpen: boolean
    onClose: () => void
    condominiumId: string
    organizationId: string
    defaultResident?: Resident // Pre-selected resident
    onSuccess?: () => void
}

export function CreateInvoiceModal({
    isOpen,
    onClose,
    condominiumId: defaultCondominiumId,
    organizationId,
    defaultResident,
    onSuccess
}: CreateInvoiceModalProps) {
    const { isDemo, loading: demoLoading } = useDemoMode()
    const [loading, setLoading] = useState(false)
    const [loadingData, setLoadingData] = useState(false)

    // Data
    const [condominiums, setCondominiums] = useState<Condominium[]>([])
    const [residents, setResidents] = useState<Resident[]>([])

    // Form
    const [selectedCondoId, setSelectedCondoId] = useState(defaultCondominiumId)
    // Extra toggles state (Visual/Logic only for now)
    const [autoLateFee, setAutoLateFee] = useState(true)
    const [sendEmail, setSendEmail] = useState(true)

    const [isRecurring, setIsRecurring] = useState(false)
    const [recurringFreq, setRecurringFreq] = useState('Mensual')
    const [lateFeePercent, setLateFeePercent] = useState('5% mensual')
    const [lateFeeGrace, setLateFeeGrace] = useState('5 días')

    const [formData, setFormData] = useState({
        residentId: '',
        concept: 'Cuota de Mantenimiento', // Default value
        amount: '',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
    })

    // 1. Load Condominiums on Open
    useEffect(() => {
        if (isOpen && !demoLoading) {
            loadCondominiums()
        }
    }, [isOpen, organizationId, demoLoading])

    // 2. Load Residents when Selected Condo Changes
    useEffect(() => {
        if (isOpen && selectedCondoId) {
            loadResidents(selectedCondoId)
        } else {
            setResidents([])
        }
    }, [isOpen, selectedCondoId])

    // 3. Handle Selecting Resident -> Auto Select Condo
    useEffect(() => {
        if (formData.residentId) {
            const res = residents.find(r => r.id === formData.residentId)
            if (res && res.condominium_id && res.condominium_id !== selectedCondoId) {
                setSelectedCondoId(res.condominium_id)
            }
        }
    }, [formData.residentId, residents])

    // 4. Handle Default Resident
    useEffect(() => {
        if (isOpen && defaultResident) {
            // Ensure condo is set to resident's condo
            if (defaultResident.condominium_id) {
                setSelectedCondoId(defaultResident.condominium_id)
            }
            setFormData(prev => ({
                ...prev,
                residentId: defaultResident.id
            }))
        } else if (defaultCondominiumId) {
            setSelectedCondoId(defaultCondominiumId)
        }
    }, [isOpen, defaultResident, defaultCondominiumId])


    const loadCondominiums = async () => {
        try {
            let data = await propertiesService.getByOrganization(organizationId)

            if (isDemo && data.length === 0) {
                const demoItems = demoDb.getProperties()
                data = demoItems.map(d => ({
                    ...d,
                    organization_id: organizationId || 'demo-org'
                })) as Condominium[]
            }

            setCondominiums(data)

            // If we have a default condo but it's not in the list, force add it if it's from demoDb
            if (defaultCondominiumId && !data.find(c => c.id === defaultCondominiumId)) {
                const specificDemo = demoDb.getProperties().find(p => p.id === defaultCondominiumId)
                if (specificDemo) {
                    setCondominiums(prev => [...prev, specificDemo as Condominium])
                }
            }

        } catch (error) {
            console.error('Error loading condos:', error)
        }
    }

    const loadResidents = async (condoId: string) => {
        setLoadingData(true)
        try {
            const data = await residentsService.getByCondominium(condoId)
            setResidents(data)
        } catch (error) {
            console.error('Error loading residents:', error)
        } finally {
            setLoadingData(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const selectedResident = defaultResident || residents.find(r => r.id === formData.residentId)

            if (!selectedResident) {
                toast.error('Residente no seleccionado', {
                    description: 'Por favor, elige un residente válido de la lista para generar la factura.',
                })
                return
            }

            // Should verify unit_id presence
            if (!selectedResident.unit_id) {
                toast.error('Unidad No Asignada', {
                    description: 'El residente seleccionado no tiene una unidad vinculada. Es necesario asignar una unidad antes de facturar.',
                })
                return
            }

            // Append Toggle info to notes if needed, since schema doesn't support them yet
            let finalNotes = formData.notes
            if (autoLateFee) finalNotes += ' [Auto Late Fee: 5%]'
            if (sendEmail) finalNotes += ' [Email Sent]'

            await financeService.create({
                organization_id: organizationId,
                condominium_id: selectedCondoId,
                unit_id: selectedResident.unit_id,
                amount: parseFloat(formData.amount),
                status: 'pending',
                due_date: formData.dueDate,
                description: finalNotes ? `${formData.concept} - ${finalNotes}` : formData.concept
            })

            if (onSuccess) onSuccess()
            onClose()
            // Reset form
            setFormData({
                residentId: '',
                concept: 'Cuota de Mantenimiento',
                amount: '',
                dueDate: format(new Date(), 'yyyy-MM-dd'),
                notes: ''
            })
        } catch (error: any) {
            console.error('Error creating invoice:', error)
            toast.error('Error al facturar', {
                description: error.message || 'Ocurrió un error inesperado al intentar generar la factura.',
            })
        } finally {
            setLoading(false)
        }

    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nueva Factura">
            <form onSubmit={handleSubmit} className="space-y-5">

                {/* Resident Selection Section */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Residente</label>

                    {defaultResident ? (
                        // Read-Only Card Style driven by provided image
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between group hover:border-slate-600 transition-colors cursor-default">
                            <div className="flex items-center gap-3">
                                {/* Only verify if first_name exists to prevent runtime error if empty */}
                                <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30 text-sm">
                                    {defaultResident.first_name?.[0]}{defaultResident.last_name?.[0]}
                                </div>
                                <div>
                                    <div className="text-white font-medium text-sm flex items-center gap-2">
                                        {defaultResident.first_name} {defaultResident.last_name}
                                    </div>
                                    <div className="text-slate-400 text-xs flex items-center gap-3 mt-0.5">
                                        <span className="flex items-center gap-1"><Mail size={10} /> {defaultResident.email}</span>
                                        <span className="flex items-center gap-1"><Phone size={10} /> {defaultResident.phone}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">{defaultResident.unit_number || 'B-10'}</span>
                                <ChevronRight size={14} />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">Condominio</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                    required
                                    value={selectedCondoId}
                                    onChange={(e) => {
                                        setSelectedCondoId(e.target.value)
                                        setFormData(prev => ({ ...prev, residentId: '' }))
                                    }}
                                >
                                    <option value="">Condominio...</option>
                                    {condominiums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">Residente</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                    required
                                    value={formData.residentId}
                                    onChange={(e) => setFormData({ ...formData, residentId: e.target.value })}
                                    disabled={!selectedCondoId}
                                >
                                    <option value="">Seleccionar...</option>
                                    {residents.map(r => (
                                        <option key={r.id} value={r.id}>{r.first_name} {r.last_name} ({r.unit_number})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Concept */}
                <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-300">Concepto</label>
                    <select
                        className="w-full bg-slate-900 border border-slate-700/50 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none shadow-sm"
                        required
                        value={formData.concept}
                        onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                    >
                        <option value="Cuota de Mantenimiento">Cuota de Mantenimiento</option>
                        <option value="Multa">Multa</option>
                        <option value="Reserva Amenidad">Reserva Amenidad</option>
                        <option value="Otro">Otro</option>
                    </select>
                    <button type="button" className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors mt-1 pl-1">
                        <Plus size={12} /> Agregar línea adicional
                    </button>
                </div>

                {/* Amount & Date Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-300">Monto</label>
                        <div className="relative group">
                            <input
                                type="number"
                                placeholder="$0.00"
                                className="w-full bg-slate-900 border border-slate-700/50 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 font-medium shadow-sm"
                                required
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold text-slate-300">Fecha de Vencimiento</label>
                        </div>
                        <div className="relative">
                            <input
                                type="date"
                                className="w-full bg-slate-900 border border-slate-700/50 rounded-lg py-2.5 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 [color-scheme:dark] shadow-sm"
                                required
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                            {/* Visual badge for "10 días después" calculation if possible, hardcoded mock for now as requested */}
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block">
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">10 días después</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-300">Notas <span className="text-slate-500 font-normal">(opcional)</span></label>
                    <textarea
                        className="w-full bg-slate-900 border border-slate-700/50 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-blue-500/50 min-h-[70px] resize-none shadow-sm placeholder:text-slate-600"
                        placeholder="Escribe detalles adicionales para la factura..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>

                {/* Toggles Container */}
                <div className="space-y-3 pt-1">

                    {/* Recurring Toggle Row */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={isRecurring}
                                onCheckedChange={setIsRecurring}
                                className="data-[state=checked]:bg-emerald-500"
                            />
                            <span className="text-sm text-slate-200 font-medium select-none">Factura recurrente</span>
                        </div>
                        {isRecurring && (
                            <div className="flex bg-slate-800 rounded-md p-0.5 border border-slate-700">
                                {['Mensual', 'Trimestral', 'Anual'].map((freq) => (
                                    <button
                                        key={freq}
                                        type="button"
                                        onClick={() => setRecurringFreq(freq)}
                                        className={`px-3 py-1 text-xs rounded-sm transition-colors ${recurringFreq === freq ? 'bg-slate-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        {freq}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Auto Late Fee Row */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={autoLateFee}
                                onCheckedChange={setAutoLateFee}
                                className="data-[state=checked]:bg-emerald-500"
                            />
                            <span className="text-sm text-slate-200 font-medium select-none">Cargo por mora automático</span>
                        </div>
                        {autoLateFee && (
                            <div className="flex gap-2">
                                <select
                                    value={lateFeePercent}
                                    onChange={(e) => setLateFeePercent(e.target.value)}
                                    className="bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300 focus:ring-0 cursor-pointer hover:bg-slate-700 py-1 pl-2 pr-6"
                                >
                                    <option>2% diario</option>
                                    <option>5% mensual</option>
                                    <option>10% mensual</option>
                                </select>
                                <select
                                    value={lateFeeGrace}
                                    onChange={(e) => setLateFeeGrace(e.target.value)}
                                    className="bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300 focus:ring-0 cursor-pointer hover:bg-slate-700 py-1 pl-2 pr-6"
                                >
                                    <option>3 días</option>
                                    <option>5 días</option>
                                    <option>10 días</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Email Notification Row */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={sendEmail}
                                onCheckedChange={setSendEmail}
                                className="data-[state=checked]:bg-blue-600"
                            />
                            <span className="text-sm text-slate-200 font-medium select-none">Enviar correo de notificación al residente</span>
                        </div>
                    </div>
                </div>


                {/* Summary Footer */}
                <div className="bg-slate-950/50 rounded-xl p-4 space-y-3 border border-slate-800 mt-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Subtotal</span>
                        <div className="flex items-center gap-2">
                            {/* Payment Method Selector Mock */}
                            <select className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-400 focus:outline-none">
                                <option>Transferencia bancaria</option>
                                <option>Efectivo</option>
                                <option>Tarjeta</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Mora estimada: <span className="text-slate-500">$0</span></span>
                        <span className="text-slate-200 font-medium">${formData.amount || '0'}</span>
                    </div>
                    <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                        <span className="text-slate-200 font-semibold">Total</span>
                        <span className="text-white font-bold text-lg">${formData.amount || '0'}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : null}
                            Crear Factura
                        </button>
                    </div>
                </div>

            </form>
        </Modal>
    )
}
