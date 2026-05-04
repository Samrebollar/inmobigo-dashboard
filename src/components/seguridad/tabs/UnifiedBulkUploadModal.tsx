'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, FileSpreadsheet, AlertCircle, Check, Loader2, Download, Info } from 'lucide-react'
import Papa from 'papaparse'

import { Button } from '@/components/ui/button'
import { bulkService, UnifiedBulkRow } from '@/services/bulk-service'

interface UnifiedBulkUploadModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    condominiumId: string
}

export function UnifiedBulkUploadModal({ isOpen, onClose, onSuccess, condominiumId }: UnifiedBulkUploadModalProps) {
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
        if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
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

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) => {
                return header.trim().replace(/^\ufeff/, '')
            },
            complete: async (results) => {
                const rows = results.data as any[]
                const unifiedRows: UnifiedBulkRow[] = []
                const validationErrors: string[] = []

                rows.forEach((row, index) => {
                    const unitNumber = row['Unidad'] || row['unidad']
                    if (!unitNumber) {
                        validationErrors.push(`Fila ${index + 1}: Falta el número de unidad.`)
                        return
                    }

                    // Map Rent
                    let rent: number | undefined = undefined
                    const rentRaw = row['Monto / Cuota'] || row['monto']
                    if (rentRaw) {
                        const parsed = parseFloat(rentRaw.toString().replace(/[^0-9.-]+/g, ""))
                        if (!isNaN(parsed)) rent = parsed
                    }

                    // Map Billing Day
                    let billingDay: number | undefined = undefined
                    const billingDayRaw = row['Día Cobro'] || row['dia cobro']
                    if (billingDayRaw) {
                        const parsed = parseInt(billingDayRaw.toString().replace(/[^0-9]+/g, ""), 10)
                        if (!isNaN(parsed)) billingDay = parsed
                    }

                    // Map Status
                    let status: 'active' | 'delinquent' | 'inactive' = 'active'
                    const statusRaw = row['Estado Residente'] || row['estado']
                    if (statusRaw?.toLowerCase().includes('moroso')) status = 'delinquent'
                    if (statusRaw?.toLowerCase().includes('inactivo')) status = 'inactive'

                    // Map Debt
                    let debt: number = 0
                    const debtRaw = row['Saldo Pendiente'] || row['saldo']
                    if (debtRaw) {
                        const parsed = parseFloat(debtRaw.toString().replace(/[^0-9.-]+/g, ""))
                        if (!isNaN(parsed)) debt = parsed
                    }

                    // Map Credit
                    let credit: number = 0
                    const creditRaw = row['Saldo a Favor'] || row['saldo a favor'] || row['favor']
                    if (creditRaw) {
                        const parsed = parseFloat(creditRaw.toString().replace(/[^0-9.-]+/g, ""))
                        if (!isNaN(parsed)) credit = parsed
                    }

                    unifiedRows.push({
                        unit_number: unitNumber,
                        floor: row['Piso'] || row['piso'],
                        unit_type: row['Tipo']?.toLowerCase().includes('casa') ? 'house' : 'apartment',
                        monto_mensual: rent,
                        billing_day: billingDay,
                        resident_name: row['Nombre'] || row['nombre'],
                        resident_email: row['Email'] || row['email'],
                        resident_phone: row['Telefono'] || row['telefono'],
                        resident_status: status,
                        debt_amount: debt,
                        credit_amount: credit,
                        vehicle_plate: row['Placas'] || row['placas'],
                        vehicle_brand: row['Marca'] || row['marca']
                    })
                })

                if (validationErrors.length > 0) {
                    setError(`Errores de formato: ${validationErrors.slice(0, 2).join(', ')}...`)
                    setLoading(false)
                    return
                }

                try {
                    const result = await bulkService.unifiedBulkUpload(condominiumId, unifiedRows)
                    
                    if (result.errors.length > 0) {
                        setError(`Carga parcial: ${result.success} exitosos. Algunos errores: ${result.errors.slice(0, 2).join(', ')}`)
                    } else {
                        setSuccessMessage(`¡Excelente! ✅ Se procesaron ${result.success} registros correctamente (Unidades y Residentes vinculados).`)
                        onSuccess()
                        setTimeout(() => {
                            onClose()
                            setFile(null)
                            setPreviewData([])
                            setSuccessMessage(null)
                        }, 2500)
                    }
                } catch (err: any) {
                    setError(err.message || 'Error al procesar la carga unificada.')
                } finally {
                    setLoading(false)
                }
            }
        })
    }

    const downloadTemplate = () => {
        const headers = "Unidad,Piso,Tipo,Monto / Cuota,Día Cobro,Nombre,Email,Telefono,Placas,Marca,Saldo Pendiente,Saldo a Favor"
        const row1 = "A-101,1,Departamento,5000,5,Juan Morales,juan@ejemplo.com,5219981234567,ABC-123,Toyota,0,0"
        const row2 = "B-202,2,Casa,8500,1,Clara Licona,clara@ejemplo.com,5219987654321,XYZ-789,Honda,1500,500"
        const csvContent = `\uFEFF${headers}\n${row1}\n${row2}`
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", "plantilla_unificada_inmobigo.csv")
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
                        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-800 p-6 bg-zinc-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                                    Carga Masiva Unificada (Pro)
                                </h2>
                                <p className="text-sm text-zinc-400">Carga Unidades y Residentes en un solo paso.</p>
                            </div>
                            <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Pro Tip */}
                            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4 flex gap-4">
                                <div className="p-2 bg-indigo-500/20 rounded-lg h-fit">
                                    <Info className="h-5 w-5 text-indigo-400" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-white">¿Cómo funciona la carga unificada?</p>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        El sistema identificará si la unidad ya existe. Si no, la creará automáticamente. 
                                        Luego, creará al residente y lo vinculará a la unidad correspondiente, 
                                        incluyendo sus vehículos, saldos pendientes y **saldos a favor**.
                                    </p>
                                </div>
                            </div>

                            {/* Upload Area */}
                            {!file ? (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all cursor-pointer ${dragging
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
                                        <Upload className="h-10 w-10 text-zinc-400" />
                                    </div>
                                    <p className="text-base font-medium text-white mb-1">
                                        Arrastra tu archivo CSV aquí
                                    </p>
                                    <p className="text-sm text-zinc-500 text-center">
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
                                    <button onClick={() => { setFile(null); setPreviewData([]); setError(null); setSuccessMessage(null) }} className="p-2 text-zinc-400 hover:text-red-400 transition-colors">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            )}

                            {/* Template Download */}
                            {!file && (
                                <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 border border-zinc-700 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-zinc-700 rounded-lg">
                                            <Download className="h-5 w-5 text-zinc-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">¿No tienes la plantilla?</p>
                                            <p className="text-xs text-zinc-500">Usa nuestro formato profesional para asegurar el éxito.</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={downloadTemplate} className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
                                        Descargar Plantilla
                                    </Button>
                                </div>
                            )}

                            {/* Preview */}
                            {previewData.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium text-zinc-400">Vista Previa de Datos</h3>
                                        <span className="text-[10px] uppercase tracking-widest text-zinc-600">Primeros 5 registros</span>
                                    </div>
                                    <div className="rounded-lg border border-zinc-800 overflow-hidden overflow-x-auto">
                                        <table className="w-full text-left text-[10px] whitespace-nowrap">
                                            <thead className="bg-zinc-800 text-zinc-500 uppercase tracking-wider">
                                                <tr>
                                                    {Object.keys(previewData[0] || {}).map((header) => (
                                                        <th key={header} className="px-3 py-2 font-bold">{header}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800">
                                                {previewData.map((row, i) => (
                                                    <tr key={i} className="bg-zinc-900/50 group hover:bg-zinc-800/50 transition-colors">
                                                        {Object.values(row).map((cell: any, j) => (
                                                            <td key={j} className="px-3 py-2 text-zinc-400 group-hover:text-zinc-200">{cell}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Status Messages */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400 flex items-start gap-3"
                                    >
                                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                                        <p>{error}</p>
                                    </motion.div>
                                )}
                                {successMessage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-400 flex items-start gap-3"
                                    >
                                        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                                        <p>{successMessage}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
                                <Button variant="outline" onClick={onClose} className="flex-1 border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                                    Cerrar
                                </Button>
                                <Button
                                    onClick={handleUpload}
                                    disabled={!file || loading}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" /> Iniciar Carga Inteligente
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

