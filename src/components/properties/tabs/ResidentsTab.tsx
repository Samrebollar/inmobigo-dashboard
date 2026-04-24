'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, Filter, Mail, Phone, MoreHorizontal, Edit, Trash2, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Resident } from '@/types/residents'
import { residentsService } from '@/services/residents-service'
import { useUserRole } from '@/hooks/use-user-role'
import { CreateResidentModal } from '@/components/residents/CreateResidentModal'
import { BulkUploadResidentsModal } from '@/components/residents/BulkUploadResidentsModal'
import { Modal } from '@/components/ui/modal'
import { Upload } from 'lucide-react'

export function ResidentsTab() {
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
            const data = await residentsService.getByCondominium(condominiumId)
            setResidents(data)
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
        } catch (error) {
            console.error("Error deleting all residents:", error)
            alert("Error al eliminar los residentes.")
        } finally {
            setIsDeletingAll(false)
            setDeleteAllModalOpen(false)
        }
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
                                <th className="px-6 py-4 font-medium text-right">Acciones</th>
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
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(resident)}
                                                    className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
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
                onSuccess={fetchResidents}
                condominiumId={condominiumId}
                residentToEdit={residentToEdit}
            />

            <BulkUploadResidentsModal
                isOpen={isBulkOpen}
                onClose={() => setIsBulkOpen(false)}
                onSuccess={fetchResidents}
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
