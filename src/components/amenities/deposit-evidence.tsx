'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Camera, Loader2, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { getDepositEvidenceAction, uploadDepositEvidenceAction } from '@/app/actions/amenity-reservation-actions'

/** Reduce la foto antes de subirla (las del celular pesan varios MB). */
async function compressImage(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la foto'))), 'image/jpeg', 0.8)
    )
}

export type EvidencePhoto = { path: string; url: string }

/** Selector de fotos de los daños (hasta 6) al liquidar un depósito. */
export function DepositEvidencePicker({ reservationId, photos, onChange }: {
    reservationId: string
    photos: EvidencePhoto[]
    onChange: (photos: EvidencePhoto[]) => void
}) {
    const [uploading, setUploading] = useState(false)

    const add = async (files: FileList | null) => {
        if (!files || files.length === 0) return
        setUploading(true)
        const next = [...photos]
        try {
            for (const file of Array.from(files).slice(0, 6 - photos.length)) {
                const blob = await compressImage(file)
                const fd = new FormData()
                fd.append('reservation_id', reservationId)
                fd.append('file', new File([blob], 'danio.jpg', { type: 'image/jpeg' }))
                const result = await uploadDepositEvidenceAction(fd)
                if (!result.success) throw new Error(result.error)
                next.push({ path: result.path, url: result.url })
            }
        } catch (err: any) {
            toast.error(err?.message || 'No se pudo subir la foto')
        } finally {
            onChange(next)
            setUploading(false)
        }
    }

    return (
        <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">Fotos de los daños (obligatorio al retener, máximo 6)</label>
            <div className="flex flex-wrap gap-2">
                {photos.map((p) => (
                    <div key={p.path} className="relative h-20 w-20 rounded-xl overflow-hidden border border-zinc-800">
                        <img src={p.url} alt="Daño" className="h-full w-full object-cover" />
                        <button
                            type="button"
                            onClick={() => onChange(photos.filter((x) => x.path !== p.path))}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                            title="Quitar"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
                {photos.length < 6 && (
                    <label className="h-20 w-20 rounded-xl border border-dashed border-zinc-700 hover:border-indigo-500 flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-indigo-300 cursor-pointer text-[10px]">
                        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                        {uploading ? 'Subiendo' : 'Agregar'}
                        <input type="file" accept="image/*" capture="environment" multiple className="hidden" disabled={uploading} onChange={(e) => { add(e.target.files); e.target.value = '' }} />
                    </label>
                )}
            </div>
        </div>
    )
}

/** Botón "Ver fotos" de los daños de una reserva (residente y equipo). */
export function DepositEvidenceButton({ reservationId, count }: { reservationId: string; count: number }) {
    const [urls, setUrls] = useState<string[] | null>(null)
    const [loading, setLoading] = useState(false)
    if (!count) return null

    const open = async () => {
        setLoading(true)
        const result = await getDepositEvidenceAction(reservationId)
        setLoading(false)
        if (!result.success) return toast.error(result.error)
        setUrls(result.urls)
    }

    return (
        <>
            <button type="button" onClick={open} disabled={loading} className="text-[10px] font-semibold text-indigo-300 hover:text-indigo-200 flex items-center gap-1">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />} Ver fotos ({count})
            </button>
            {urls && (
                <Modal isOpen onClose={() => setUrls(null)} title="Fotos de los daños">
                    <div className="grid grid-cols-2 gap-2">
                        {urls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-zinc-800">
                                <img src={url} alt="Daño" className="w-full h-48 object-cover" />
                            </a>
                        ))}
                    </div>
                </Modal>
            )}
        </>
    )
}
