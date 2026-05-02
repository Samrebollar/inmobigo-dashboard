'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, FileText, Filter, Eye, Loader2, CheckCircle, AlertTriangle, Receipt, Trash, Download } from 'lucide-react'
import { toast } from 'sonner'
import { getValidations, updateValidationStatus, deleteValidation, syncApprovedValidations } from '@/app/actions/payment-validation-actions'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { createClient } from '@/utils/supabase/client'

import { Plus, Pencil } from 'lucide-react'
import { getBankAccounts, saveBankAccount, deleteBankAccount } from '@/app/actions/bank-account-actions'
import { propertiesService } from '@/services/properties-service'

interface PaymentValidationClientProps {
    organizationId: string
}

export function PaymentValidationClient({ organizationId }: PaymentValidationClientProps) {
    const [validations, setValidations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [filter, setFilter] = useState<'pendiente' | 'aprobado' | 'rechazado'>('pendiente')
    const [selectedProof, setSelectedProof] = useState<string | null>(null)
    const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null)
    const [observations, setObservations] = useState<{ [key: string]: string }>({})

    const [propertyFilter, setPropertyFilter] = useState<string>('todos')
    const [properties, setProperties] = useState<any[]>([])
    
    // Bank Accounts State
    const [bankAccounts, setBankAccounts] = useState<any[]>([])
    const [showBankModal, setShowBankModal] = useState(false)
    const [editingAccount, setEditingAccount] = useState<any | null>(null)
    const [bankForm, setBankForm] = useState({
        condominium_id: '',
        bank_name: '',
        account_number: '',
        reference: ''
    })

    const supabase = createClient()

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true)
            // Load Properties
            try {
                const props = await propertiesService.getByOrganization(organizationId)
                setProperties(props)
            } catch (e) {
                console.error('Error loading properties:', e)
            }
            
            // Load Bank Accounts
            const accountsRes = await getBankAccounts()
            if (accountsRes.success) {
                setBankAccounts(accountsRes.data)
            }
            
            await fetchData()
            setLoading(false)
        }
        loadInitialData()

        // Suscripción Realtime
        const channel = supabase
            .channel('public:payment_validations_admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_validations' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, async () => {
                const res = await getBankAccounts()
                if (res.success) setBankAccounts(res.data)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [organizationId])

    const fetchData = async () => {
        const res = await getValidations()
        if (res.success) {
            setValidations(res.data)
        } else {
            toast.error(res.error)
        }
    }

    const handleSaveBankAccount = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!bankForm.condominium_id || !bankForm.bank_name || !bankForm.account_number) {
            toast.error('Completa los campos obligatorios')
            return
        }

        const res = await saveBankAccount({
            ...bankForm,
            id: editingAccount?.id
        })

        if (res.success) {
            toast.success(editingAccount ? 'Cuenta actualizada' : 'Cuenta agregada')
            setShowBankModal(false)
            setEditingAccount(null)
            setBankForm({ condominium_id: '', bank_name: '', account_number: '', reference: '' })
            const accountsRes = await getBankAccounts()
            if (accountsRes.success) setBankAccounts(accountsRes.data)
        } else {
            toast.error(res.error)
        }
    }

    const handleDeleteAccount = async (id: string) => {
        if (!confirm('¿Eliminar esta cuenta bancaria?')) return
        const res = await deleteBankAccount(id)
        if (res.success) {
            toast.success('Cuenta eliminada')
            const accountsRes = await getBankAccounts()
            if (accountsRes.success) setBankAccounts(accountsRes.data)
        } else {
            toast.error(res.error)
        }
    }

    const openEditAccount = (account: any) => {
        setEditingAccount(account)
        setBankForm({
            condominium_id: account.condominium_id,
            bank_name: account.bank_name,
            account_number: account.account_number,
            reference: account.reference || ''
        })
        setShowBankModal(true)
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
            doc.setFontSize(12)
            doc.setTextColor(40, 40, 40)
            doc.setFont('helvetica', 'bold')
            doc.text('INFORMACIÓN DEL RESIDENTE', 14, 50)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`Nombre: ${item.resident_name}`, 14, 60)
            doc.text(`Unidad: ${item.unit}`, 14, 66)
            doc.setDrawColor(220, 220, 220)
            doc.line(14, 80, 196, 80)
            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.text('DETALLES DEL PAGO', 14, 92)
            const tableColumn = ["Concepto", "Monto Pagado", "Forma de Pago", "Fecha"]
            const tableRows = [[item.nota || "Cuota de Mantenimiento", `$${Number(item.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, "Transferencia", item.date]]
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
            doc.setFontSize(8)
            doc.setTextColor(150, 150, 150)
            doc.setFont('helvetica', 'normal')
            doc.text('Este documento es un comprobante de operación digital generado por InmobiGo SaaS.', 14, 275)
            doc.text('Conserve este recibo para cualquier aclaración futura.', 14, 281)
            doc.save(`Recibo_${item.resident_name.replace(/\s+/g, '_')}.pdf`)
            toast.success('Comprobante PDF generado')
        } catch (e) {
            console.error(e)
            toast.error('Error al generar PDF')
        }
    }

    const filteredValidations = validations.filter(v => {
        const matchesStatus = v.status === filter
        const matchesProperty = propertyFilter === 'todos' || v.condominium_id === propertyFilter
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
                    <select
                        value={propertyFilter}
                        onChange={(e) => setPropertyFilter(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-all cursor-pointer h-[38px]"
                    >
                        <option value="todos">Todas las Propiedades</option>
                        {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl gap-1">
                        <button onClick={() => setFilter('pendiente')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === 'pendiente' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-zinc-400 hover:text-white'}`}>Pendientes</button>
                        <button onClick={() => setFilter('aprobado')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === 'aprobado' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-zinc-400 hover:text-white'}`}>Aprobados</button>
                        <button onClick={() => setFilter('rechazado')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === 'rechazado' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'text-zinc-400 hover:text-white'}`}>Rechazados</button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
            ) : (
                <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-md">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Propiedad</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Unidad</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Residente</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Concepto</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Monto</th>
                                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredValidations.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20">
                                                {item.condominiums?.name || item.residents?.condominiums?.name || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-300 font-semibold">{item.unit}</td>
                                        <td className="px-6 py-4 font-bold text-white">{item.resident_name}</td>
                                        <td className="px-6 py-4 text-zinc-400 max-w-[150px] truncate">{item.nota || 'Mantenimiento'}</td>
                                        <td className="px-6 py-4 text-zinc-300">{item.date}</td>
                                        <td className="px-6 py-4 text-center font-black text-emerald-400">${Number(item.amount).toLocaleString('es-MX')}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => setSelectedProof(item.comprobante_url)} className="p-2 rounded-xl bg-white/[0.03] text-zinc-400 hover:text-indigo-400 transition-all"><Eye size={18} /></button>
                                                {item.status === 'pendiente' ? (
                                                    <>
                                                        <button onClick={() => handleAction(item.id, 'aprobado')} className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold text-xs">Aprobar</button>
                                                        <button onClick={() => handleAction(item.id, 'rechazado')} className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 font-bold text-xs">Rechazar</button>
                                                    </>
                                                ) : (
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${item.status === 'aprobado' ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>{item.status}</span>
                                                )}
                                                <button onClick={() => setDeleteConfirmation(item.id)} className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"><Trash size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Bank Accounts Section */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 mt-12 relative overflow-hidden backdrop-blur-xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            <Receipt className="text-indigo-500" size={28} />
                            Cuentas Bancarias de Propiedades
                        </h3>
                        <p className="text-zinc-400 text-sm mt-1">Configura las cuentas que verán los residentes de cada propiedad.</p>
                    </div>
                    <button 
                        onClick={() => { setEditingAccount(null); setBankForm({ condominium_id: '', bank_name: '', account_number: '', reference: '' }); setShowBankModal(true); }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 flex items-center gap-2 transition-all transform hover:scale-105"
                    >
                        <Plus size={20} />
                        Agregar Cuenta
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bankAccounts.length === 0 ? (
                        <div className="col-span-full py-12 text-center bg-zinc-950/30 border border-zinc-800/50 border-dashed rounded-3xl">
                            <Receipt size={48} className="mx-auto mb-4 text-zinc-700 opacity-20" />
                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No hay cuentas configuradas</p>
                        </div>
                    ) : bankAccounts.map(acc => (
                        <div key={acc.id} className="bg-zinc-950/50 border border-zinc-800/80 rounded-3xl p-6 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                                <button onClick={() => openEditAccount(acc)} className="p-2 bg-zinc-900 rounded-lg text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-xl"><Pencil size={14} /></button>
                                <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 bg-zinc-900 rounded-lg text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-xl"><Trash size={14} /></button>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 mb-4 inline-block">
                                {acc.condominiums?.name || 'S/N'}
                            </span>
                            <h4 className="text-lg font-black text-white mb-1">{acc.bank_name}</h4>
                            <p className="text-indigo-300 font-mono text-sm tracking-widest mb-4">{acc.account_number}</p>
                            <div className="pt-4 border-t border-zinc-800/50">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Referencia</span>
                                <p className="text-xs text-zinc-300 italic">"{acc.reference || 'N/A'}"</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bank Modal */}
            <AnimatePresence>
                {showBankModal && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBankModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 shadow-2xl overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600" />
                            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500"><Plus size={24} /></div>
                                {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria'}
                            </h3>
                            <form onSubmit={handleSaveBankAccount} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Propiedad / Condominio</label>
                                    <select 
                                        value={bankForm.condominium_id}
                                        onChange={(e) => setBankForm({ ...bankForm, condominium_id: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="">Seleccionar Propiedad...</option>
                                        {properties.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Banco</label>
                                        <input type="text" value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white text-sm font-bold" placeholder="Ej. BBVA" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Cuenta / CLABE</label>
                                        <input type="text" value={bankForm.account_number} onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-indigo-400 text-sm font-mono font-bold" placeholder="0123..." required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Concepto / Referencia</label>
                                    <input type="text" value={bankForm.reference} onChange={(e) => setBankForm({ ...bankForm, reference: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white text-sm font-bold" placeholder="Ej. Unidad + Nombre" />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowBankModal(false)} className="flex-1 py-4 rounded-2xl bg-zinc-800 text-zinc-400 font-black text-sm hover:bg-zinc-700 transition-all">Cancelar</button>
                                    <button type="submit" className="flex-2 px-10 py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all">Guardar Cuenta</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Existing Proof Preview & Delete Modals remain unchanged but z-index should be checked */}
            <AnimatePresence>
                {selectedProof && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProof(null)} className="absolute inset-0 bg-black/95 backdrop-blur-xl" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative max-w-4xl w-full bg-zinc-900 border border-white/10 rounded-[3rem] p-6 shadow-2xl">
                            <button onClick={() => setSelectedProof(null)} className="absolute -top-12 right-0 p-2 text-white hover:text-indigo-400 transition-all flex items-center gap-2 font-bold"><X size={24} /> Cerrar</button>
                            <img src={selectedProof} alt="Comprobante" className="w-full h-auto max-h-[80vh] object-contain rounded-3xl" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {deleteConfirmation && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirmation(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 text-center shadow-2xl">
                            <div className="p-4 bg-rose-500/10 rounded-full w-fit mx-auto mb-6 text-rose-500"><AlertTriangle size={40} className="animate-pulse" /></div>
                            <h3 className="text-2xl font-black text-white mb-2">¿Eliminar Registro?</h3>
                            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">Esta acción eliminará permanentemente el comprobante de pago. ¿Estás seguro de continuar?</p>
                            <div className="flex gap-4">
                                <button onClick={() => setDeleteConfirmation(null)} className="flex-1 py-4 rounded-2xl bg-zinc-800 text-zinc-400 font-bold text-sm">Cancelar</button>
                                <button onClick={confirmDelete} className="flex-1 py-4 rounded-2xl bg-rose-600 text-white font-bold text-sm shadow-xl shadow-rose-600/20">Sí, Eliminar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
