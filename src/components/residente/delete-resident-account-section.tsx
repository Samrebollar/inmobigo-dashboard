'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { deleteResidentAccountAction } from '@/app/actions/resident-account-deletion-actions'

const CONFIRMATION_WORD = 'ELIMINAR'

/**
 * "Eliminar cuenta" del perfil del residente. Borra su acceso y su
 * información personal; su estado de cuenta se queda con la administración.
 */
export function DeleteResidentAccountSection() {
    const [open, setOpen] = useState(false)
    const [confirmation, setConfirmation] = useState('')
    const [deleting, setDeleting] = useState(false)

    const canConfirm = confirmation.trim().toUpperCase() === CONFIRMATION_WORD && !deleting

    const closeModal = () => {
        if (deleting) return
        setOpen(false)
        setConfirmation('')
    }

    const handleDelete = async () => {
        if (!canConfirm) return
        setDeleting(true)
        const res = await deleteResidentAccountAction(confirmation)
        if (!res.success) {
            toast.error(res.error || 'No se pudo eliminar la cuenta')
            setDeleting(false)
            return
        }
        toast.success('Tu cuenta fue eliminada definitivamente')
        window.location.href = '/login'
    }

    return (
        <div className="mx-auto max-w-4xl pb-10">
            <div className="rounded-[2rem] border border-rose-500/30 bg-zinc-900 p-6 md:p-8">
                <h2 className="flex items-center gap-2 text-lg font-bold text-rose-400">
                    <AlertTriangle className="h-5 w-5" />
                    Eliminar cuenta
                </h2>
                <p className="mt-1 mb-5 text-sm text-zinc-400">
                    Elimina definitivamente tu cuenta de InmobiGo y tu información personal.
                </p>
                <Button onClick={() => setOpen(true)} className="bg-rose-600 text-white hover:bg-rose-500">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar mi cuenta
                </Button>
            </div>

            <AnimatePresence>
                {open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl"
                        >
                            <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700" />
                            <div className="p-8">
                                <div className="mb-6 flex items-center justify-between">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-500">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <button onClick={closeModal} className="p-2 text-zinc-500 transition-colors hover:text-white">
                                        <X size={20} />
                                    </button>
                                </div>

                                <h3 className="mb-2 text-xl font-black tracking-tight text-white">
                                    ¿Eliminar tu cuenta definitivamente?
                                </h3>
                                <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                                    <strong className="text-rose-400">Perderás toda la información de tu cuenta y esta acción no es reversible.</strong>{' '}
                                    No hay respaldo: una vez eliminada, no se puede recuperar.
                                </p>

                                <div className="mb-5 space-y-2 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-zinc-300">
                                    <p className="font-semibold text-white">Se eliminará de forma permanente:</p>
                                    <ul className="list-disc space-y-1 pl-5">
                                        <li>Tu acceso a la App de InmobiGo</li>
                                        <li>Tus avisos de visitas, paquetería y transporte, y tus reservas de amenidades</li>
                                        <li>Tus mensajes con la administración, mascotas y vehículos registrados</li>
                                        <li>Tu historial de conversación con el asistente de WhatsApp</li>
                                    </ul>
                                    <p className="pt-1 text-zinc-400">
                                        Tu registro como residente y tu estado de cuenta (cuotas, pagos y adeudos) los conserva la administración de tu condominio.
                                    </p>
                                </div>

                                <label className="mb-2 block text-sm text-zinc-300">
                                    Para confirmar, escribe <strong className="text-rose-400">{CONFIRMATION_WORD}</strong>
                                </label>
                                <Input
                                    value={confirmation}
                                    onChange={(e) => setConfirmation(e.target.value)}
                                    placeholder={CONFIRMATION_WORD}
                                    disabled={deleting}
                                    autoComplete="off"
                                />

                                <div className="mt-6 flex gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={closeModal}
                                        disabled={deleting}
                                        className="flex-1 border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleDelete}
                                        disabled={!canConfirm}
                                        className="flex-1 bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-40"
                                    >
                                        {deleting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Eliminando...
                                            </>
                                        ) : (
                                            'Eliminar definitivamente'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
