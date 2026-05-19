'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, TrendingUp, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Unit } from '@/types/units'
import { unitsService } from '@/services/units-service'
import { CreateUnitModal } from './CreateUnitModal'
import { Modal } from '@/components/ui/modal'
import { Upload } from 'lucide-react'

import { useDemoMode } from '@/hooks/use-demo-mode'

interface UnitsTabProps {
    onUnitsUpdated?: () => void
}

export function UnitsTab({ onUnitsUpdated }: UnitsTabProps = {}) {
    const params = useParams()
    const condominiumId = params.id as string
    const { isDemo } = useDemoMode()

    const [loading, setLoading] = useState(true)
    const [units, setUnits] = useState<Unit[]>([])
    const [search, setSearch] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isBulkOpen, setIsBulkOpen] = useState(false)

    const [unitToEdit, setUnitToEdit] = useState<Unit | null>(null)
    
    // Delete Confirmation State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Delete All State
    const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false)
    const [deleteAllStep, setDeleteAllStep] = useState(1)
    const [isDeletingAll, setIsDeletingAll] = useState(false)

    // Update All Fees State
    const [updateFeeModalOpen, setUpdateFeeModalOpen] = useState(false)
    const [newFeeValue, setNewFeeValue] = useState('')
    const [isUpdatingFees, setIsUpdatingFees] = useState(false)

    useEffect(() => {
        fetchUnits()
    }, [condominiumId])

    const fetchUnits = async () => {
        try {
            setLoading(true)
            const data = await unitsService.getByCondominium(condominiumId)
            setUnits(data)
        } catch (error: any) {
            console.error('UnitsTab Error (RAW):', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredUnits = units.filter(unit =>
        unit.unit_number.toLowerCase().includes(search.toLowerCase())
    )

    const confirmDelete = (unit: Unit) => {
        setUnitToDelete(unit)
        setDeleteModalOpen(true)
    }

    const executeDelete = async () => {
        if (!unitToDelete) return
        setIsDeleting(true)
        try {
            if (isDemo) {
                setUnits(prev => prev.filter(u => u.id !== unitToDelete.id))
            } else {
                await unitsService.delete(unitToDelete.id)
                await fetchUnits()
            }
            onUnitsUpdated?.()
        } catch (error) {
            console.error("Error deleting unit:", error)
            alert("Error al eliminar unidad.")
        } finally {
            setIsDeleting(false)
            setDeleteModalOpen(false)
            setUnitToDelete(null)
        }
    }

    const handleEdit = (unit: Unit) => {
        setUnitToEdit(unit)
        setIsCreateOpen(true)
    }

    const confirmDeleteAll = () => {
        setDeleteAllStep(1)
        setDeleteAllModalOpen(true)
    }

    const executeDeleteAll = async () => {
        try {
            setIsDeletingAll(true)
            await unitsService.deleteAll(condominiumId)
            await fetchUnits()
            onUnitsUpdated?.()
        } catch (error) {
            console.error("Error deleting all units:", error)
            alert("Error al eliminar las unidades.")
        } finally {
            setIsDeletingAll(false)
            setDeleteAllModalOpen(false)
        }
    }

    const handleUpdateAllFees = async () => {
        const fee = parseFloat(newFeeValue)
        if (isNaN(fee) || fee < 0) {
            alert('Por favor introduce un monto de cuota válido.')
            return
        }
        setIsUpdatingFees(true)
        try {
            await unitsService.updateAllFees(condominiumId, fee)
            await fetchUnits()
            onUnitsUpdated?.()
            setUpdateFeeModalOpen(false)
            setNewFeeValue('')
        } catch (error) {
            console.error('Error updating all fees:', error)
            alert('Error al actualizar las cuotas.')
        } finally {
            setIsUpdatingFees(false)
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <Input
                            placeholder="Buscar unidad..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-zinc-950 border-zinc-800 focus:border-indigo-500 rounded-xl"
                        />
                    </div>
                    
                    <div className="h-8 w-px bg-zinc-800 hidden sm:block" />

                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-xl font-black text-white tracking-tight leading-none">
                                ${units.reduce((acc, unit) => acc + (Number(unit.monto_mensual) || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">Ingreso mensual esperado</p>
                        </div>
                    </motion.div>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={() => setUpdateFeeModalOpen(true)} variant="outline" className="border-indigo-500/20 bg-indigo-500/5 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-xl px-5 py-6 transition-all duration-300 hover:scale-[1.02]">
                        <DollarSign className="mr-2 h-5 w-5" /> Actualizar Cuota
                    </Button>
                    <Button onClick={confirmDeleteAll} variant="outline" className="border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-xl px-5 py-6 transition-all duration-300 hover:scale-[1.02]">
                        <Trash2 className="mr-2 h-5 w-5" /> Borrar Todo
                    </Button>
                    <Button onClick={() => { setUnitToEdit(null); setIsCreateOpen(true) }} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 rounded-xl px-5 py-6 transition-all duration-300 hover:scale-[1.02]">
                        <Plus className="mr-2 h-5 w-5" /> Nueva Unidad
                    </Button>
                </div>
            </div>

            {/* Units Table */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-900/80 text-zinc-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">Unidad</th>
                                <th className="px-6 py-4 font-medium">Piso / Nivel</th>
                                <th className="px-6 py-4 font-medium">Tipo</th>
                                <th className="px-6 py-4 font-medium">Cuota</th>
                                <th className="px-6 py-4 font-medium">Inicio de cobro</th>
                                <th className="px-6 py-4 font-medium">Fecha limite</th>
                                <th className="px-6 py-4 font-medium">Estado de Ocupación</th>
                                <th className="px-6 py-4 font-medium">Estado cobranza</th>
                                <th className="px-6 py-4 font-medium text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredUnits.length > 0 ? (
                                filteredUnits.map((unit) => (
                                    <motion.tr
                                        key={unit.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="group hover:bg-zinc-800/30 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-medium text-white">
                                            {unit.unit_number}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400">
                                            {unit.floor}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-zinc-300">
                                                {unit.type === 'apartment' ? 'Departamento' :
                                                 unit.type === 'house' ? 'Casa' :
                                                 unit.type === 'commercial' ? 'Local Comercial' :
                                                 unit.type === 'parking' ? 'Estacionamiento' :
                                                 unit.type === 'storage' ? 'Bodega' : unit.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-300">
                                            {unit.monto_mensual ? `$${unit.monto_mensual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-300">
                                            {unit.billing_day ? `Día ${unit.billing_day}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-300">
                                            {unit.payment_deadline ? `Día ${unit.payment_deadline}` : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={unit.status === 'occupied' ? 'default' : 'warning'}>
                                                {unit.status === 'occupied' ? 'Ocupada' : 'Vacía'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={unit.billing_status === 'suspended' ? 'destructive' : 'success'}>
                                                {unit.billing_status === 'suspended' ? 'Suspendida' : 'Activa'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2.5">
                                                <button
                                                    onClick={() => handleEdit(unit)}
                                                    title="Editar Unidad"
                                                    className="p-2.5 text-indigo-400 hover:text-indigo-100 bg-indigo-500/10 hover:bg-indigo-600 rounded-xl transition-all duration-300 transform hover:scale-110 shadow-sm border border-indigo-500/20"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(unit)}
                                                    title="Eliminar Unidad"
                                                    className="p-2.5 text-rose-400 hover:text-rose-100 bg-rose-500/10 hover:bg-rose-600 rounded-xl transition-all duration-300 transform hover:scale-110 shadow-sm border border-rose-500/20"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-zinc-500">
                                        No se encontraron unidades.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateUnitModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={(newUnit) => {
                    if (isDemo && newUnit) {
                        if (unitToEdit) {
                            setUnits(prev => prev.map(u => u.id === newUnit.id ? newUnit : u))
                        } else {
                            setUnits(prev => [newUnit, ...prev])
                        }
                    } else {
                        fetchUnits()
                    }
                    onUnitsUpdated?.()
                }}
                condominiumId={condominiumId}
                unitToEdit={unitToEdit}
            />


            {/* Custom Delete Confirmation Modal */}
            <Modal isOpen={deleteModalOpen} onClose={() => !isDeleting && setDeleteModalOpen(false)}>
                <div className="p-6 text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                        <Trash2 className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-medium text-white">
                            Eliminar Unidad {unitToDelete?.unit_number}
                        </h3>
                        <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                            ¿Estás seguro de que deseas eliminar esta unidad de forma permanente? 
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
                                    ¿Eliminar TODAS las unidades?
                                </h3>
                                <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                                    Estás a punto de eliminar a <span className="text-white font-bold">todas las unidades</span> de este condominio. 
                                    <span className="block mt-1 text-rose-400/80 font-medium">Ten en cuenta que esto podría afectar a los residentes asignados.</span>
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
                                    Por favor confirma nuevamente. ¿Deseas eliminar permanentemente a <span className="font-bold underline text-white">todas</span> las unidades?
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
                                    {isDeletingAll ? 'Eliminando...' : 'Sí, Eliminar Todas'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Update All Fees Modal */}
            <Modal isOpen={updateFeeModalOpen} onClose={() => !isUpdatingFees && setUpdateFeeModalOpen(false)}>
                <div className="p-6 space-y-6">
                    <div className="mx-auto w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] animate-pulse">
                        <DollarSign className="w-8 h-8" />
                    </div>
                    <div className="space-y-2 text-center">
                        <h3 className="text-xl font-black text-white tracking-tight">
                            Actualizar Cuota de Mantenimiento
                        </h3>
                        <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed">
                            Establece una nueva cuota mensual para <span className="text-indigo-400 font-bold">todas las unidades</span> de este condominio. Esto modificará los montos de mantenimiento actuales de forma global.
                        </p>
                    </div>
                    <div className="space-y-4 max-w-xs mx-auto">
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-lg group-focus-within:text-indigo-300 transition-colors">$</span>
                            <Input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                value={newFeeValue}
                                onChange={(e) => setNewFeeValue(e.target.value)}
                                className="pl-8 bg-zinc-950/60 border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-7 text-xl font-black text-white text-center transition-all shadow-inner placeholder:text-zinc-700"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 justify-center pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setUpdateFeeModalOpen(false)}
                            disabled={isUpdatingFees}
                            className="bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-300 min-w-[120px] rounded-xl py-5"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleUpdateAllFees}
                            isLoading={isUpdatingFees}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[160px] shadow-lg shadow-indigo-600/25 rounded-xl py-5 font-bold transition-all duration-300 hover:shadow-indigo-600/40"
                        >
                            {isUpdatingFees ? 'Actualizando...' : 'Confirmar y Aplicar'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
