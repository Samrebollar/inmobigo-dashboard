'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    PawPrint,
    Plus,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Trash2,
    Home,
    Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
    getPetsByResidentServer,
    getPetsByCondominiumServer,
    deletePetServer,
    reportPetLostServer,
    reportPetFoundServer,
} from '@/app/actions/pet-actions'
import { CreatePetModal } from '@/components/mascotas/CreatePetModal'
import { toast } from 'sonner'

interface ResidentPetsClientProps {
    resident: any
}

const ESPECIES_LABEL: Record<string, string> = { perro: 'Perro', gato: 'Gato', otro: 'Otro' }

export default function ResidentPetsClient({ resident }: ResidentPetsClientProps) {
    const [loading, setLoading] = useState(true)
    const [myPets, setMyPets] = useState<any[]>([])
    const [directory, setDirectory] = useState<any[]>([])
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [petToDelete, setPetToDelete] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [petToReportLost, setPetToReportLost] = useState<any | null>(null)
    const [lostNotes, setLostNotes] = useState('')
    const [submittingAction, setSubmittingAction] = useState<string | null>(null)

    useEffect(() => {
        if (resident?.id) fetchAll()
    }, [resident?.id])

    const fetchAll = async () => {
        try {
            setLoading(true)
            const [mine, condo] = await Promise.all([
                getPetsByResidentServer(resident.id),
                getPetsByCondominiumServer(resident.condominium_id, resident.id),
            ])
            if (mine.success) setMyPets(mine.pets || [])
            if (condo.success) setDirectory(condo.pets || [])
        } catch (error) {
            console.error('Error fetching pets:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id)
            const res = await deletePetServer(id)
            if (res.success) {
                setMyPets(prev => prev.filter(p => p.id !== id))
                setPetToDelete(null)
                toast.success('Mascota eliminada.')
            } else {
                toast.error('No se pudo eliminar la mascota.')
            }
        } finally {
            setDeletingId(null)
        }
    }

    const handleReportLost = async () => {
        if (!petToReportLost) return
        try {
            setSubmittingAction(petToReportLost.id)
            const res = await reportPetLostServer(petToReportLost.id, lostNotes || undefined)
            if (res.success) {
                toast.success(`Se aviso a todos los vecinos de tu privada sobre ${petToReportLost.name}.`)
                setPetToReportLost(null)
                setLostNotes('')
                fetchAll()
            } else {
                toast.error(res.error || 'No se pudo reportar la mascota.')
            }
        } finally {
            setSubmittingAction(null)
        }
    }

    const handleReportFound = async (pet: any) => {
        try {
            setSubmittingAction(pet.id)
            const res = await reportPetFoundServer(pet.id)
            if (res.success) {
                toast.success(`Se aviso a tus vecinos que ${pet.name} ya aparecio.`)
                fetchAll()
            } else {
                toast.error(res.error || 'No se pudo actualizar la mascota.')
            }
        } finally {
            setSubmittingAction(null)
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-10 p-6 md:p-10 animate-in fade-in duration-500">
            <div className="space-y-2">
                <h1 className="text-4xl font-black text-white tracking-tight">Mascotas</h1>
                <p className="text-zinc-400 text-lg">Registra a tus mascotas y avisa a tus vecinos si se pierden.</p>
            </div>

            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <PawPrint className="h-6 w-6 text-amber-400" />
                    Mis mascotas
                </h2>
                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black px-5 shadow-lg shadow-amber-600/20 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Registrar mascota
                </Button>
            </div>

            {loading ? (
                <div className="flex h-[200px] items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                </div>
            ) : myPets.length === 0 ? (
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] flex flex-col items-center justify-center h-[220px] text-zinc-500 space-y-4">
                    <PawPrint className="h-16 w-16 opacity-20" />
                    <p className="text-lg font-medium">Aun no has registrado ninguna mascota.</p>
                    <Button variant="ghost" className="text-amber-400" onClick={() => setIsCreateOpen(true)}>
                        Registrar mi primera mascota
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myPets.map((pet, i) => (
                        <motion.div
                            key={pet.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * i }}
                            className={cn(
                                'bg-zinc-900/40 backdrop-blur-sm border rounded-[2rem] overflow-hidden shadow-xl',
                                pet.status === 'perdida' ? 'border-rose-500/40' : 'border-zinc-800/50'
                            )}
                        >
                            <div className="w-full aspect-video bg-zinc-950 relative">
                                {pet.photo_url ? (
                                    <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <PawPrint className="h-14 w-14 text-zinc-700" />
                                    </div>
                                )}
                                {pet.status === 'perdida' && (
                                    <div className="absolute top-3 right-3">
                                        <Badge className="bg-rose-500/90 text-white border-0 font-black px-3 py-1 rounded-lg shadow-lg flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" /> Perdida
                                        </Badge>
                                    </div>
                                )}
                            </div>
                            <div className="p-5 space-y-3">
                                <div>
                                    <h3 className="text-lg font-black text-white">{pet.name}</h3>
                                    <p className="text-zinc-400 text-xs">
                                        {ESPECIES_LABEL[pet.species] || pet.species}
                                        {pet.breed ? ` · ${pet.breed}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {pet.status === 'perdida' ? (
                                        <Button
                                            onClick={() => handleReportFound(pet)}
                                            disabled={submittingAction === pet.id}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs h-10"
                                        >
                                            {submittingAction === pet.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1" /> Ya la encontre</>}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => setPetToReportLost(pet)}
                                            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs h-10"
                                        >
                                            <AlertTriangle className="h-4 w-4 mr-1" /> Se perdio
                                        </Button>
                                    )}
                                    <button
                                        onClick={() => setPetToDelete(pet.id)}
                                        className="h-10 w-10 rounded-xl bg-zinc-800/50 hover:bg-rose-500/10 flex items-center justify-center text-zinc-500 hover:text-rose-500 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <div className="space-y-6 pt-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Home className="h-6 w-6 text-amber-400" />
                    Directorio de tu privada
                </h2>

                {directory.length === 0 ? (
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] flex flex-col items-center justify-center h-[160px] text-zinc-500 space-y-2">
                        <Search className="h-10 w-10 opacity-20" />
                        <p className="text-sm">Todavia no hay mas mascotas registradas en tu privada.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {directory.map((pet) => (
                            <div
                                key={pet.id}
                                className={cn(
                                    'bg-zinc-900/40 border rounded-2xl overflow-hidden shadow-lg',
                                    pet.status === 'perdida' ? 'border-rose-500/40' : 'border-zinc-800/50'
                                )}
                            >
                                <div className="w-full aspect-square bg-zinc-950 relative">
                                    {pet.photo_url ? (
                                        <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <PawPrint className="h-10 w-10 text-zinc-700" />
                                        </div>
                                    )}
                                    {pet.status === 'perdida' && (
                                        <div className="absolute top-2 right-2">
                                            <Badge className="bg-rose-500/90 text-white border-0 font-black px-2 py-0.5 rounded-lg text-[10px]">
                                                Perdida
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <p className="text-sm font-black text-white truncate">{pet.name}</p>
                                    <p className="text-[11px] text-zinc-500 truncate">
                                        {pet.owner_name}{pet.unit_number ? ` · ${pet.unit_number}` : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {petToDelete && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6"
                        >
                            <div className="flex items-center gap-4 text-rose-500">
                                <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">¿Eliminar mascota?</h3>
                                    <p className="text-sm text-zinc-400">Esta accion no se puede deshacer.</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => setPetToDelete(null)} disabled={!!deletingId}>
                                    Cancelar
                                </Button>
                                <Button className="bg-rose-500 hover:bg-rose-600 text-white font-bold" onClick={() => handleDelete(petToDelete)} disabled={!!deletingId}>
                                    {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Si, eliminar'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {petToReportLost && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6"
                        >
                            <div className="flex items-center gap-4 text-rose-500">
                                <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">¿Reportar a {petToReportLost.name} como perdida?</h3>
                                    <p className="text-sm text-zinc-400">Le avisaremos por WhatsApp a todos los residentes de tu privada, con su foto.</p>
                                </div>
                            </div>
                            <textarea
                                placeholder="Notas adicionales (donde se perdio, cuando, etc). Opcional."
                                value={lostNotes}
                                onChange={e => setLostNotes(e.target.value)}
                                className="w-full min-h-[80px] bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white text-sm focus:outline-none focus:border-rose-500/50 transition-all placeholder:text-zinc-600"
                            />
                            <div className="flex justify-end gap-3">
                                <Button
                                    variant="ghost"
                                    className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                                    onClick={() => { setPetToReportLost(null); setLostNotes('') }}
                                    disabled={!!submittingAction}
                                >
                                    Cancelar
                                </Button>
                                <Button className="bg-rose-500 hover:bg-rose-600 text-white font-bold" onClick={handleReportLost} disabled={!!submittingAction}>
                                    {submittingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Si, avisar a mis vecinos'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <CreatePetModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={fetchAll}
                resident={resident}
            />
        </div>
    )
}
