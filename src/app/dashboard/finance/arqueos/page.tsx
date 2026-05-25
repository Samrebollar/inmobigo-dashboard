'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Search, History, Calendar, Calculator, TrendingUp, TrendingDown, CheckCircle2, Pencil, FileText, Trash2, User } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Modal } from '@/components/ui/modal'
import { Label } from '@/components/ui/label'

interface CashRegister {
    id: string
    condominium_name: string
    expected_amount: number
    counted_amount: number
    difference: number
    notes: string
    created_at: string
    created_by?: string
    created_by_name?: string
    profiles?: {
        full_name?: string
        first_name?: string
        last_name?: string
    }
}

export default function ArqueosHistoryPage() {
    const supabase = createClient()
    const [arqueos, setArqueos] = useState<CashRegister[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Action States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [arqueoToEdit, setArqueoToEdit] = useState<CashRegister | null>(null)
    const [editCounted, setEditCounted] = useState('')
    const [editNotes, setEditNotes] = useState('')
    const [isEditing, setIsEditing] = useState(false)

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [arqueoToDelete, setArqueoToDelete] = useState<CashRegister | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        fetchArqueos()
    }, [])

    const fetchArqueos = async () => {
        try {
            setLoading(true)
            const { data: userData } = await supabase.auth.getUser()
            const user = userData?.user
            if (!user) return

            const { data: orgUser } = await supabase
                .from('organization_users')
                .select('organization_id')
                .eq('user_id', user.id)
                .maybeSingle()

            if (!orgUser) return

            const { data, error } = await supabase
                .from('cash_registers')
                .select('*')
                .eq('organization_id', orgUser.organization_id)
                .order('created_at', { ascending: false })

            if (error) {
                if (error.code === '42P01') {
                    // Table doesn't exist yet
                    console.warn('cash_registers table does not exist')
                    return
                }
                throw error
            }

            let registers = data || []
            
            // Manual join with profiles
            if (registers.length > 0) {
                const userIds = Array.from(new Set(registers.map(r => r.created_by).filter(Boolean)))
                if (userIds.length > 0) {
                    const { data: profilesData } = await supabase
                        .from('profiles')
                        .select('id, full_name, first_name, last_name')
                        .in('id', userIds)

                    if (profilesData && profilesData.length > 0) {
                        registers = registers.map(reg => {
                            const profile = profilesData.find(p => p.id === reg.created_by)
                            return profile ? { 
                                ...reg, 
                                profiles: { 
                                    full_name: profile.full_name,
                                    first_name: profile.first_name,
                                    last_name: profile.last_name
                                } 
                            } : reg
                        })
                    }
                }
            }

            setArqueos(registers)
        } catch (error: any) {
            console.error('Error fetching arqueos:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredArqueos = arqueos.filter(arq => 
        arq.condominium_name.toLowerCase().includes(search.toLowerCase()) ||
        (arq.notes || '').toLowerCase().includes(search.toLowerCase())
    )

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount)
    }

    const formatDate = (dateStr: string) => {
        try {
            return format(parseISO(dateStr), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })
        } catch (e) {
            return dateStr
        }
    }

    const handleEdit = (arq: CashRegister) => {
        setArqueoToEdit(arq)
        setEditCounted(arq.counted_amount.toString())
        setEditNotes(arq.notes || '')
        setIsEditModalOpen(true)
    }

    const saveEdit = async () => {
        if (!arqueoToEdit) return
        try {
            setIsEditing(true)
            const newCounted = parseFloat(editCounted) || 0
            const newDifference = newCounted - arqueoToEdit.expected_amount

            const { error } = await supabase
                .from('cash_registers')
                .update({
                    counted_amount: newCounted,
                    difference: newDifference,
                    notes: editNotes.trim()
                })
                .eq('id', arqueoToEdit.id)

            if (error) throw error

            setArqueos(prev => prev.map(a => a.id === arqueoToEdit.id ? { ...a, counted_amount: newCounted, difference: newDifference, notes: editNotes.trim() } : a))
            setIsEditModalOpen(false)
        } catch (error: any) {
            console.error('Error updating arqueo:', error)
            alert('Error al actualizar: ' + error.message)
        } finally {
            setIsEditing(false)
        }
    }

    const confirmDelete = (arq: CashRegister) => {
        setArqueoToDelete(arq)
        setIsDeleteModalOpen(true)
    }

    const executeDelete = async () => {
        if (!arqueoToDelete) return
        try {
            setIsDeleting(true)
            const { error } = await supabase
                .from('cash_registers')
                .delete()
                .eq('id', arqueoToDelete.id)

            if (error) throw error

            setArqueos(prev => prev.filter(a => a.id !== arqueoToDelete.id))
            setIsDeleteModalOpen(false)
        } catch (error: any) {
            console.error('Error deleting arqueo:', error)
            alert('Error al eliminar: ' + error.message)
        } finally {
            setIsDeleting(false)
        }
    }

    const handleExportPDF = (arq: CashRegister) => {
        const doc = new jsPDF()
        
        doc.setFontSize(20)
        doc.setTextColor(79, 70, 229)
        doc.text('InmobiGo - Arqueo de Caja', 14, 22)
        
        doc.setFontSize(11)
        doc.setTextColor(50, 50, 50)
        doc.text(`Fecha y Hora: ${formatDate(arq.created_at)}`, 14, 32)
        doc.text(`Propiedad: ${arq.condominium_name}`, 14, 38)
        
        const responsable = arq.created_by_name || arq.profiles?.full_name || (arq.profiles?.first_name ? `${arq.profiles.first_name} ${arq.profiles.last_name || ''}` : 'Usuario Desconocido')
        doc.text(`Responsable: ${responsable}`, 14, 44)

        autoTable(doc, {
            startY: 55,
            head: [['Concepto', 'Monto']],
            body: [
                ['Total Efectivo en Sistema', formatCurrency(arq.expected_amount)],
                ['Total Contado Físicamente', formatCurrency(arq.counted_amount)],
                ['Diferencia', formatCurrency(arq.difference)]
            ],
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }
        })

        if (arq.notes) {
            doc.text('Observaciones:', 14, (doc as any).lastAutoTable.finalY + 15)
            doc.setFont('helvetica', 'italic')
            doc.text(arq.notes, 14, (doc as any).lastAutoTable.finalY + 22)
            doc.setFont('helvetica', 'normal')
        }

        doc.save(`Arqueo_${arq.condominium_name}_${format(parseISO(arq.created_at), 'yyyy-MM-dd')}.pdf`)
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/finance/billing" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <History className="text-indigo-400 h-6 w-6" />
                            <h1 className="text-2xl font-bold tracking-tight text-white">Historial de Arqueos</h1>
                        </div>
                        <p className="text-zinc-400">Registro detallado de todos los cierres de caja realizados.</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                        placeholder="Buscar por propiedad u observaciones..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-zinc-900 border-zinc-800 focus:border-indigo-500 text-white"
                    />
                </div>
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto min-h-[400px]">
                    <div className="inline-block min-w-full align-middle">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800/80">
                                <tr>
                                    <th className="px-6 py-4 font-medium min-w-[200px] text-center">Fecha y Hora</th>
                                    <th className="px-6 py-4 font-medium min-w-[150px]">Propiedad</th>
                                    <th className="px-6 py-4 font-medium min-w-[180px]">Responsable</th>
                                    <th className="px-6 py-4 font-medium min-w-[120px]">Sistema</th>
                                    <th className="px-6 py-4 font-medium min-w-[120px]">Físico</th>
                                    <th className="px-6 py-4 font-medium min-w-[150px]">Diferencia</th>
                                    <th className="px-6 py-4 font-medium min-w-[250px]">Observaciones</th>
                                    <th className="px-6 py-4 font-medium min-w-[150px] text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={8} className="px-6 py-4">
                                                <div className="h-4 bg-zinc-800/50 rounded animate-pulse" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredArqueos.length > 0 ? (
                                    filteredArqueos.map((arq, index) => (
                                        <motion.tr 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            key={arq.id} 
                                            className="group hover:bg-zinc-800/30 transition-colors"
                                        >
                                            <td className="px-6 py-4 text-zinc-300">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Calendar className="h-4 w-4 text-zinc-500" />
                                                    {formatDate(arq.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-white">
                                                {arq.condominium_name}
                                            </td>
                                            <td className="px-6 py-4 text-zinc-300">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-zinc-800 rounded-full p-1">
                                                        <User className="h-3 w-3 text-zinc-400" />
                                                    </div>
                                                    {arq.created_by_name || arq.profiles?.full_name || (arq.profiles?.first_name ? `${arq.profiles.first_name} ${arq.profiles.last_name || ''}` : 'Usuario Desconocido')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-400">
                                                {formatCurrency(arq.expected_amount)}
                                            </td>
                                            <td className="px-6 py-4 text-white font-medium">
                                                {formatCurrency(arq.counted_amount)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {arq.difference === 0 ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1 gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Cuadrada
                                                    </Badge>
                                                ) : arq.difference > 0 ? (
                                                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 px-3 py-1 gap-1">
                                                        <TrendingUp className="h-3 w-3" /> +{formatCurrency(arq.difference)}
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 px-3 py-1 gap-1">
                                                        <TrendingDown className="h-3 w-3" /> -{formatCurrency(Math.abs(arq.difference))}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-zinc-400 max-w-xs truncate" title={arq.notes || 'Sin observaciones'}>
                                                {arq.notes ? (
                                                    <span className="italic">"{arq.notes}"</span>
                                                ) : (
                                                    <span className="text-zinc-600">---</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <motion.button 
                                                        whileHover={{ scale: 1.1 }} 
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleEdit(arq)}
                                                        className="p-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-colors group relative"
                                                    >
                                                        <Pencil size={16} />
                                                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-zinc-800">Editar</span>
                                                    </motion.button>
                                                    <motion.button 
                                                        whileHover={{ scale: 1.1 }} 
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleExportPDF(arq)}
                                                        className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors group relative"
                                                    >
                                                        <FileText size={16} />
                                                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-zinc-800">Imprimir</span>
                                                    </motion.button>
                                                    <motion.button 
                                                        whileHover={{ scale: 1.1 }} 
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => confirmDelete(arq)}
                                                        className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-colors group relative"
                                                    >
                                                        <Trash2 size={16} />
                                                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-zinc-800">Borrar</span>
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-zinc-500">
                                                <History className="h-12 w-12 mb-4 opacity-20" />
                                                <p className="text-lg font-medium text-zinc-400">No hay arqueos registrados</p>
                                                <p className="text-sm mt-1">Cuando realices arqueos diarios, aparecerán aquí.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>

            {/* Modals */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Editar Arqueo de Caja"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="counted">Monto Físico Contado</Label>
                        <Input
                            id="counted"
                            type="number"
                            value={editCounted}
                            onChange={(e) => setEditCounted(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 focus:border-amber-500/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="notes">Observaciones</Label>
                        <textarea
                            id="notes"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-white resize-none"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                        <Button 
                            onClick={saveEdit} 
                            disabled={isEditing}
                            className="bg-amber-600 hover:bg-amber-500 text-white"
                        >
                            {isEditing ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Eliminar Arqueo"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                        ¿Estás seguro de que deseas eliminar este arqueo? Esta acción no se puede deshacer y el registro se perderá permanentemente.
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                        <Button 
                            variant="destructive" 
                            onClick={executeDelete} 
                            disabled={isDeleting}
                            className="bg-rose-600 hover:bg-rose-500"
                        >
                            {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
