'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Unit } from '@/types/units'
import { unitsService } from '@/services/units-service'
import { CreateUnitModal } from './CreateUnitModal'
import { BulkUploadUnitsModal } from './BulkUploadUnitsModal'
import { Upload } from 'lucide-react'

import { useDemoMode } from '@/hooks/use-demo-mode'

export function UnitsTab() {
    const params = useParams()
    const condominiumId = params.id as string
    const { isDemo } = useDemoMode()

    const [loading, setLoading] = useState(true)
    const [units, setUnits] = useState<Unit[]>([])
    const [search, setSearch] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isBulkOpen, setIsBulkOpen] = useState(false)

    const [unitToEdit, setUnitToEdit] = useState<Unit | null>(null)

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

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta unidad?')) {
            if (isDemo) {
                setUnits(prev => prev.filter(u => u.id !== id))
                return
            }
            try {
                await unitsService.delete(id)
                await fetchUnits()
            } catch (error) {
                console.error("Error deleting unit:", error)
                alert("Error al eliminar unidad.")
            }
        }
    }

    const handleEdit = (unit: Unit) => {
        setUnitToEdit(unit)
        setIsCreateOpen(true)
    }

    const handleDeleteAll = async () => {
        if (confirm('¿ESTÁS SEGURO? Esto eliminará TODAS las unidades de este condominio. Ten en cuenta que esto podría afectar a los residentes asignados.')) {
            if (confirm('Por favor confirma nuevamente. ¿Deseas eliminar permanentemente a todas las unidades?')) {
                try {
                    setLoading(true)
                    await unitsService.deleteAll(condominiumId)
                    await fetchUnits()
                    alert('Todas las unidades han sido eliminadas.')
                } catch (error) {
                    console.error("Error deleting all units:", error)
                    alert("Error al eliminar las unidades.")
                } finally {
                    setLoading(false)
                }
            }
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
                        placeholder="Buscar unidad..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-zinc-900 border-zinc-800 focus:border-indigo-500"
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">
                        <Filter className="mr-2 h-4 w-4" /> Filtros
                    </Button>
                    <Button onClick={handleDeleteAll} variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300">
                        <Trash2 className="mr-2 h-4 w-4" /> Borrar Todo
                    </Button>
                    <Button onClick={() => setIsBulkOpen(true)} variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300">
                        <Upload className="mr-2 h-4 w-4" /> Carga Masiva
                    </Button>
                    <Button onClick={() => { setUnitToEdit(null); setIsCreateOpen(true) }} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                        <Plus className="mr-2 h-4 w-4" /> Nueva Unidad
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
                                <th className="px-6 py-4 font-medium">Monto / Cuota</th>
                                <th className="px-6 py-4 font-medium">Día Cobro</th>
                                <th className="px-6 py-4 font-medium">Estado</th>
                                <th className="px-6 py-4 font-medium text-right">Acciones</th>
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
                                            <span className="capitalize text-zinc-300">{unit.type}</span>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-300">
                                            {unit.monto_mensual ? `$${unit.monto_mensual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-300">
                                            {unit.billing_day ? `Día ${unit.billing_day}` : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={
                                                unit.status === 'occupied' ? 'default' :
                                                    unit.status === 'vacant' ? 'warning' : 'destructive'
                                            }>
                                                {unit.status === 'occupied' ? 'Ocupada' :
                                                    unit.status === 'vacant' ? 'Disponible' : 'Mantenimiento'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(unit)}
                                                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(unit.id)}
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
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
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
                }}
                condominiumId={condominiumId}
                unitToEdit={unitToEdit}
            />

            <BulkUploadUnitsModal
                isOpen={isBulkOpen}
                onClose={() => setIsBulkOpen(false)}
                onSuccess={fetchUnits}
                condominiumId={condominiumId}
            />
        </div>
    )
}
