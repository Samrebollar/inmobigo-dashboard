'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, FileSpreadsheet, AlertCircle, Check, Loader2, Download } from 'lucide-react'
import Papa from 'papaparse'

import { Button } from '@/components/ui/button'
import { residentsService } from '@/services/residents-service'
import { unitsService } from '@/services/units-service'
import { CreateResidentDTO } from '@/types/residents'
import { Unit } from '@/types/units'
import { normalizeMexicanPhone } from '@/utils/phone-utils'

interface BulkUploadResidentsModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    condominiumId: string
}

export function BulkUploadResidentsModal({ isOpen, onClose, onSuccess, condominiumId }: BulkUploadResidentsModalProps) {
    const [dragging, setDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [previewData, setPreviewData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [units, setUnits] = useState<Unit[]>([])

    // Fetch units for mapping
    useEffect(() => {
        if (isOpen) {
            unitsService.getByCondominium(condominiumId).then(setUnits)
        }
    }, [isOpen, condominiumId])

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
            encoding: 'UTF-8',
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
                encoding: 'UTF-8',
                transformHeader: (header: string) => {
                    return header.trim().replace(/^\ufeff/, '')
                },
                complete: async (results) => {
                    const rows = results.data as any[]
                    const validResidents: CreateResidentDTO[] = []
                    const validationErrors: string[] = []

                    // Create a map for quick unit lookup: "A-101" -> "uuid"
                    const unitMap = new Map(units.map(u => [u.unit_number.toLowerCase(), u.id]))

                    rows.forEach((row, index) => {
                        // Expected new: Nombre, Unidad, Contacto, Vehiculos, Estado, Saldo Pendiente
                        let firstName = row['Nombre'] || row['nombre'] || ''
                        let lastName = row['Apellido'] || row['apellido'] || ''
                        let email = row['Email'] || row['email'] || ''
                        let phone = row['Telefono'] || row['telefono'] || row['Phone'] || ''

                        // Handle 'Nombre' containing full name if 'Apellido' is missing
                        if (!row['Apellido'] && firstName.trim().includes(' ')) {
                            const nameParts = firstName.trim().split(' ')
                            firstName = nameParts[0]
                            lastName = nameParts.slice(1).join(' ')
                        }

                        // Fallback handle for 'Contacto' if someone uses the older template
                        const contacto = row['Contacto'] || row['contacto']
                        if (contacto && !email && !phone) {
                            const emailMatch = contacto.match(/[\w.-]+@[\w.-]+\.\w+/)
                            if (emailMatch) email = emailMatch[0]
                            
                            const phoneMatch = contacto.replace(email || '', '').match(/[0-9\+\-\(\)\s]{7,}/)
                            if (phoneMatch) phone = phoneMatch[0].trim()
                        }

                        const unitRaw = row['Unidad'] || row['unidad']
                        const statusRaw = row['Estado'] || row['estado']
                        const debtRaw = row['Saldo Pendiente'] || row['saldo pendiente'] || row['Saldo'] || '0'

                        // Vehicle mapping
                        const vehicles = []
                        const vehiculosRaw = row['Vehiculos'] || row['vehiculos']
                        
                        if (vehiculosRaw && vehiculosRaw.toLowerCase() !== 'sin vehículos' && vehiculosRaw.toLowerCase() !== 'sin vehiculos') {
                            // Extract first word as plate, rest as brand
                            const vParts = vehiculosRaw.trim().split(' ')
                            vehicles.push({
                                plate: vParts[0],
                                brand: vParts.slice(1).join(' ') || '',
                                color: ''
                            })
                        } else if (!vehiculosRaw) {
                            // Fallback to old format if used
                            const vPlate = row['Vehiculo_Placas'] || row['vehiculo_placas'] || row['Placas']
                            const vBrand = row['Vehiculo_Marca'] || row['vehiculo_marca'] || row['Marca']
                            const vColor = row['Vehiculo_Color'] || row['vehiculo_color'] || row['Color']
                            if (vPlate) {
                                vehicles.push({
                                    plate: vPlate,
                                    brand: vBrand || '',
                                    color: vColor || ''
                                })
                            }
                        }

                        if (!firstName || !email) {
                            validationErrors.push(`Fila ${index + 1}: Falta nombre o email (revisa la columna de Contacto).`)
                            return
                        }

                        validResidents.push({
                            condominium_id: condominiumId,
                            first_name: firstName,
                            last_name: lastName || '',
                            email: email,
                            phone: normalizeMexicanPhone(phone || ''),
                            status: status,
                            unit_id: unitId,
                            debt_amount: debtAmount,
                            vehicles: vehicles
                        })
                    })

                    if (validationErrors.length > 0) {
                        setError(`Errores de validación: ${validationErrors.slice(0, 3).join(', ')}...`)
                        setLoading(false)
                        return
                    }

                    // Upload sequentially
                    let successCount = 0
                    let duplicateCount = 0
                    let errorCount = 0

                    for (const resident of validResidents) {
                        try {
                            await residentsService.create(resident)
                            successCount++
                        } catch (err: any) {
                            // Check for unique key violation (Postgres error code: 23505)
                            // Supabase usually wraps this, check error structure
                            const errMessage = JSON.stringify(err)
                            if (err?.code === '23505' || errMessage.includes('23505') || errMessage.includes('duplicate key')) {
                                duplicateCount++
                                console.warn(`Skipping duplicate resident: ${resident.email}`)
                            } else {
                                console.error("Error creating resident:", resident.email, errMessage)
                                errorCount++
                            }
                        }
                    }

                    // Show final report
                    setLoading(false)
                    onSuccess()

                    if (errorCount === 0) {
                        setSuccessMessage(`¡Carga completada con éxito! ✅ ${successCount} residentes agregados.`)
                        setTimeout(() => {
                            onClose()
                            setFile(null)
                            setPreviewData([])
                            setSuccessMessage(null)
                        }, 2000)
                    } else {
                        setError(`Carga parcial: ${successCount} exitosos, ${duplicateCount} duplicados, ${errorCount} errores.`)
                    }


                }
            })
        } catch (err: any) {
            console.error(err)
            setError('Ocurrió un error al procesar el archivo: ' + err.message)
            setLoading(false)
        }
    }

    const downloadTemplate = () => {
        // Add BOM for Excel UTF-8 support
        const csvContent = "\uFEFFNombre,Unidad,Email,Telefono,Vehiculos,Estado,Saldo Pendiente\nClara Licona,1,clara@gmail.com,5219982338624,Sin vehículos,Activo,10\nSantiago Marin,2,santiago@ejemplo.com,5550202,UUA-320-W Ford,Activo,0\n"
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", "plantilla_residentes_inmobigo.csv")
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
                                    Carga Masiva de Residentes
                                </h2>
                                <p className="text-sm text-zinc-400">Sube múltiples residentes desde un archivo CSV.</p>
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
                                    <button onClick={() => { setFile(null); setPreviewData([]); setError(null); setSuccessMessage(null) }} className="p-2 text-zinc-400 hover:text-red-400 transition-colors">
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
                                    <div className="rounded-lg border border-zinc-800 overflow-hidden overflow-x-auto">
                                        <table className="w-full text-left text-xs whitespace-nowrap">
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
                            {error && (
                                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Success Message (if partial success but stopped) */}
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
                                            <Check className="mr-2 h-4 w-4" /> Importar Residentes
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

