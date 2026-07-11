'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, Filter, Mail, Phone, MoreHorizontal, Edit, Trash2, MessageCircle, Send, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { resendInvitationAction } from '@/app/actions/auth-actions'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Resident } from '@/types/residents'
import { residentsService } from '@/services/residents-service'
import { financeService } from '@/services/finance-service'
import { unitsService } from '@/services/units-service'
import { useUserRole } from '@/hooks/use-user-role'
import { CreateResidentModal } from '@/components/seguridad/CreateResidentModal'
import { UnifiedBulkUploadModal } from './UnifiedBulkUploadModal'
import { Modal } from '@/components/ui/modal'
import { Upload } from 'lucide-react'

interface ResidentsTabProps {
    onResidentsUpdated?: () => void
}

export function ResidentsTab({ onResidentsUpdated }: ResidentsTabProps = {}) {
    const { isPropiedades } = useUserRole()
    const params = useParams()
    const condominiumId = params.id as string

    const [loading, setLoading] = useState(true)
    const [residents, setResidents] = useState<Resident[]>([])
    const [search, setSearch] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isBulkOpen, setIsBulkOpen] = useState(false)
    const [residentToEdit, setResidentToEdit] = useState<Resident | null>(null)

    // Delete Configuration State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [residentToDelete, setResidentToDelete] = useState<Resident | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Delete All State
    const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false)
    const [deleteAllStep, setDeleteAllStep] = useState(1)
    const [isDeletingAll, setIsDeletingAll] = useState(false)

    useEffect(() => {
        fetchResidents()
    }, [condominiumId])

    const fetchResidents = async () => {
        try {
            setLoading(true)
            const [residentsData, invoicesData, unitsData] = await Promise.all([
                residentsService.getByCondominium(condominiumId),
                financeService.getByCondominium(condominiumId),
                unitsService.getByCondominium(condominiumId)
            ])

            // Build a unit map for quick fee lookup
            const unitMap = new Map<string, any>()
            unitsData.forEach((u: any) => unitMap.set(u.id, u))

            const today = new Date()
            const currentMonthIndex = today.getMonth()
            const dayOfMonth = today.getDate()

            // Combine data and calculate real debt
            const enrichedResidents = residentsData.map(resident => {
                // Filter invoices for this resident's unit or resident_id
                const unitInvoices = invoicesData.filter(inv =>
                    (resident.unit_id && inv.unit_id === resident.unit_id) ||
                    ((inv as any).resident_id === resident.id)
                )

                const pendingInvoices = unitInvoices.filter(i => i.status === 'pending' || i.status === 'overdue')
                const paidInvoices = unitInvoices.filter(i => i.status === 'paid').sort((a, b) => new Date(b.paid_at || '').getTime() - new Date(a.paid_at || '').getTime())

                // Invoices-based debt (facturas reales en BD)
                const invoiceDebt = pendingInvoices.reduce((sum, inv) => {
                    const bd = (inv as any).balance_due
                    return sum + (bd != null && bd > 0 ? bd : inv.amount)
                }, 0)

                // Fee-based debt: (meses activos × cuota mensual) − total pagado
                const unit = unitMap.get(resident.unit_id || '')
                const monthlyFee = Number(unit?.monto_mensual || 0)
                let feeBasedDebt = 0
                if (monthlyFee > 0) {
                    const createdAt = resident.created_at ? new Date(resident.created_at) : null
                    let firstBillingMonth = 0
                    if (createdAt) {
                        const startMonth = createdAt.getMonth()
                        firstBillingMonth = startMonth
                        // If resident started in a prior year, bill from Jan of current year
                        if (createdAt.getFullYear() < today.getFullYear()) firstBillingMonth = 0
                    }
                    // Include current month as overdue if past day 10
                    const lastBilledMonth = dayOfMonth > 10 ? currentMonthIndex : currentMonthIndex - 1
                    const activeMonths = Math.max(0, lastBilledMonth - firstBillingMonth + 1)
                    const annualTarget = monthlyFee * activeMonths
                    const totalPaid = paidInvoices.reduce((sum, inv) => {
                        const pa = (inv as any).paid_amount
                        return sum + (pa != null && pa > 0 ? pa : inv.amount)
                    }, 0)
                    feeBasedDebt = Math.max(0, annualTarget - totalPaid)
                }

                // Use the greater of the two: invoice-based or fee-based debt
                const debt = Math.max(invoiceDebt, feeBasedDebt) + Number(resident.debt_amount || 0)

                return {
                    ...resident,
                    debt_amount: debt
                }
            })

            setResidents(enrichedResidents)
        } catch (error: any) {
            console.error('Residents Tab Error (JSON):', JSON.stringify(error, null, 2))
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const filteredResidents = residents.filter(resident =>
        `${resident.first_name} ${resident.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        resident.unit_number?.toLowerCase().includes(search.toLowerCase())
    )

    const confirmDelete = (resident: Resident) => {
        setResidentToDelete(resident)
        setDeleteModalOpen(true)
    }

    const executeDelete = async () => {
        if (!residentToDelete) return
        setIsDeleting(true)
        try {
            await residentsService.delete(residentToDelete.id)
            await fetchResidents()
            onResidentsUpdated?.()
        } catch (error) {
            console.error("Error deleting resident:", error)
            alert("Error al eliminar el residente.")
        } finally {
            setIsDeleting(false)
            setDeleteModalOpen(false)
            setResidentToDelete(null)
        }
    }

    const handleEdit = (resident: Resident) => {
        setResidentToEdit(resident)
        setIsCreateOpen(true)
    }

    const openWhatsApp = (phone: string) => {
        const cleanPhone = phone.replace(/[^0-9]/g, '')
        window.open(`https://wa.me/${cleanPhone}`, '_blank')
    }

    const confirmDeleteAll = () => {
        setDeleteAllStep(1)
        setDeleteAllModalOpen(true)
    }

    const executeDeleteAll = async () => {
        try {
            setIsDeletingAll(true)
            await residentsService.deleteAll(condominiumId)
            await fetchResidents()
            onResidentsUpdated?.()
        } catch (error) {
            console.error("Error deleting all residents:", error)
            alert("Error al eliminar los residentes.")
        } finally {
            setIsDeletingAll(false)
            setDeleteAllModalOpen(false)
        }
    }

    const handleResendInvitation = async (email: string) => {
        if (!email) {
            toast.error('Este residente no tiene un correo electrónico configurado.');
            return;
        }

        const promise = resendInvitationAction(email);

        toast.promise(promise, {
            loading: 'Reenviando invitación...',
            success: (data) => {
                if (!data.success) throw new Error(data.error);
                return 'Correo de invitación enviado exitosamente.';
            },
            error: (err) => `No se pudo enviar la invitación: ${err.message}`
        });
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Total Residents Stat Panel */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total de Residentes</p>
                        <p className="text-2xl font-black text-white leading-none mt-1">
                            {residents.length} <span className="text-xs text-zinc-500 font-normal lowercase">registrados actualmente</span>
                        </p>
                    </div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">
                    Sincronizado
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                        placeholder={isPropiedades ? 'Buscar inquilino...' : 'Buscar residente...'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-zinc-900 border-zinc-800 focus:border-indigo-500"
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">
                        <Filter className="mr-2 h-4 w-4" /> Filtros
                    </Button>
                    <Button onClick={confirmDeleteAll} variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300">
                        <Trash2 className="mr-2 h-4 w-4" /> Borrar Todos
                    </Button>
                    <Button onClick={() => setIsBulkOpen(true)} variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300">
                        <Upload className="mr-2 h-4 w-4" /> Carga Masiva
                    </Button>
                    <Button onClick={() => { setResidentToEdit(null); setIsCreateOpen(true) }} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                        <Plus className="mr-2 h-4 w-4" /> {isPropiedades ? 'Nuevo Inquilino' : 'Nuevo Residente'}
                    </Button>
                </div>
            </div>

            {/* Residents Table */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-900/80 text-zinc-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">Nombre</th>
                                <th className="px-6 py-4 font-medium">Unidad</th>
                                <th className="px-6 py-4 font-medium">Contacto</th>
                                <th className="px-6 py-4 font-medium">Vehículos</th>
                                <th className="px-6 py-4 font-medium">Estado</th>
                                <th className="px-6 py-4 font-medium">Saldo Pendiente</th>
                                <th className="px-6 py-4 font-medium">Saldo a Favor</th>
                                <th className="px-6 py-4 font-medium text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredResidents.length > 0 ? (
                                filteredResidents.map((resident) => (
                                    <motion.tr
                                        key={resident.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="group hover:bg-zinc-800/30 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-medium text-white">
                                            {resident.first_name} {resident.last_name}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-indigo-400">
                                            {resident.unit_number || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Mail className="h-3 w-3" /> {resident.email}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Phone className="h-3 w-3" /> {resident.phone}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {resident.vehicles && resident.vehicles.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {resident.vehicles.map((v, i) => (
                                                        <div key={v.id || i} className="flex items-center gap-2 text-xs">
                                                            <span className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-white border border-zinc-700">
                                                                {v.plate}
                                                            </span>
                                                            <span className="text-zinc-500">{v.brand}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-zinc-600 text-xs italic">Sin vehículos</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={
                                                resident.status === 'active' ? 'success' :
                                                    resident.status === 'delinquent' ? 'destructive' : 'default'
                                            }>
                                                {resident.status === 'active' ? 'Activo' :
                                                    resident.status === 'delinquent' ? 'Moroso' : 'Inactivo'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={resident.debt_amount > 0 ? 'text-rose-400 font-medium' : 'text-zinc-400'}>
                                                {resident.debt_amount > 0 ? `$${resident.debt_amount.toLocaleString()}` : '$0.00'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={(resident.credit_amount || 0) > 0 ? 'text-emerald-400 font-medium' : 'text-zinc-400'}>
                                                {(resident.credit_amount || 0) > 0 ? `$${(resident.credit_amount || 0).toLocaleString()}` : '$0.00'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleResendInvitation(resident.email)}
                                                    className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                                    title="Reenviar invitación de acceso"
                                                >
                                                    <Send className="h-4 w-4" />
                                                </button>
                                                {resident.status === 'delinquent' && (
                                                    <button
                                                        onClick={() => openWhatsApp(resident.phone)}
                                                        className="p-2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                        title="Enviar WhatsApp"
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(resident)}
                                                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                                                    title="Editar residente"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(resident)}
                                                    className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                    title="Eliminar residente"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>

                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                                        {isPropiedades ? 'No se encontraron inquilinos.' : 'No se encontraron residentes.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateResidentModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => {
                    fetchResidents()
                    onResidentsUpdated?.()
                }}
                condominiumId={condominiumId}
                residentToEdit={residentToEdit}
            />

            <UnifiedBulkUploadModal
                isOpen={isBulkOpen}
                onClose={() => setIsBulkOpen(false)}
                onSuccess={() => {
                    fetchResidents()
                    onResidentsUpdated?.()
                }}
                condominiumId={condominiumId}
            />

            {/* Custom Delete Confirmation Modal */}
            <Modal isOpen={deleteModalOpen} onClose={() => !isDeleting && setDeleteModalOpen(false)}>
                <div className="p-6 text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                        <Trash2 className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-medium text-white">
                            Eliminar Residente: {residentToDelete?.first_name} {residentToDelete?.last_name}
                        </h3>
                        <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                            ¿Estás seguro de que deseas eliminar a este residente permanentemente? 
                            <span className="block mt-1 text-rose-400/80 font-medium">Esta acción no se puede deshacer.</span>
                        </p>
                    </div>
                    <div className="flex gap-3 justify-center pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteModalOpen(false)}
                            disabled={isDeleting}
                            className="bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-300 min-w-[120px]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={executeDelete}
                            isLoading={isDeleting}
                            className="bg-rose-600 hover:bg-rose-500 text-white min-w-[120px] shadow-lg shadow-rose-600/20"
                        >
                            {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Two-Step Delete All Confirmation Modal */}
            <Modal isOpen={deleteAllModalOpen} onClose={() => !isDeletingAll && setDeleteAllModalOpen(false)}>
                <div className="p-6 text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                        <Trash2 className="w-8 h-8" />
                    </div>
                    
                    {deleteAllStep === 1 ? (
                        <>
                            <div className="space-y-2">
                                <h3 className="text-xl font-medium text-white">
                                    ¿Eliminar TODOS los residentes?
                                </h3>
                                <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                                    Estás a punto de eliminar a <span className="text-white font-bold">todos los residentes</span> de este condominio. 
                                    <span className="block mt-1 text-rose-400/80 font-medium">Esta acción impactará a todas las unidades.</span>
                                </p>
                            </div>
                            <div className="flex gap-3 justify-center pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteAllModalOpen(false)}
                                    className="bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-300 min-w-[120px]"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={() => setDeleteAllStep(2)}
                                    className="bg-rose-600 hover:bg-rose-500 text-white min-w-[120px] shadow-lg shadow-rose-600/20"
                                >
                                    Continuar
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-rose-500">
                                    Confirmación Final Requerida
                                </h3>
                                <p className="text-zinc-300 text-sm max-w-sm mx-auto">
                                    Por favor confirma nuevamente. ¿Deseas eliminar permanentemente a <span className="font-bold underline text-white">todos</span> los residentes?
                                    <span className="block mt-2 text-rose-400 font-bold uppercase tracking-wider text-xs">Esta acción es irreversible</span>
                                </p>
                            </div>
                            <div className="flex gap-3 justify-center pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteAllModalOpen(false)}
                                    disabled={isDeletingAll}
                                    className="bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-300 min-w-[120px]"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={executeDeleteAll}
                                    isLoading={isDeletingAll}
                                    className="bg-rose-600 hover:bg-rose-500 text-white min-w-[120px] shadow-lg shadow-rose-600/20"
                                >
                                    {isDeletingAll ? 'Eliminando...' : 'Sí, Eliminar Todos'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    )
}

