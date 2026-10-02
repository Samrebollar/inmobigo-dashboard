'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { PenLine, Upload, Eraser, Save, Loader2, CheckCircle2, AlertTriangle, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { saveMySignatureAction } from '@/app/actions/signature-actions'

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 200

/**
 * Firma autógrafa digitalizada del integrante del equipo. Se estampa en los
 * recibos de pago que registra o valida; sin firma no puede registrar pagos.
 */
export function SignatureCard({ initialSignature }: { initialSignature: { url: string | null; updatedAt: string | null } | null }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const drawing = useRef(false)
    const [signature, setSignature] = useState(initialSignature)
    const [editing, setEditing] = useState(!initialSignature)
    const [hasStrokes, setHasStrokes] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!editing) return
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) return
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = '#0f172a'
    }, [editing])

    const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!
        const rect = canvas.getBoundingClientRect()
        return {
            x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
            y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
        }
    }

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) return
        e.currentTarget.setPointerCapture(e.pointerId)
        drawing.current = true
        const { x, y } = point(e)
        ctx.beginPath()
        ctx.moveTo(x, y)
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawing.current) return
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) return
        const { x, y } = point(e)
        ctx.lineTo(x, y)
        ctx.stroke()
        setHasStrokes(true)
    }

    const stopDrawing = () => {
        drawing.current = false
    }

    const clear = () => {
        canvasRef.current?.getContext('2d')?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        setHasStrokes(false)
    }

    // Foto de la firma en papel: se ajusta al lienzo y se vuelve PNG
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        if (!file.type.startsWith('image/')) return void toast.error('Sube una imagen (JPG o PNG) de tu firma.')

        const reader = new FileReader()
        reader.onload = () => {
            const img = new Image()
            img.onload = () => {
                const ctx = canvasRef.current?.getContext('2d')
                if (!ctx) return
                clear()
                const scale = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height)
                const w = img.width * scale
                const h = img.height * scale
                ctx.drawImage(img, (CANVAS_WIDTH - w) / 2, (CANVAS_HEIGHT - h) / 2, w, h)
                setHasStrokes(true)
            }
            img.src = String(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const handleSave = async () => {
        if (!canvasRef.current || !hasStrokes) return void toast.error('Dibuja o sube tu firma primero.')
        setSaving(true)
        try {
            const result = await saveMySignatureAction(canvasRef.current.toDataURL('image/png'))
            if (!result.success) throw new Error(result.error)
            setSignature({ url: result.url, updatedAt: new Date().toISOString() })
            setEditing(false)
            setHasStrokes(false)
            const total = result.activated + result.updated
            toast.success(total > 0
                ? `Firma guardada. Se actualizó en ${total} recibo${total === 1 ? '' : 's'} ya emitido${total === 1 ? '' : 's'}.`
                : 'Firma guardada. Se estampará en los recibos que registres.')
        } catch (error: any) {
            toast.error(error.message || 'No se pudo guardar la firma')
        } finally {
            setSaving(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl border bg-zinc-900/50 p-6 shadow-lg transition-all ${signature ? 'border-zinc-800 hover:border-indigo-500/30' : 'border-amber-500/40'}`}
        >
            <div className="flex items-start justify-between gap-4 mb-2">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <PenLine className="h-5 w-5 text-indigo-400" /> Mi Firma
                </h2>
                {signature ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Registrada
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full shrink-0">
                        <AlertTriangle className="h-3 w-3" /> Obligatoria
                    </span>
                )}
            </div>
            <p className="text-sm text-zinc-500 mb-5">
                Tu firma se estampa en cada recibo de pago que registres o valides, junto con tu nombre, la matrícula SEDETUS y el sello digital. Si la cambias, se actualiza en todos tus recibos vigentes.
                {!signature && <span className="text-amber-400"> Sin firma no podrás registrar ni validar pagos.</span>}
            </p>

            {!editing && signature ? (
                <div className="space-y-4">
                    <div className="rounded-2xl bg-white p-4 flex items-center justify-center h-36">
                        {signature.url
                            ? <img src={signature.url} alt="Mi firma" className="max-h-full max-w-full object-contain" />
                            : <ImageIcon className="h-8 w-8 text-zinc-300" />}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-zinc-500">
                            {signature.updatedAt ? `Actualizada el ${new Date(signature.updatedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
                        </p>
                        <Button variant="ghost" onClick={() => setEditing(true)} className="h-9 rounded-xl text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 gap-1.5">
                            <PenLine className="h-3.5 w-3.5" /> Cambiar firma
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative rounded-2xl bg-white overflow-hidden">
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            className="w-full h-auto touch-none cursor-crosshair block"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={stopDrawing}
                            onPointerLeave={stopDrawing}
                        />
                        <div className="pointer-events-none absolute left-6 right-6 bottom-8 border-b border-dashed border-zinc-300" />
                        {!hasStrokes && (
                            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
                                Firma aquí con el mouse o el dedo
                            </p>
                        )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFile} />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={clear} disabled={!hasStrokes || saving} className="h-9 rounded-xl text-xs text-zinc-300 bg-zinc-950/50 border border-zinc-800 hover:bg-zinc-800 gap-1.5">
                                <Eraser className="h-3.5 w-3.5" /> Limpiar
                            </Button>
                            <Button variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={saving} className="h-9 rounded-xl text-xs text-zinc-300 bg-zinc-950/50 border border-zinc-800 hover:bg-zinc-800 gap-1.5">
                                <Upload className="h-3.5 w-3.5" /> Subir foto
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            {signature && (
                                <Button variant="ghost" onClick={() => { setEditing(false); setHasStrokes(false) }} disabled={saving} className="h-9 rounded-xl text-xs text-zinc-400 hover:bg-zinc-800">
                                    Cancelar
                                </Button>
                            )}
                            <Button onClick={handleSave} disabled={!hasStrokes || saving} className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs gap-1.5">
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar firma
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    )
}
