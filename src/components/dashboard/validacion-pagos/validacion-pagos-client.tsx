'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, FileText, Filter, Eye, Loader2, CheckCircle, AlertTriangle, Receipt, Trash, Download } from 'lucide-react'
import { toast } from 'sonner'
import { getValidations, updateValidationStatus, deleteValidation, syncApprovedValidations } from '@/app/actions/payment-validation-actions'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { createClient } from '@/utils/supabase/client'

export function PaymentValidationClient() {
    const [validations, setValidations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [filter, setFilter] = useState<'pendiente' | 'aprobado' | 'rechazado'>('pendiente')
    const [selectedProof, setSelectedProof] = useState<string | null>(null)
    const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null)
    const [observations, setObservations] = useState<{ [key: string]: string }>({})

    const [propertyFilter, setPropertyFilter] = useState<string>('todos')
    const [bankDetails, setBankDetails] = useState({
        bankName: '',
        accountNumber: '',
        reference: ''
    })
    const supabase = createClient()

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedBankDetails = localStorage.getItem('condo_bank_details')
            if (savedBankDetails) {
                setBankDetails(JSON.parse(savedBankDetails))
            }
        }
    }, [])

    const saveBankDetails = () => {
        localStorage.setItem('condo_bank_details', JSON.stringify(bankDetails))
        toast.success('Datos bancarios guardados correctamente')
    }

    useEffect(() => {
        fetchData()

        // Suscripción Realtime para cambios globales (Admin ve todo)
        const channel = supabase
            .channel('public:payment_validations_admin')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'payment_validations'
                },
                (payload) => {
                    console.log('Realtime change received (Admin):', payload)
                    fetchData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const res = await getValidations()
        if (res.success) {
            setValidations(res.data)
        } else {
            toast.error(res.error)
        }
        setLoading(false)
    }

    const handleAction = async (id: string, status: 'aprobado' | 'rechazado') => {
        setActionLoading(id)
        const obs = observations[id] || ''
        const res = await updateValidationStatus(id, status, obs)
        if (res.success) {
            toast.success(`Pago ${status === 'aprobado' ? 'aprobado' : 'rechazado'} con éxito`)
            
            if (status === 'aprobado') {
                const item = validations.find(v => v.id === id)
                if (item) generateReceipt(item)
            }
            
            await fetchData()
        } else {
            toast.error(res.error)
        }
        setActionLoading(null)
    }

    const handleDelete = async (id: string) => {
        setDeleteConfirmation(id)
    }

    const confirmDelete = async () => {
        if (!deleteConfirmation) return
        const id = deleteConfirmation
        setDeleteConfirmation(null)
        
        setActionLoading(id)
        const res = await deleteValidation(id)
        if (res.success) {
            toast.success('Registro eliminado correctamente')
            await fetchData()
        } else {
            toast.error(res.error)
        }
        setActionLoading(null)
    }

    const handleDownload = (url: string, name: string) => {
        const link = document.createElement('a')
        link.href = url
        link.download = `Comprobante_${name.replace(/\s+/g, '_')}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Descarga iniciada')
    }

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

    const filteredValidations = validations.filter(v => {
        const matchesStatus = v.status === filter
        const matchesProperty = propertyFilter === 'todos' || 
            (v.condominio || 'Residencial Zacil').toLowerCase().includes(propertyFilter.toLowerCase())
        return matchesStatus && matchesProperty
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white">Validación de Pagos</h1>
                    <p className="text-zinc-400 text-sm">Revisa y valida los comprobantes de transferencias o depósitos.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    {/* Filtro de Propiedades */}
                    <div className="relative">
                        <select
                            value={propertyFilter}
                            onChange={(e) => setPropertyFilter(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-all cursor-pointer h-[38px]"
                        >
                            <option value="todos">Todas las Propiedades</option>
                            <option value="zacil">Residencial Zacil</option>
                            <option value="las palmas">Las Palmas</option>
                            <option value="lakin">Lakin</option>
                        </select>
                    </div>

                    <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl gap-1">
                    <button 
                        onClick={() => setFilter('pendiente')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${filter === 'pendiente' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <Filter size={14} />
                        <span>Pendientes</span>
                    </button>
                    <button 
                        onClick={() => setFilter('aprobado')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${filter === 'aprobado' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <CheckCircle size={14} />
                        <span>Aprobados</span>
                    </button>
                    <button 
                        onClick={() => setFilter('rechazado')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${filter === 'rechazado' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <X size={14} />
                        <span>Rechazados</span>
                    </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
            ) : filteredValidations.length === 0 ? (
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-12 text-center max-w-md mx-auto">
                    <div className="p-4 bg-zinc-800/50 rounded-2xl w-fit mx-auto mb-4 text-zinc-500">
                        <Check size={32} />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">Sin registros</h3>
                    <p className="text-zinc-400 text-sm">No hay pagos con estado "{filter}" para revisar.</p>
                </div>
            ) : (
                <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-md">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Condominio</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Unidad</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Residente</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Concepto</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Monto</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Pago</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Forma de Pago</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Observación</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredValidations.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-4 text-zinc-300 text-sm font-medium">
                                            {item.condominio || 'Residencial Zacil'}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-300 text-sm font-semibold">
                                            {item.unit}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white font-black text-xs">
                                                    {item.resident_name?.[0] || 'R'}
                                                </div>
                                                <p className="text-sm font-bold text-white">{item.resident_name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400 text-sm max-w-[150px] truncate" title={item.nota || 'Cuota de Mantenimiento'}>
                                            {item.nota || 'Cuota de Mantenimiento'}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-300 text-sm font-medium">
                                            {item.date}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-black text-emerald-400">
                                                ${Number(item.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => setSelectedProof(item.comprobante_url)}
                                                    className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-indigo-400 hover:border-indigo-500/20 hover:bg-indigo-500/10 transition-all"
                                                    title="Ver Comprobante"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDownload(item.comprobante_url, item.resident_name)}
                                                    className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/20 hover:bg-emerald-500/10 transition-all"
                                                    title="Descargar Comprobante"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400 text-sm font-medium">
                                            <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-300 text-xs">
                                                Transferencia
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 min-w-[180px]">
                                            {item.status === 'pendiente' ? (
                                                <input 
                                                    type="text"
                                                    value={observations[item.id] || ''}
                                                    onChange={(e) => setObservations({
                                                        ...observations,
                                                        [item.id]: e.target.value
                                                    })}
                                                    placeholder="Motivo del rechazo..."
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                                                />
                                            ) : (
                                                <span className="text-zinc-400 text-xs">
                                                    {item.observacion || '-'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {item.status === 'pendiente' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleAction(item.id, 'aprobado')}
                                                            disabled={actionLoading !== null}
                                                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                                                        >
                                                            {actionLoading === item.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                            <span>Aprobar</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(item.id, 'rechazado')}
                                                            disabled={actionLoading !== null}
                                                            className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-all font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                                                        >
                                                            {actionLoading === item.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                                                            <span>Rechazar</span>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${item.status === 'aprobado' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                                        {item.status}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    disabled={actionLoading !== null}
                                                    className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all disabled:opacity-50 flex items-center justify-center"
                                                    title="Eliminar Registro"
                                                >
                                                    {actionLoading === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash size={14} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Custom Confirmation Modal */}
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
                                Esta acción eliminará permanentemente el registro de validación de pago. No se puede revertir.
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

            {/* Tarjeta de Datos Bancarios */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 mt-12 backdrop-blur-sm relative overflow-hidden max-w-4xl">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Receipt size={120} className="text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                    <Receipt size={20} className="text-indigo-500" />
                    Datos Bancarios del Administrador
                </h3>
                <p className="text-zinc-400 text-sm mb-6">
                    Configura la información de transferencia bancaria que visualizan los residentes.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-zinc-400">Nombre del Banco</label>
                        <input
                            type="text"
                            placeholder="Ej. BBVA, Santander..."
                            value={bankDetails.bankName}
                            onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                            className="bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all font-medium"
                        />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-zinc-400">Número de Cuenta / CLABE</label>
                        <input
                            type="text"
                            placeholder="Ej. 0123 4567 8901 2345 67"
                            value={bankDetails.accountNumber}
                            onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                            className="bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all font-medium"
                        />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-zinc-400">Concepto de Referencia</label>
                        <input
                            type="text"
                            placeholder="Ej. [Número de Unidad] + Cuota"
                            value={bankDetails.reference}
                            onChange={(e) => setBankDetails({ ...bankDetails, reference: e.target.value })}
                            className="bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all font-medium"
                        />
                    </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={saveBankDetails}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
                    >
                        Guardar Datos Bancarios
                    </button>
                </div>
            </div>

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
                            className="relative max-w-3xl w-full bg-zinc-900 border border-white/10 rounded-[2rem] p-4 overflow-hidden shadow-2xl"
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
                                className="w-full h-auto max-h-[70vh] object-contain rounded-2xl"
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
