'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { Ticket } from '@/types/tickets'
import { maintenanceService } from '@/services/maintenance-service'
import { 
    UploadCloud, 
    X,
    Loader2, 
    Calendar,
    FileText
} from 'lucide-react'
import { toast } from 'sonner'
import { jsPDF } from 'jspdf'

interface ResolveTicketModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    ticket: Ticket | null
}

export function ResolveTicketModal({ 
    isOpen, 
    onClose, 
    onSuccess, 
    ticket
}: ResolveTicketModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [imagePreviews, setImagePreviews] = useState<string[]>([])
    const [dragActive, setDragActive] = useState(false)

    const [observations, setObservations] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    useEffect(() => {
        if (isOpen) {
            setObservations('')
            setSelectedFiles([])
            setImagePreviews([])
            setDate(new Date().toISOString().split('T')[0])
        }
    }, [isOpen])

    if (!ticket) return null

    const handleFiles = (files: FileList | File[]) => {
        const validFiles: File[] = []
        const previews: string[] = []

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                validFiles.push(file)
                previews.push(URL.createObjectURL(file))
            } else {
                toast.error(`"${file.name}" no es un archivo de imagen válido.`)
            }
        })

        setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 4))
        setImagePreviews(prev => [...prev, ...previews].slice(0, 4))
    }

    const removeImage = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index))
        setImagePreviews(prev => prev.filter((_, i) => i !== index))
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!observations.trim()) return toast.error('Ingresa las observaciones de los trabajos realizados.')
        if (selectedFiles.length < 2) return toast.error('Por favor sube al menos 2 fotos de los trabajos.')

        try {
            setLoading(true)
            const uploadedUrls: string[] = []

            if (selectedFiles.length > 0) {
                setIsUploading(true)
                for (const file of selectedFiles) {
                    const fileExt = file.name.split('.').pop()
                    const fileName = `${ticket.id}-${Math.random().toString(36).substring(2)}.${fileExt}`
                    const filePath = `maintenance_resolutions/${fileName}`

                    const { error: uploadError } = await supabase.storage
                        .from('accounting_receipts')
                        .upload(filePath, file, { cacheControl: '3600', upsert: false })

                    if (uploadError) {
                        throw new Error('Error al subir imagen: ' + uploadError.message)
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from('accounting_receipts')
                        .getPublicUrl(filePath)
                    
                    uploadedUrls.push(publicUrl)
                }
                setIsUploading(false)
            }

            // --- GENERAR PDF PROFESIONAL ---
            const doc = new jsPDF()
            
            // Header
            doc.setFillColor(24, 24, 27) // zinc-900
            doc.rect(0, 0, 210, 40, 'F')
            
            doc.setTextColor(255, 255, 255)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(22)
            doc.text('INMOBIGO', 20, 25)
            
            doc.setFontSize(10)
            doc.setTextColor(161, 161, 170)
            doc.text('REPORTE DE TRABAJO FINALIZADO', 120, 25)
            
            // Request Details
            doc.setTextColor(39, 39, 42)
            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            doc.text('Detalles de la Solicitud', 20, 60)
            
            doc.setDrawColor(228, 228, 231)
            doc.line(20, 65, 190, 65)
            
            doc.setFontSize(11)
            doc.setTextColor(82, 82, 91)
            doc.setFont('helvetica', 'normal')
            doc.text('Reporte Original:', 20, 75)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(24, 24, 27)
            doc.text(ticket.title, 60, 75)
            
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(82, 82, 91)
            doc.text('Fecha de Solución:', 20, 85)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(24, 24, 27)
            doc.text(date, 60, 85)
            
            // Observations
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(39, 39, 42)
            doc.setFontSize(14)
            doc.text('Trabajos Realizados', 20, 105)
            doc.line(20, 110, 190, 110)
            
            doc.setFontSize(11)
            doc.setTextColor(39, 39, 42)
            doc.setFont('helvetica', 'normal')
            const splitObs = doc.splitTextToSize(observations, 170)
            doc.text(splitObs, 20, 120)
            
            // Evidence Images
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(39, 39, 42)
            doc.setFontSize(14)
            doc.text('Evidencia Fotográfica', 20, 160)
            doc.line(20, 165, 190, 165)
            
            let xOffset = 20
            let yOffset = 175
            for (let i = 0; i < selectedFiles.length; i++) {
                if (yOffset > 220) {
                    doc.addPage()
                    yOffset = 30
                }
                const file = selectedFiles[i]
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(reader.result as string)
                    reader.readAsDataURL(file)
                })
                
                try {
                    const ext = file.name.split('.').pop()?.toUpperCase() || 'JPEG'
                    doc.addImage(base64, ext === 'PNG' ? 'PNG' : 'JPEG', xOffset, yOffset, 75, 55)
                    xOffset += 85
                    if (xOffset > 150) {
                        xOffset = 20
                        yOffset += 65
                    }
                } catch (e) {
                    console.error('Error adding image to PDF', e)
                }
            }

            // Pie del Reporte
            yOffset += 15
            if (yOffset > 250) {
                doc.addPage()
                yOffset = 30
            }

            doc.setFont('helvetica', 'italic')
            doc.setFontSize(10)
            doc.setTextColor(113, 113, 122)

            const footerText1 = 'Tu reporte ha sido resuelto exitosamente.'
            const footerText2 = 'Se dio seguimiento puntual a la incidencia hasta su correcta atención por parte de la administración del condominio.'
            const footerText3 = 'Gracias por contribuir al buen funcionamiento de la comunidad.'

            doc.text(footerText1, 20, yOffset)
            yOffset += 6
            doc.text(doc.splitTextToSize(footerText2, 170), 20, yOffset)
            yOffset += 8
            doc.text(footerText3, 20, yOffset)
            
            // Save & Upload PDF
            const pdfBlob = doc.output('blob')
            const pdfFile = new File([pdfBlob], `reporte_${ticket.id}.pdf`, { type: 'application/pdf' })
            const pdfPath = `maintenance_resolutions/reporte_trabajo_${ticket.id}_${Date.now()}.pdf`
            
            const { error: uploadPdfError } = await supabase.storage
                .from('accounting_receipts')
                .upload(pdfPath, pdfFile, { cacheControl: '3600', upsert: false })
                
            if (uploadPdfError) throw new Error('Error al generar PDF de Reporte: ' + uploadPdfError.message)
            
            const { data: { publicUrl: pdfUrl } } = supabase.storage
                .from('accounting_receipts')
                .getPublicUrl(pdfPath)

            const existingImages = ticket.images || []
            const finalImages = [...existingImages, ...uploadedUrls, pdfUrl]
            const finalDescription = `${ticket.description}\n\n[TRABAJOS REALIZADOS - ${date}]\n${observations}`

            await maintenanceService.update(ticket.id, {
                status: 'resolved',
                description: finalDescription,
                images: finalImages
            })

            toast.success('Trabajo guardado y reporte resuelto con éxito.')
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message || 'Error al guardar los trabajos.')
        } finally {
            setLoading(false)
            setIsUploading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Trabajos" className="max-w-xl">
            <form onSubmit={handleSubmit} className="space-y-6 p-2">
                {/* Report info */}
                <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-zinc-600" /> Reporte original
                    </label>
                    <input 
                        type="text" 
                        disabled 
                        value={ticket.title} 
                        className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-400 font-bold rounded-xl px-4 py-3 text-sm focus:outline-none cursor-not-allowed"
                    />
                </div>

                {/* Observations */}
                <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Observaciones</label>
                    <textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Describe los trabajos que se realizaron para resolver la solicitud..."
                        rows={4}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium resize-none"
                        required
                    />
                </div>

                {/* Date picker */}
                <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-zinc-600" /> Fecha de realización
                    </label>
                    <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-bold"
                        required
                    />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Evidencias del Trabajo (Subir al menos 2 fotos)</label>
                    
                    <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${
                            dragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-zinc-800 bg-zinc-950/30 hover:bg-zinc-900/20 hover:border-zinc-700'
                        }`}
                        onClick={() => document.getElementById('file-upload-resolve')?.click()}
                    >
                        <input 
                            id="file-upload-resolve"
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files && handleFiles(e.target.files)}
                        />
                        <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center mb-3 border border-zinc-800/50">
                            <UploadCloud className="h-6 w-6 text-zinc-400" />
                        </div>
                        <p className="text-sm font-bold text-zinc-300">Haz clic o arrastra imágenes aquí</p>
                        <p className="text-xs text-zinc-500 font-medium mt-1">Sube hasta 4 fotos (Mínimo 2)</p>
                    </div>

                    {/* Previews */}
                    {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-4 gap-3 pt-3">
                            {imagePreviews.map((preview, i) => (
                                <div key={i} className="relative group rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 h-20">
                                    <img src={preview} alt="Vista previa" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            removeImage(i)
                                        }}
                                        className="absolute top-1 right-1 h-5 w-5 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-rose-500 transition-all opacity-100"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4 border-t border-zinc-900">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={onClose}
                        className="rounded-xl font-bold uppercase tracking-widest text-xs h-11 border border-zinc-800 hover:bg-zinc-900"
                    >
                        Cancelar
                    </Button>
                    <Button 
                        type="submit"
                        disabled={loading || isUploading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs h-11 px-6 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                        {(loading || isUploading) ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                            </>
                        ) : (
                            'Guardar'
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
