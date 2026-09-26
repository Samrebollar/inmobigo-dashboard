'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Loader2, AlertTriangle, Search, X, FileText, UploadCloud, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { residentsService } from '@/services/residents-service'
import { financeService } from '@/services/finance-service'
import { Resident } from '@/types/residents'
import { format } from 'date-fns'

interface FineModalProps {
    isOpen: boolean
    onClose: () => void
    condominiumId: string
    organizationId: string
    condominiumList: { id: string; name: string }[]
    onSuccess?: () => void
}

export function FineModal({
    isOpen,
    onClose,
    condominiumId: defaultCondominiumId,
    organizationId,
    condominiumList,
    onSuccess,
}: FineModalProps) {
    const supabase = createClient()
    const [loadingResidents, setLoadingResidents] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [uploading, setUploading] = useState(false)

    const [condoId, setCondoId] = useState(defaultCondominiumId)
    const [residents, setResidents] = useState<Resident[]>([])
    const [residentSearch, setResidentSearch] = useState('')
    const [selectedResident, setSelectedResident] = useState<Resident | null>(null)

    const [amount, setAmount] = useState('')
    const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [notes, setNotes] = useState('')
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null)

    useEffect(() => {
        if (isOpen) {
            setCondoId(defaultCondominiumId)
            setResidentSearch('')
            setSelectedResident(null)
            setAmount('')
            setDueDate(format(new Date(), 'yyyy-MM-dd'))
            setNotes('')
            setEvidenceFile(null)
        }
    }, [isOpen, defaultCondominiumId])

    useEffect(() => {
        if (!isOpen || !condoId) return
        setLoadingResidents(true)
        setSelectedResident(null)
        setResidentSearch('')
        residentsService.getByCondominium(condoId)
            .then(data => setResidents(data.filter(r => r.status !== 'inactive')))
            .catch(() => toast.error('Error al cargar los residentes de la privada.'))
            .finally(() => setLoadingResidents(false))
    }, [isOpen, condoId])

    const filteredResidents = residentSearch.trim().length > 0
        ? residents.filter(r => `${r.first_name} ${r.last_name}`.toLowerCase().includes(residentSearch.toLowerCase()))
        : residents

    const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.type !== 'application/pdf') {
            toast.error('Solo se aceptan archivos PDF como evidencia.')
            return
        }
        setEvidenceFile(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedResident) return toast.error('Selecciona el residente al que se le asignará la multa.')
        if (!amount || parseFloat(amount) <= 0) return toast.error('Ingresa un monto válido.')
        if (!dueDate) return toast.error('Selecciona una fecha límite de pago.')

        try {
            setSubmitting(true)
            let evidenceUrl: string | undefined

            if (evidenceFile) {
                setUploading(true)
                const fileName = `${selectedResident.id}-${Math.random().toString(36).substring(2)}.pdf`
                const filePath = `multas/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('fine_evidences')
                    .upload(filePath, evidenceFile, { cacheControl: '3600', upsert: false })

                if (uploadError) {
                    throw new Error('Error al subir la evidencia: ' + uploadError.message)
                }

                const { data: { publicUrl } } = supabase.storage.from('fine_evidences').getPublicUrl(filePath)
                evidenceUrl = publicUrl
                setUploading(false)
            }

            await financeService.create({
                organization_id: organizationId,
                condominium_id: condoId,
                resident_id: selectedResident.id,
                amount: parseFloat(amount),
                status: 'pending',
                invoice_type: 'fine',
                due_date: dueDate,
                description: notes ? `Multa - ${notes}` : 'Multa',
                evidence_url: evidenceUrl,
            } as any)

            toast.success(`Multa de $${parseFloat(amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} asignada a ${selectedResident.first_name} ${selectedResident.last_name}.`)
            if (onSuccess) onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message || 'Error al asignar la multa.')
        } finally {
            setSubmitting(false)
            setUploading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Asignar Multa" className="max-w-xl">
            <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh]">
                <div className="flex-1 overflow-y-auto px-1 pr-3 space-y-5 custom-scrollbar max-h-[65vh]">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Privada</label>
                        <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-rose-500/50"
                            value={condoId}
                            onChange={(e) => setCondoId(e.target.value)}
                        >
                            <option value="">Selecciona...</option>
                            {condominiumList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">Residente</label>

                        {selectedResident ? (
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold border border-rose-500/30 text-sm">
                                        {selectedResident.first_name?.[0]}{selectedResident.last_name?.[0]}
                                    </div>
                                    <div>
                                        <div className="text-white font-medium text-sm">{selectedResident.first_name} {selectedResident.last_name}</div>
                                        <div className="text-slate-400 text-xs">{selectedResident.unit_number || 'S/N'}</div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedResident(null)}
                                    className="text-xs font-medium text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
                                >
                                    <X size={12} /> Cambiar
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        disabled={!condoId || loadingResidents}
                                        value={residentSearch}
                                        onChange={(e) => setResidentSearch(e.target.value)}
                                        placeholder={loadingResidents ? 'Cargando residentes...' : 'Escribe el nombre del residente...'}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-rose-500/50 disabled:opacity-50"
                                    />
                                </div>
                                {condoId && !loadingResidents && (
                                    <div className="border border-slate-800 rounded-xl divide-y divide-slate-800/70 max-h-[180px] overflow-y-auto custom-scrollbar">
                                        {filteredResidents.length === 0 ? (
                                            <div className="text-center py-4 text-slate-500 text-xs">No se encontraron residentes.</div>
                                        ) : (
                                            filteredResidents.map(r => (
                                                <button
                                                    type="button"
                                                    key={r.id}
                                                    onClick={() => setSelectedResident(r)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/50 transition-colors"
                                                >
                                                    <User size={12} className="text-slate-500 shrink-0" />
                                                    <span className="text-sm text-white truncate">{r.first_name} {r.last_name}</span>
                                                    <span className="text-xs text-slate-500 ml-auto shrink-0">{r.unit_number || 'S/N'}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Evidencia (PDF) <span className="text-slate-600">(opcional)</span></label>
                        <div className="relative border-2 border-dashed border-slate-800 bg-slate-950 rounded-xl p-4 hover:border-slate-700 hover:bg-slate-900/50 transition-all">
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={handleEvidenceChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex items-center justify-center gap-3 text-center">
                                {evidenceFile ? (
                                    <>
                                        <FileText size={20} className="text-rose-400 shrink-0" />
                                        <span className="text-xs font-bold text-slate-200 truncate">{evidenceFile.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud size={20} className="text-zinc-500 shrink-0" />
                                        <span className="text-xs font-bold text-zinc-400">Adjunta el documento que respalda la multa</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-300">Monto</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                <input
                                    type="number"
                                    required
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700/50 rounded-lg py-2.5 pl-6 pr-3 text-sm text-white focus:outline-none focus:border-rose-500/50 font-medium"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-300">Fecha límite</label>
                            <input
                                type="date"
                                required
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700/50 rounded-lg py-2.5 px-3 text-sm text-slate-300 focus:outline-none focus:border-rose-500/50 [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-300">Motivo <span className="text-slate-500 font-normal">(opcional)</span></label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Describe el motivo de la multa..."
                            className="w-full bg-slate-900 border border-slate-700/50 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-rose-500/50 min-h-[70px] resize-none placeholder:text-slate-600"
                        />
                    </div>
                </div>

                <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 mt-4 shrink-0">
                    {selectedResident && (
                        <div className="flex items-start gap-2 mb-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
                            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                            <span>Esta multa aparecerá como recibo pendiente en la app de {selectedResident.first_name}.</span>
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                            {uploading ? 'Subiendo evidencia...' : 'Asignar Multa'}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    )
}
