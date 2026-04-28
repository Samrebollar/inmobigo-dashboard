'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, FileSpreadsheet, AlertCircle, Check, Loader2, Download } from 'lucide-react'
import Papa from 'papaparse'

import { Button } from '@/components/ui/button'
import { unitsService } from '@/services/units-service'
import { CreateUnitDTO } from '@/types/units'

interface BulkUploadUnitsModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    condominiumId: string
}

export function BulkUploadUnitsModal({ isOpen, onClose, onSuccess, condominiumId }: BulkUploadUnitsModalProps) {
    const [dragging, setDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [previewData, setPreviewData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragging(false)
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && droppedFile.type === 'text/csv') {
            processFile(droppedFile)
        } else {
            setError('Por favor sube un archivo CSV válido.')
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            processFile(selectedFile)
        }
    }

    const processFile = (file: File) => {
        setFile(file)
        setError(null)
        setSuccessMessage(null)
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) => {
                return header.trim().replace(/^\ufeff/, '')
            },
            complete: (results) => {
                if (results.errors.length > 0) {
                    setError('Error al leer el archivo CSV.')
                    return
                }
                const data = results.data.slice(0, 5) // Preview first 5
                setPreviewData(data)
            },
            error: (err) => {
                setError('Error al leer el archivo: ' + err.message)
            }
        })
    }

    const handleUpload = async () => {
        if (!file) return

        setLoading(true)
        setError(null)
        setSuccessMessage(null)

        try {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header: string) => {
                    return header.trim().replace(/^\ufeff/, '')
                },
                complete: async (results) => {
                    const rows = results.data as any[]
                    const validUnits: CreateUnitDTO[] = []
                    const validationErrors: string[] = []

                    rows.forEach((row, index) => {
                        // Expected: Unidad, Piso, Tipo, Monto / Cuota, Día Cobro, Estado
                        const unitNumber = row['Unidad'] || row['unidad'] || row['Unit']
                        const floor = row['Piso'] || row['piso'] || row['Floor']
                        const typeRaw = row['Tipo'] || row['tipo'] || row['Type']
                        const rentRaw = row['Monto / Cuota'] || row['monto'] || row['renta'] || row['Rent']
                        const billingDayRaw = row['Día Cobro'] || row['dia cobro'] || row['día cobro'] || row['Día']
                        const statusRaw = row['Estado'] || row['estado'] || row['Status']

                        if (!unitNumber) {
                            validationErrors.push(`Fila ${index + 1}: Falta el número de unidad.`)
                            return
                        }

                        // Map Enums
                        let type: 'house' | 'apartment' | 'commercial' = 'apartment'
                        if (typeRaw?.toLowerCase().includes('casa')) type = 'house'
                        if (typeRaw?.toLowerCase().includes('local')) type = 'commercial'

                        let status: 'vacant' | 'occupied' | 'maintenance' = 'vacant'
                        if (statusRaw?.toLowerCase().includes('ocupad') || statusRaw?.toLowerCase().includes('habitada')) status = 'occupied'
                        if (statusRaw?.toLowerCase().includes('vacía') || statusRaw?.toLowerCase().includes('vacia')) status = 'vacant'

                        let monto_mensual: number | undefined = undefined;
                        if (rentRaw) {
                            const parsedRent = parseFloat(rentRaw.toString().replace(/[^0-9.-]+/g, ""));
                            if (!isNaN(parsedRent)) monto_mensual = parsedRent;
                        }

                        let billing_day: number | undefined = undefined;
                        if (billingDayRaw) {
                            const parsedDay = parseInt(billingDayRaw.toString().replace(/[^0-9]+/g, ""), 10);
                            if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31) billing_day = parsedDay;
                        }

                        validUnits.push({
                            condominium_id: condominiumId,
                            unit_number: unitNumber,
                            floor: floor || '1',
                            type,
                            status,
                            monto_mensual,
                            billing_day
                        })
                    })

                    if (validationErrors.length > 0) {
                        setError(`Errores encontrados: ${validationErrors.slice(0, 3).join(', ')}...`)
                        setLoading(false)
                        return
                    }

                    await unitsService.bulkCreate(validUnits)
                    let successCount = validUnits.length

                    setLoading(false)
                    setSuccessMessage(`¡Carga completada! ✅ ${successCount} unidades agregadas.`)
                    onSuccess()

                    setTimeout(() => {
                        onClose()
                        setFile(null)
                        setPreviewData([])
                        setSuccessMessage(null)
                    }, 2000)
                }
            })
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error inesperado al procesar el archivo.')
            setLoading(false)
        }
    }

    const downloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,Unidad,Piso,Tipo,Monto / Cuota,Día Cobro,Estado\nA-101,1,Departamento,5000.00,5,Vacía\nB-202,2,Casa,8500.00,1,Habitada\nC-001,PB,Local,,15,Vacía"
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "plantilla_unidades_inmobigo.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-800 p-6 bg-zinc-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                                    Carga Masiva de Unidades
                                </h2>
                                <p className="text-sm text-zinc-400">Sube múltiples unidades desde un archivo CSV.</p>
                            </div>
                            <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Upload Area */}
                            {!file ? (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all cursor-pointer ${dragging
                                        ? 'border-indigo-500 bg-indigo-500/10'
                                        : 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-600'
                                        }`}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                    />
                                    <div className="rounded-full bg-zinc-800 p-4 mb-4">
                                        <Upload className="h-8 w-8 text-zinc-400" />
                                    </div>
                                    <p className="text-sm font-medium text-white mb-1">
                                        Arrastra tu archivo CSV aquí
                                    </p>
                                    <p className="text-xs text-zinc-500 text-center">
                                        o haz clic para explorar tus archivos
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
                                            <FileSpreadsheet className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{file.name}</p>
                                            <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setFile(null); setPreviewData([]); setError(null) }} className="p-2 text-zinc-400 hover:text-red-400 transition-colors">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            )}

                            {/* Template Download */}
                            {!file && (
                                <div className="flex items-center justify-between rounded-lg bg-indigo-500/5 border border-indigo-500/20 p-4">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle className="h-5 w-5 text-indigo-400" />
                                        <div>
                                            <p className="text-sm font-medium text-white">¿Necesitas el formato?</p>
                                            <p className="text-xs text-indigo-200/70">Descarga la plantilla oficial para evitar errores.</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={downloadTemplate} className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 hover:text-white">
                                        <Download className="mr-2 h-4 w-4" /> Plantilla
                                    </Button>
                                </div>
                            )}

                            {/* Preview */}
                            {previewData.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium text-zinc-400">Vista Previa (Primeros 5)</h3>
                                    <div className="rounded-lg border border-zinc-800 overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-zinc-800 text-zinc-400">
                                                <tr>
                                                    {Object.keys(previewData[0] || {}).map((header) => (
                                                        <th key={header} className="px-3 py-2 font-medium">{header}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800">
                                                {previewData.map((row, i) => (
                                                    <tr key={i} className="bg-zinc-900/50">
                                                        {Object.values(row).map((cell: any, j) => (
                                                            <td key={j} className="px-3 py-2 text-zinc-300">{cell}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 flex items-start gap-3"
                                    >
                                        <X className="h-5 w-5 shrink-0 text-red-500" />
                                        <p className="leading-relaxed">{error}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Success Message */}
                            {successMessage && (
                                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400 flex items-start gap-2">
                                    <Check className="h-5 w-5 mt-0.5 shrink-0" />
                                    <span>{successMessage}</span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2">
                                <Button variant="outline" onClick={onClose} className="flex-1 border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleUpload}
                                    disabled={!file || loading}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" /> Importar Unidades
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
