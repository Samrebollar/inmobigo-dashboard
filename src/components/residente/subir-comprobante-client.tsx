'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Check, X, FileText, Loader2, CheckCircle, AlertCircle, Eye, Trash, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { getValidations, submitValidation, deleteValidation, syncApprovedValidations } from '@/app/actions/payment-validation-actions'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { createClient } from '@/utils/supabase/client'
import { getBankAccounts } from '@/app/actions/bank-account-actions'

interface SubirComprobanteClientProps {
    resident: any
}

export function SubirComprobanteClient({ resident }: SubirComprobanteClientProps) {
    const [validations, setValidations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [selectedProof, setSelectedProof] = useState<string | null>(null)
    const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const supabase = createClient()

    // Bank Accounts State
    const [bankAccounts, setBankAccounts] = useState<any[]>([])

    // Form State
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [nota, setNota] = useState('')
    const [fileBase64, setFileBase64] = useState('')
    const [fileName, setFileName] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const loadBankAccounts = async () => {
            if (resident.condominium_id) {
                const res = await getBankAccounts(resident.condominium_id)
                if (res.success) {
                    setBankAccounts(res.data)
                }
            }
        }
        loadBankAccounts()
    }, [resident.condominium_id])

    const handleContainerClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFileName(file.name)
            const reader = new FileReader()
            reader.onloadend = () => {
                setFileBase64(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    useEffect(() => {
        fetchData()
        
        // Configurar Suscripción Realtime
        const channel = supabase
            .channel('public:payment_validations')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'payment_validations',
                    filter: resident.id ? `resident_id=eq.${resident.id}` : undefined
                },
                (payload) => {
                    console.log('Realtime change received:', payload)
                    fetchData() // Refrescar datos cuando hay cambios
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [resident.id])

    const generateReceipt = (item: any) => {
        try {
            const doc = new jsPDF()
            
            // Header Banner
            doc.setFillColor(79, 70, 229)
            doc.rect(0, 0, 210, 35, 'F')
            
            doc.setFontSize(22)
            doc.setTextColor(255, 255, 255)
            doc.setFont('helvetica', 'bold')
            doc.text('RECIBO DE PAGO', 14, 22)
            
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`Folio: REC-${Date.now().toString().slice(-6)}`, 150, 16)
            doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 150, 23)
            
            // Resident Info
            doc.setFontSize(12)
            doc.setTextColor(40, 40, 40)
            doc.setFont('helvetica', 'bold')
            doc.text('INFORMACIÓN DEL RESIDENTE', 14, 50)
            
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`Nombre: ${item.resident_name}`, 14, 60)
            doc.text(`Unidad: ${item.unit}`, 14, 66)
            
            // Divider
            doc.setDrawColor(220, 220, 220)
            doc.line(14, 80, 196, 80)
            
            // Payment Details
            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.text('DETALLES DEL PAGO', 14, 92)
            
            const tableColumn = ["Concepto", "Monto Pagado", "Forma de Pago", "Fecha"]
            const tableRows = [
                [
                    item.nota || "Cuota de Mantenimiento",
                    `$${Number(item.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                    "Transferencia",
                    item.date
                ]
            ]
            
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 98,
                styles: { fontSize: 10, cellPadding: 5 },
                headStyles: { fillColor: [79, 70, 229] },
                alternateRowStyles: { fillColor: [245, 245, 245] },
            })
            
            const finalY = (doc as any).lastAutoTable.finalY + 15

            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(60, 60, 60)
            doc.text(`Total Procesado: $${Number(item.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 120, finalY)
            
            // Footer
            doc.setFontSize(8)
            doc.setTextColor(150, 150, 150)
            doc.setFont('helvetica', 'normal')
            doc.text('Este documento es un comprobante de operación digital generado por InmobiGo SaaS.', 14, 275)
            doc.text('Conserve este recibo para cualquier aclaración futura.', 14, 281)
            
            doc.save(`Recibo_${item.resident_name.replace(/\s+/g, '_')}.pdf`)
            toast.success('Comprobante PDF generado y descargado.')
        } catch (pdfError) {
            console.error('Error generating receipt PDF:', pdfError)
            toast.error('Error al generar el archivo PDF del recibo.')
        }
    }

    const handleDelete = (id: string) => {
        setDeleteConfirmation(id)
    }

    const confirmDelete = async () => {
        if (!deleteConfirmation) return
        const id = deleteConfirmation
        setDeleteConfirmation(null)
        
        setActionLoading(id)
        const res = await deleteValidation(id)
        if (res.success) {
            toast.success('Comprobante eliminado correctamente')
            await fetchData()
        } else {
            toast.error(res.error)
        }
        setActionLoading(null)
    }

    const fetchData = async () => {
        setLoading(true)
        const res = await getValidations()
        if (res.success) {
            // Filter validations for this resident (by name or unit to be safe in the demo)
            const filtered = res.data.filter((v: any) => 
                v.resident_name === `${resident.first_name} ${resident.last_name}`.trim() || 
                v.unit === resident.units?.unit_number
            )
            setValidations(filtered)
        }
        setLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || !date) {
            toast.error('Por favor completa los campos requeridos.')
            return
        }

        setSubmitting(true)
        
        // Mock File Upload (Use a realistic placeholder if no URL provided)
        const mockComprobanteUrl = fileBase64 || "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=800&q=80"

        const res = await submitValidation({
            resident_name: `${resident.first_name} ${resident.last_name}`.trim(),
            unit: resident.units?.unit_number || 'Unidad S/N',
            amount: parseFloat(amount),
            date: date,
            comprobante_url: mockComprobanteUrl,
            nota: nota,
            resident_id: resident.id
        })

        if (res.success) {
            toast.success('Comprobante enviado exitosamente para validación.')
            setAmount('')
            setNota('')
            setFileBase64('')
            setFileName('')
            await fetchData()
        } else {
            toast.error(res.error)
        }
        setSubmitting(false)
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-1">
                <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] p-6 backdrop-blur-md shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-4">Enviar Comprobante</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Monto</label>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                placeholder="$0.00"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Fecha de Pago</label>
                            <input 
                                type="date" 
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Comprobante (Imagen o PDF)</label>
                            <div 
                                onClick={handleContainerClick}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    const file = e.dataTransfer.files?.[0]
                                    if (file) {
                                        setFileName(file.name)
                                        const reader = new FileReader()
                                        reader.onloadend = () => {
                                            setFileBase64(reader.result as string)
                                        }
                                        reader.readAsDataURL(file)
                                    }
                                }}
                                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-800 border-dashed rounded-xl hover:border-indigo-500/50 transition-colors cursor-pointer relative bg-zinc-950/50"
                            >
                                <div className="space-y-1 text-center">
                                    <Upload className="mx-auto h-12 w-12 text-zinc-500" />
                                    <div className="flex text-sm text-zinc-400 justify-center">
                                        <span className="font-medium text-indigo-500 hover:text-indigo-400">Subir un archivo</span>
                                        <input 
                                            ref={fileInputRef}
                                            id="file-upload" 
                                            name="file-upload" 
                                            type="file" 
                                            className="sr-only" 
                                            accept="image/*,application/pdf" 
                                            onChange={handleFileChange} 
                                        />
                                        <p className="pl-1">o arrastrar y soltar</p>
                                    </div>
                                    <p className="text-xs text-zinc-500">PNG, JPG, PDF hasta 10MB</p>
                                    {fileName && (
                                        <p className="text-xs text-emerald-400 font-bold mt-2 flex items-center justify-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                                            <Check size={12} /> {fileName}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Nota / Concepto</label>
                            <textarea 
                                value={nota}
                                onChange={(e) => setNota(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 min-h-[80px] resize-none"
                                placeholder="Detalles adicionales..."
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={submitting}
                            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                            <span>Enviar Comprobante</span>
                        </button>
                    </form>
                </div>
            </div>

            {/* History Section */}
            <div className="lg:col-span-2">
                <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] p-6 backdrop-blur-md shadow-2xl min-h-[400px]">
                    <h2 className="text-xl font-bold text-white mb-4">Historial de Validaciones</h2>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-indigo-500" size={32} />
                        </div>
                    ) : validations.length === 0 ? (
                        <div className="text-center py-20 text-zinc-500">
                            <FileText size={48} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No has enviado comprobantes aún.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Monto</th>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Observación</th>
                                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {validations.map((item) => (
                                        <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                                            <td className="px-6 py-4 text-zinc-300 text-sm font-medium">
                                                {item.date}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-black text-emerald-400">
                                                ${Number(item.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                    item.status === 'pendiente' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                    item.status === 'aprobado' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                    'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-400 text-sm">
                                                {item.observacion || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => setSelectedProof(item.comprobante_url)}
                                                        className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-indigo-400 hover:border-indigo-500/20 transition-all"
                                                        title="Ver Comprobante"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {item.status === 'aprobado' && (
                                                        <button 
                                                            onClick={() => generateReceipt(item)}
                                                            className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                                            title="Descargar Recibo"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleDelete(item.id)}
                                                        disabled={actionLoading === item.id}
                                                        className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-rose-400 hover:border-rose-500/20 transition-all disabled:opacity-50"
                                                        title="Eliminar"
                                                    >
                                                        {actionLoading === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash size={16} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Tarjeta de Datos Bancarios del Administrador (Para Residentes) */}
                <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] p-8 backdrop-blur-md shadow-2xl mt-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <svg className="w-48 h-48 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                    </div>
                    
                    <h3 className="text-2xl font-black text-white flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        Cuentas para Depósito
                    </h3>
                    <p className="text-zinc-400 text-sm mb-8">
                        Realiza tu pago a cualquiera de las siguientes cuentas oficiales de <b>{resident.condominiums?.name || 'la propiedad'}</b>.
                    </p>

                    <div className="grid grid-cols-1 gap-6">
                        {bankAccounts.length === 0 ? (
                            <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 text-center">
                                <p className="text-zinc-500 text-sm font-bold">No hay cuentas bancarias configuradas para esta propiedad.</p>
                                <p className="text-zinc-600 text-xs mt-1">Contacta al administrador para obtener los datos de pago.</p>
                            </div>
                        ) : bankAccounts.map(acc => (
                            <div key={acc.id} className="bg-zinc-950/80 border border-zinc-800/80 rounded-[2rem] p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-all">
                                    <h4 className="text-6xl font-black text-white uppercase">{acc.bank_name?.[0]}</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Banco</span>
                                        <p className="text-lg font-black text-white">{acc.bank_name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Número de Cuenta / CLABE</span>
                                        <p className="text-lg font-black text-indigo-400 font-mono tracking-wider">{acc.account_number}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Concepto de Referencia</span>
                                        <p className="text-sm font-bold text-emerald-400">{acc.reference || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Custom Deletion Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmation && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteConfirmation(null)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 overflow-hidden shadow-2xl text-center"
                        >
                            <div className="p-4 bg-rose-500/10 rounded-full w-fit mx-auto mb-4 text-rose-500 border border-rose-500/20">
                                <AlertTriangle size={32} className="animate-pulse" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">¿Confirmar Eliminación?</h3>
                            <p className="text-zinc-400 text-sm mb-6">
                                Esta acción eliminará permanentemente tu comprobante de pago enviado. No se puede revertir.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setDeleteConfirmation(null)}
                                    className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2"
                                >
                                    <Trash size={14} />
                                    <span>Eliminar</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Proof Preview Modal */}
            <AnimatePresence>
                {selectedProof && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedProof(null)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-2xl w-full bg-zinc-900 border border-white/10 rounded-[2rem] p-4 overflow-hidden shadow-2xl"
                        >
                            <button 
                                onClick={() => setSelectedProof(null)}
                                className="absolute top-4 right-4 p-2 bg-black/50 text-white hover:bg-zinc-800 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                            <img 
                                src={selectedProof} 
                                alt="Comprobante de Pago" 
                                className="w-full h-auto max-h-[60vh] object-contain rounded-2xl"
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
