'use client'

import React, { useState, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import QRCode from 'react-qr-code'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { 
    format, parseISO, startOfMonth, endOfMonth, 
    startOfWeek, endOfWeek, eachDayOfInterval, 
    isSameDay, subMonths, addMonths, isSameMonth
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
    QrCode, UserPlus, Clock, X, CheckCircle2, History,
    ShieldAlert, Calendar, FileText, ChevronRight, Share2, 
    Download, AlertTriangle, ShieldCheck, ChevronLeft, Gift, Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteModal } from './confirm-delete-modal'
import { deleteVisitorPassAction } from '@/app/actions/service-actions'

export function VisitorPassesModule({ resident }: { resident: any }) {
    const supabase = createClient()
    
    // UI State
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)
    const [passToDelete, setPassToDelete] = useState<any | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    
    useEffect(() => {
        setMounted(true)
    }, [])

    // Data State
    const [passes, setPasses] = useState<any[]>([])
    const [selectedPass, setSelectedPass] = useState<any | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        visitorName: '',
        visitDate: format(new Date(), 'yyyy-MM-dd'),
        startTime: '08:00',
        endTime: '',
        accessType: 'Invitado', // New
        company: '', // New
        serviceType: '', // New
        eventName: '', // New
        guestCount: '', // New
        notes: ''
    })

    const [isDateOpen, setIsDateOpen] = useState(false)
    const [isTimeOpen, setIsTimeOpen] = useState(false)
    const [isAccessTypeOpen, setIsAccessTypeOpen] = useState(false)
    const [viewDate, setViewDate] = useState(new Date())

    useEffect(() => {
        if (!resident?.user_id) return

        fetchPasses()

        // Suscripción Real-time optimizada para el residente
        const channel = supabase
            .channel(`resident-passes-realtime-${resident.user_id}-${Date.now()}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Escuchar INSERT y UPDATE
                    schema: 'public',
                    table: 'visitor_passes',
                    filter: `resident_id=eq.${resident.user_id}`
                },
                (payload) => {
                    const eventType = payload.eventType
                    const newData = payload.new as any
                    const oldData = payload.old as any

                    // Disparar toast solo si el estado cambió a 'used' (REGISTRADO)
                    if (eventType === 'UPDATE' && newData.status === 'used' && oldData.status !== 'used') {
                        console.log('ENTRADA DETECTADA:', newData.visitor_name)
                        toast.success(`✨ ¡Tu invitado ${newData.visitor_name} ha ingresado!`, {
                            description: `Acceso registrado correctamente`,
                            duration: 6000,
                        })
                    }
                    
                    // Refrescar lista en cualquier cambio
                    fetchPasses()
                }
            )
            .subscribe((status) => {
                console.log('Resident Real-time Connection:', status)
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [resident?.user_id])

    const calculateEndTime = (startTime: string, accessType: string) => {
        if (accessType === 'Evento') return '23:59:59'
        
        const [hours, minutes] = startTime.split(':').map(Number)
        const date = new Date()
        date.setHours(hours, minutes, 0)
        
        const duration = accessType === 'Servicio' ? 8 : 4
        date.setHours(date.getHours() + duration)
        
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`
    }

    const fetchPasses = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('visitor_passes')
                .select('*')
                .eq('resident_id', resident.user_id)
                .order('created_at', { ascending: false })

            if (error) {
                if (error.code === '42P01') {
                    console.log('La tabla visitor_passes no ha sido creada aún.')
                } else {
                    console.error('Error fetching passes:', error)
                }
                return
            }
            if (data) setPasses(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleCreatePass = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.visitorName || !formData.visitDate || !formData.startTime) {
            toast.error('Nombre, Fecha y Hora son obligatorios')
            return
        }

        setIsGenerating(true)
        try {
            const orgId = resident.condominiums?.organization_id || resident.organization_id
            const unitId = resident.unit_id || resident.units?.id
            
            if (!orgId) throw new Error('Organization ID not found')

            const token = crypto.randomUUID()
            const endTime = calculateEndTime(formData.startTime, formData.accessType)
            
            // Map display labels to DB keys
            const typeMap: Record<string, string> = {
                'Invitado': 'guest',
                'Servicio': 'service',
                'Evento': 'event'
            }

            const newPass = {
                visitor_name: formData.visitorName,
                access_type: typeMap[formData.accessType] || 'guest',
                visit_date: formData.visitDate,
                start_time: formData.startTime,
                end_time: endTime,
                notes: formData.notes,
                qr_token: token,
                status: 'pending',
                organization_id: orgId,
                organization_name: resident.condominiums?.name || 'InmobiGo',
                resident_id: resident.user_id,
                authorized_by_name: resident.profiles?.full_name || resident.first_name || 'Residente',
                unit_id: unitId,
                unit_name: resident.units?.unit_number || 'S/D'
            }

            const { data, error } = await supabase
                .from('visitor_passes')
                .insert(newPass)
                .select()
                .single()

            if (error) throw error

            toast.success('Pase de seguridad generado')
            setIsCreateModalOpen(false)
            setFormData({
                visitorName: '', 
                visitDate: format(new Date(), 'yyyy-MM-dd'), 
                startTime: '08:00', 
                endTime: '', 
                notes: '',
                accessType: 'Invitado',
                company: '',
                serviceType: '',
                eventName: '',
                guestCount: ''
            })
            fetchPasses()
            setSelectedPass(data)
        } catch (error: any) {
            console.error('Create Pass Error:', error)
            toast.error(`Error al crear el pase: ${error.message || 'Error técnico'}`)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDeletePass = async () => {
        if (!passToDelete) return

        try {
            setIsDeleting(true)
            
            // Usar Server Action para garantizar el borrado sin restricciones RLS
            const result = await deleteVisitorPassAction(passToDelete.id)
            
            if (!result.success) throw new Error(result.error)
            
            toast.success('Pase eliminado definitivamente de la base de datos')
            setPassToDelete(null)
            fetchPasses()
            if (selectedPass?.id === passToDelete.id) setSelectedPass(null)
        } catch (err: any) {
            console.error('Delete Error:', err)
            toast.error(`Error al eliminar: ${err.message || 'Sin permiso'}`)
        } finally {
            setIsDeleting(false)
        }
    }

    const activePasses = passes.filter(p => p.status === 'pending' || p.status === 'used')
    const historyPasses = passes.filter(p => p.status !== 'pending' && p.status !== 'used')

    const getStatusStyle = (status: string) => {
        switch(status) {
            case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
            case 'used': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            case 'expired': return 'bg-red-500/10 text-red-500 border-red-500/20'
            case 'cancelled': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
            default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
        }
    }
    const getStatusText = (status: string) => {
        switch(status) {
            case 'pending': return 'PENDIENTE'
            case 'used': return 'REGISTRADO'
            case 'expired': return 'EXPIRADO'
            case 'cancelled': return 'CANCELADO'
            default: return status.toUpperCase()
        }
    }

    const ticketRef = useRef<HTMLDivElement>(null)
    const qrWrapperRef = useRef<HTMLDivElement>(null)

    const downloadQR = async () => {
        if (!selectedPass) return
        
        const toastId = toast.loading("Generando PDF oficial...")
        
        try {
            // 1. Capture the QR SVG from the wrapper
            const svg = qrWrapperRef.current?.querySelector('svg')
            if (!svg) throw new Error("No QR found")

            // Convert SVG to DataURL via Canvas for jsPDF
            const svgData = new XMLSerializer().serializeToString(svg)
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            const img = new Image()
            
            // Set high resolution for the QR
            const size = 600
            canvas.width = size
            canvas.height = size
            
            const qrImage = await new Promise<string>((resolve, reject) => {
                img.onload = () => {
                    if (ctx) {
                        ctx.fillStyle = '#ffffff'
                        ctx.fillRect(0, 0, size, size)
                        ctx.drawImage(img, 20, 20, size-40, size-40)
                        resolve(canvas.toDataURL('image/png'))
                    }
                }
                img.onerror = reject
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
                img.src = URL.createObjectURL(svgBlob)
            })

            // 2. Build the PDF manually (Vector Sharpness)
            // Format: [width, height] in px
            const pdf = new jsPDF({
                unit: 'px',
                format: [350, 600],
                hotfixes: ['px_runtime']
            })

            // Background
            pdf.setFillColor(9, 9, 11) // #09090b
            pdf.rect(0, 0, 350, 600, 'F')

            // Header Accent (Green Gradient Simulation)
            pdf.setFillColor(16, 185, 129) // emerald-500
            pdf.rect(0, 0, 350, 8, 'F')

            // PDF Header Content (Logic based on name analysis)
            const mainName = selectedPass.visitor_name.toUpperCase()
            const isService = selectedPass.access_type === 'service'
            const isEvent = selectedPass.access_type === 'event'

            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(161, 161, 170) // zinc-400
            pdf.setFontSize(9)
            
            let headerText = 'PASE OFICIAL DE ACCESO'
            if (isService) headerText = 'PASE TÉCNICO / SERVICIO'
            if (isEvent) headerText = 'PASE ESPECIAL / EVENTO'
            
            pdf.text(headerText, 175, 45, { align: 'center' })

            // Visitor Name / Event / Company
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(22)
            
            if (isService) {
                pdf.setFontSize(18)
                pdf.text(mainName, 175, 70, { align: 'center' })
                
                pdf.setFontSize(10)
                pdf.setTextColor(161,161,170)
                pdf.text(`SERVICIO TÉCNICO`, 175, 85, { align: 'center' })
                
                // Shift unit text down
                pdf.setFontSize(10)
                pdf.setFont('helvetica', 'normal')
                pdf.setTextColor(161, 161, 170)
                const buildText = `${selectedPass.organization_name} • Unidad ${selectedPass.unit_name}`
                pdf.text(buildText, 175, 105, { align: 'center' })
            } else if (isEvent) {
                pdf.setFontSize(18)
                pdf.text(mainName, 175, 65, { align: 'center' })
                
                pdf.setFontSize(12)
                pdf.setFont('helvetica', 'bold')
                pdf.setTextColor(167, 139, 250) // Purple accent
                pdf.text(`EVENTO ESPECIAL`, 175, 82, { align: 'center' })
                
                // Shift unit text down
                pdf.setFontSize(10)
                pdf.setFont('helvetica', 'normal')
                pdf.setTextColor(161, 161, 170)
                const buildText = `${selectedPass.organization_name} • Unidad ${selectedPass.unit_name}`
                pdf.text(buildText, 175, 105, { align: 'center' })
            } else {
                pdf.text(mainName, 175, 75, { align: 'center' })
                
                // Standard unit text position
                pdf.setFontSize(10)
                pdf.setFont('helvetica', 'normal')
                pdf.setTextColor(161, 161, 170)
                const buildText = `${selectedPass.organization_name} • Unidad ${selectedPass.unit_name}`
                pdf.text(buildText, 175, 95, { align: 'center' })
            }



            // Divider with Perforation (Circles)
            pdf.setDrawColor(39, 39, 42) // #27272a
            pdf.setLineWidth(1)
            pdf.line(25, 130, 325, 130)
            
            // Circles for perforation effect
            pdf.setFillColor(0, 0, 0)
            pdf.circle(0, 130, 15, 'F')
            pdf.circle(350, 130, 15, 'F')

            // QR Code Section
            // Draw a rounded-ish box for QR
            pdf.setFillColor(255, 255, 255)
            // pdf.roundedRect(75, 170, 200, 200, 20, 20, 'F') // roundedRect is a bit tricky, use rect
            pdf.rect(75, 170, 200, 200, 'F')
            pdf.addImage(qrImage, 'PNG', 85, 180, 180, 180)

            // Details Grid
            pdf.setFillColor(24, 24, 27) // #18181b
            pdf.rect(40, 420, 125, 60, 'F') // Fecha Box
            pdf.rect(185, 420, 125, 60, 'F') // Hora Box

            // Labels
            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(113, 113, 122) // zinc-500
            pdf.text('FECHA', 102.5, 440, { align: 'center' })
            pdf.text('HORARIO', 247.5, 440, { align: 'center' })

            // Date & Time Values
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(12)
            const dateStr = format(parseISO(selectedPass.visit_date), 'd MMM yyyy', {locale:es})
            pdf.text(dateStr, 102.5, 460, { align: 'center' })
            pdf.text(`${selectedPass.start_time.substring(0,5)} hs`, 247.5, 460, { align: 'center' })

            // Footer / Disclaimer
            pdf.setTextColor(82, 82, 91) // zinc-600
            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'normal')
            pdf.text('Escanee este código en el acceso principal.', 175, 540, { align: 'center' })
            pdf.text('Pase válido únicamente para la fecha indicada.', 175, 555, { align: 'center' })

            // Save PDF
            const filename = `PASE_${selectedPass.visitor_name.replace(/\s+/g, '_')}_${selectedPass.visit_date}.pdf`
            pdf.save(filename)
            
            toast.success("¡Pase descargado exitosamente!", { id: toastId })
        } catch (error) {
            console.error('Error generating PDF:', error)
            toast.error("Error al generar el pase oficial", { id: toastId })
        }
    }

    return (
        <div className="w-full bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-600/10 border border-indigo-500/20 flex items-center justify-center shadow-inner shrink-0">
                        <QrCode className="h-7 w-7 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Accesos QR</h2>
                        <p className="text-sm text-zinc-400 font-medium mt-1">Gestiona los permisos de entrada de tus visitantes.</p>
                    </div>
                </div>
                <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-[0_10px_40px_rgba(79,70,229,0.3)] border-none font-bold"
                >
                    <UserPlus className="w-4 h-4 mr-2" /> Pase QR
                </Button>
            </div>

            {/* Tab Nav */}
            <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-2 relative z-10 w-full overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'active' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Pases Activos ({activePasses.length})
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Historial
                </button>
            </div>

            {/* Lista Principal */}
            <div className="flex-1 relative z-10 min-h-[300px]">
                {loading ? (
                    <div className="h-full flex items-center justify-center animate-pulse">
                        <p className="text-zinc-500 font-medium mt-20">Cargando datos seguros...</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeTab === 'active' ? (
                            activePasses.length === 0 ? (
                                <div className="text-center py-12 px-4 border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-900/30">
                                    <ShieldCheck className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                    <p className="text-zinc-400 font-medium tracking-tight">No tienes pases activos.</p>
                                </div>
                            ) : (
                                activePasses.map(pass => (
                                    <div 
                                        key={pass.id} 
                                        onClick={() => setSelectedPass(pass)}
                                        className="bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between cursor-pointer group transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 font-bold group-hover:scale-105 transition-all">
                                                {pass.visitor_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold">{pass.visitor_name}</h4>
                                                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                                                    <Calendar className="w-3 h-3" /> {format(parseISO(pass.visit_date), 'd MMM yyyy', {locale:es})} • {pass.start_time.substring(0,5)} hs
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border ${getStatusStyle(pass.status)}`}>
                                                {getStatusText(pass.status)}
                                            </span>
                                            
                                            {/* Delete Button Profesional */}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setPassToDelete(pass)
                                                }}
                                                className="p-2 rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition-all"
                                                title="Eliminar pase"
                                            >
                                                <Trash2 size={14} />
                                            </button>

                                            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                                        </div>
                                    </div>
                                ))
                            )
                        ) : (
                            historyPasses.length === 0 ? (
                                <div className="text-center py-12 px-4 border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-900/30">
                                    <History className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                    <p className="text-zinc-400 font-medium tracking-tight">El historial está vacío.</p>
                                </div>
                            ) : (
                                historyPasses.map(pass => (
                                    <div 
                                        key={pass.id}
                                        onClick={() => setSelectedPass(pass)}
                                        className="bg-zinc-950/20 hover:bg-zinc-900 border border-zinc-800/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer opacity-80 hover:opacity-100 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-zinc-800/50 rounded-xl flex items-center justify-center text-zinc-500 font-bold">
                                                {pass.visitor_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-zinc-300 font-semibold">{pass.visitor_name}</h4>
                                                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                                                    <Calendar className="w-3 h-3" /> {format(parseISO(pass.visit_date), 'd MMM yyyy', {locale:es})}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded border ${getStatusStyle(pass.status)}`}>
                                                {getStatusText(pass.status)}
                                            </span>

                                            {/* Delete Button Profesional en Historial */}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setPassToDelete(pass)
                                                }}
                                                className="p-1.5 rounded-lg border bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-red-400 hover:border-red-500/30 transition-all"
                                                title="Eliminar del historial"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                )}
            </div>

            {/* Modal: TICKET DIGITAL (Selected Pass) */}
            {mounted && typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {selectedPass && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                                className="w-full max-w-sm relative"
                            >
                                <button
                                    onClick={() => setSelectedPass(null)}
                                    className="absolute -top-16 right-1/2 translate-x-1/2 flex flex-col items-center gap-2 text-white group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 group-hover:bg-white/20 transition-all">
                                        <X className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Cerrar</span>
                                </button>

                                {/* Premium Ticket Layout */}
                                <div 
                                    ref={ticketRef}
                                    ref-id="ticket-container"
                                    style={{ 
                                        backgroundColor: '#09090b', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        borderRadius: '2.5rem', 
                                        overflow: 'hidden', 
                                        boxShadow: '0 40px 100px rgba(0,0,0,1)',
                                        position: 'relative',
                                        width: '350px' // Fixed width for consistent capture
                                    }}
                                >
                                    <div style={{ 
                                        height: '8px', 
                                        width: '100%', 
                                        background: selectedPass.status === 'pending' 
                                            ? 'linear-gradient(to right, #10b981, #2dd4bf)' 
                                            : '#3f3f46' 
                                    }} />
                                    
                                        <div style={{ padding: '32px 32px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                            <div 
                                                style={{ 
                                                    display: 'inline-flex', 
                                                    alignItems: 'center', 
                                                    gap: '8px', 
                                                    padding: '4px 12px', 
                                                    backgroundColor: 'rgba(255,255,255,0.05)', 
                                                    borderRadius: '9999px', 
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    marginBottom: '16px'
                                                }}
                                            >
                                                <ShieldCheck style={{ width: '14px', height: '14px', color: '#34d399' }} />
                                                <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#a1a1aa' }}>Pase Oficial</span>
                                            </div>
                                                                        {/* Smart Header Parsing for UI */}
                                            {(() => {
                                                const isEvent = selectedPass.access_type === 'event'
                                                const isService = selectedPass.access_type === 'service'
                                                
                                                if (isEvent) {
                                                    return (
                                                        <>
                                                            <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', lineHeight: 1, marginBottom: '4px', letterSpacing: '-0.025em' }}>{selectedPass.visitor_name}</h2>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                                <Gift style={{ width: '14px', height: '14px', color: '#a78bfa' }} />
                                                                <span style={{ fontSize: '18px', fontWeight: 900, color: '#a78bfa' }}>Evento Especial</span>
                                                            </div>
                                                        </>
                                                    )
                                                }
                                                
                                                if (isService) {
                                                    return (
                                                        <>
                                                            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', lineHeight: 1.1, marginBottom: '4px' }}>{selectedPass.visitor_name}</h2>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                                <ShieldCheck style={{ width: '12px', height: '12px', color: '#34d399' }} />
                                                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>Servicio Técnico</span>
                                                            </div>
                                                        </>
                                                    )
                                                }
                                                
                                                return <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', lineHeight: 1.25, marginBottom: '8px', letterSpacing: '-0.025em' }}>{selectedPass.visitor_name}</h2>
                                            })()}
                                            
                                            <p style={{ color: '#a1a1aa', fontSize: '12px', fontWeight: 500, backgroundColor: '#18181b', padding: '4px 12px', borderRadius: '8px', border: '1px solid #27272a' }}>
                                                {selectedPass.organization_name} • Unidad {selectedPass.unit_name}
                                            </p>
                                        </div>

                                    <div className="relative flex items-center justify-between">
                                        <div style={{ width: '32px', height: '32px', borderRadius: '9999px', backgroundColor: '#000000', absolute: 'absolute', left: '-16px', border: '1px solid rgba(255,255,255,0.1)' }} className="absolute" />
                                        <div style={{ width: '100%', height: '1px', borderTop: '1px dashed #3f3f46', margin: '0 16px' }} />
                                        <div style={{ width: '32px', height: '32px', borderRadius: '9999px', backgroundColor: '#000000', absolute: 'absolute', right: '-16px', border: '1px solid rgba(255,255,255,0.1)' }} className="absolute" />
                                    </div>

                                    <div className="p-10 flex flex-col items-center relative">
                                        <div 
                                            ref={qrWrapperRef}
                                            style={{ 
                                                padding: '16px', 
                                                borderRadius: '2rem', 
                                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)', 
                                                backgroundColor: '#ffffff', 
                                                position: 'relative',
                                                filter: selectedPass.estado !== 'pendiente' ? 'grayscale(1) opacity(0.5)' : 'none'
                                            }}
                                        >
                                            <QRCode 
                                                value={`https://acceso.inmobigo.mx/${selectedPass.qr_token}`} 
                                                size={180} 
                                                fgColor="#000000" 
                                                bgColor="transparent"
                                                level="H"
                                            />
                                            {selectedPass.status !== 'pending' && (
                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(24,24,27,0.8)', backdropFilter: 'blur(4px)' }}>
                                                    <div style={{ backgroundColor: '#ef4444', color: '#ffffff', fontWeight: 900, fontSize: '12px', padding: '6px 12px', borderRadius: '8px', transform: 'rotate(-15deg)' }}>
                                                        {getStatusText(selectedPass.status)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div style={{ width: '100%', marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.01)', textAlign: 'center' }}>
                                                <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717a', display: 'block', marginBottom: '4px' }}>Fecha</span>
                                                <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 700 }}>{format(parseISO(selectedPass.visit_date), 'd MMM yyyy', {locale:es})}</span>
                                            </div>
                                            <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.01)', textAlign: 'center' }}>
                                                <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717a', display: 'block', marginBottom: '4px' }}>Horario</span>
                                                <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 700 }}>{selectedPass.start_time.substring(0,5)} hs</span>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedPass.status === 'pending' && (
                                        <div className="p-6 pt-0 flex gap-3 pb-10">
                                            <Button 
                                                onClick={downloadQR} 
                                                className="flex-1 h-14 bg-white hover:bg-zinc-200 text-black font-black rounded-2xl transition-all shadow-xl"
                                            >
                                                <Download className="w-4 h-4 mr-2" /> Guardar
                                            </Button>
                                            <Button 
                                                onClick={() => handleCancelPass(selectedPass.id)} 
                                                variant="destructive" 
                                                className="w-14 h-14 p-0 bg-zinc-900 hover:bg-black text-red-500 rounded-2xl border border-red-500/10"
                                            >
                                                <ShieldAlert className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {mounted && typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isCreateModalOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 50 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 50 }}
                                className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-10 w-full max-w-md shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative my-8"
                            >
                                <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-8 right-8 text-zinc-400 hover:text-white bg-zinc-900 rounded-full p-1.5 border border-zinc-800">
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-4 mb-10">
                                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-indigo-500/20 shadow-2xl">
                                        <UserPlus className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight">Autorizar Visita</h2>
                                        <p className="text-sm text-zinc-500 font-medium">Crea un pase de acceso temporal.</p>
                                    </div>
                                </div>
                                
                                <form onSubmit={handleCreatePass} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Tipo de Acceso</label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsAccessTypeOpen(!isAccessTypeOpen)}
                                                className="w-full bg-zinc-900/50 border border-zinc-800 hover:border-indigo-500 rounded-2xl h-14 pl-12 pr-4 text-white text-sm outline-none transition-all flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {formData.accessType === 'Invitado' && <UserPlus className="h-5 w-5 text-indigo-400" />}
                                                    {formData.accessType === 'Servicio' && <ShieldCheck className="h-5 w-5 text-emerald-400" />}
                                                    {formData.accessType === 'Evento' && <Calendar className="h-5 w-5 text-purple-400" />}
                                                    <span className="font-bold text-zinc-200">{formData.accessType}</span>
                                                </div>
                                                <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${isAccessTypeOpen ? 'rotate-90' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {isAccessTypeOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className="absolute top-16 left-0 right-0 z-[100] bg-zinc-950 border border-zinc-800 rounded-2xl p-2 shadow-2xl backdrop-blur-xl"
                                                    >
                                                        {['Invitado', 'Servicio', 'Evento'].map((type) => (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData({ ...formData, accessType: type })
                                                                    setIsAccessTypeOpen(false)
                                                                }}
                                                                className={`
                                                                    w-full h-12 rounded-xl text-xs font-bold transition-all flex items-center px-4 gap-3
                                                                    ${formData.accessType === type ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:bg-white/5'}
                                                                `}
                                                            >
                                                                {type === 'Invitado' && <UserPlus className="h-4 w-4" />}
                                                                {type === 'Servicio' && <ShieldCheck className="h-4 w-4" />}
                                                                {type === 'Evento' && <Calendar className="h-4 w-4" />}
                                                                {type}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {formData.accessType === 'Servicio' && (
                                            <motion.div
                                                key="servicio-fields"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-4 overflow-hidden"
                                            >
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Empresa</label>
                                                        <input
                                                            value={formData.company}
                                                            onChange={e => setFormData({...formData, company: e.target.value})}
                                                            className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500 rounded-2xl h-14 px-4 text-white text-sm outline-none transition-all placeholder:text-zinc-700 font-bold"
                                                            placeholder="Ej. Totalplay"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Tipo de Servicio</label>
                                                        <input
                                                            value={formData.serviceType}
                                                            onChange={e => setFormData({...formData, serviceType: e.target.value})}
                                                            className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500 rounded-2xl h-14 px-4 text-white text-sm outline-none transition-all placeholder:text-zinc-700 font-bold"
                                                            placeholder="Ej. Reparación"
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {formData.accessType === 'Evento' && (
                                            <motion.div
                                                key="evento-fields"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-4 overflow-hidden"
                                            >
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nombre del Evento</label>
                                                        <input
                                                            value={formData.eventName}
                                                            onChange={e => setFormData({...formData, eventName: e.target.value})}
                                                            className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-purple-500 rounded-2xl h-14 px-4 text-white text-sm outline-none transition-all placeholder:text-zinc-700 font-bold"
                                                            placeholder="Ej. Cumpleaños..."
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1"># de Invitados</label>
                                                        <input
                                                            type="number"
                                                            value={formData.guestCount}
                                                            onChange={e => setFormData({...formData, guestCount: e.target.value})}
                                                            className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-purple-500 rounded-2xl h-14 px-4 text-white text-sm outline-none transition-all placeholder:text-zinc-700 font-bold"
                                                            placeholder="Ej. 15"
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                                            {formData.accessType === 'Evento' ? 'Responsable Evento' : 'Nombre Completo'}
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center"><UserPlus className="h-5 w-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" /></div>
                                            <input
                                                required
                                                type="text"
                                                value={formData.visitorName}
                                                onChange={e => setFormData({...formData, visitorName: e.target.value})}
                                                className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl h-14 pl-12 pr-4 text-white text-sm outline-none transition-all placeholder:text-zinc-700"
                                                placeholder={formData.accessType === 'Evento' ? "Nombre del anfitrión o responsable" : "Ingresa nombre y apellido"}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Día Autorizado</label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsDateOpen(!isDateOpen)
                                                    setIsTimeOpen(false)
                                                }}
                                                className="w-full bg-zinc-900/50 border border-zinc-800 hover:border-indigo-500 rounded-2xl h-14 pl-12 pr-4 text-white text-sm outline-none transition-all flex items-center justify-between group"
                                            >
                                                <Calendar className="h-5 w-5 text-zinc-600 absolute left-4 group-hover:text-indigo-400 transition-colors" />
                                                <span className="font-bold text-zinc-200">
                                                    {format(parseISO(formData.visitDate), "d 'de' MMMM, yyyy", { locale: es })}
                                                </span>
                                                <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${isDateOpen ? 'rotate-90' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {isDateOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className="absolute top-16 left-0 right-0 z-[100] bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-2xl backdrop-blur-xl"
                                                    >
                                                        <div className="flex items-center justify-between mb-4">
                                                            <button 
                                                                type="button"
                                                                onClick={() => setViewDate(subMonths(viewDate, 1))}
                                                                className="p-1 hover:bg-white/5 rounded-lg text-zinc-400"
                                                            >
                                                                <ChevronLeft className="w-5 h-5" />
                                                            </button>
                                                            <span className="text-sm font-black text-white uppercase tracking-widest">
                                                                {format(viewDate, 'MMMM yyyy', { locale: es })}
                                                            </span>
                                                            <button 
                                                                type="button"
                                                                onClick={() => setViewDate(addMonths(viewDate, 1))}
                                                                className="p-1 hover:bg-white/5 rounded-lg text-zinc-400"
                                                            >
                                                                <ChevronRight className="w-5 h-5" />
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                                            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                                                                <span key={i} className="text-[10px] font-black text-zinc-600 uppercase">{d}</span>
                                                            ))}
                                                        </div>

                                                        <div className="grid grid-cols-7 gap-1">
                                                            {(() => {
                                                                const start = startOfWeek(startOfMonth(viewDate))
                                                                const end = endOfWeek(endOfMonth(viewDate))
                                                                const days = eachDayOfInterval({ start, end })
                                                                
                                                                return days.map(day => {
                                                                    const isSelected = isSameDay(day, parseISO(formData.visitDate))
                                                                    const isCurrentMonth = isSameMonth(day, viewDate)
                                                                    const isToday = isSameDay(day, new Date())
                                                                    
                                                                    return (
                                                                        <button
                                                                            key={day.toString()}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setFormData({ ...formData, visitDate: format(day, 'yyyy-MM-dd') })
                                                                                setIsDateOpen(false)
                                                                            }}
                                                                            className={`
                                                                                h-9 w-full rounded-xl text-xs font-bold transition-all flex items-center justify-center
                                                                                ${!isCurrentMonth ? 'text-zinc-800 pointer-events-none' : ''}
                                                                                ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:bg-white/5'}
                                                                                ${isToday && !isSelected ? 'text-indigo-400' : ''}
                                                                            `}
                                                                        >
                                                                            {format(day, 'd')}
                                                                        </button>
                                                                    )
                                                                })
                                                            })()}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Horario de Llegada</label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsTimeOpen(!isTimeOpen)
                                                        setIsDateOpen(false)
                                                    }}
                                                    className="w-full bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 rounded-2xl h-14 pl-12 pr-4 text-white text-sm outline-none transition-all flex items-center justify-between group"
                                                >
                                                    <Clock className="h-5 w-5 text-zinc-600 absolute left-4 group-hover:text-emerald-400 transition-colors" />
                                                    <span className="font-bold text-zinc-200">{formData.startTime} hs</span>
                                                    <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${isTimeOpen ? 'rotate-90' : ''}`} />
                                                </button>

                                                <AnimatePresence>
                                                    {isTimeOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            className="absolute top-16 left-0 right-0 z-[100] bg-zinc-950 border border-zinc-800 rounded-2xl p-2 shadow-2xl backdrop-blur-xl max-h-[220px] overflow-y-auto custom-scrollbar"
                                                        >
                                                            <div className="grid grid-cols-4 gap-1">
                                                                {Array.from({ length: 48 }).map((_, i) => {
                                                                    const hour = Math.floor(i / 2)
                                                                    const minute = (i % 2) * 30
                                                                    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
                                                                    const isSelected = formData.startTime === timeStr
                                                                    
                                                                    return (
                                                                        <button
                                                                            key={timeStr}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setFormData({ ...formData, startTime: timeStr })
                                                                                setIsTimeOpen(false)
                                                                            }}
                                                                            className={`
                                                                                h-10 rounded-xl text-xs font-bold transition-all
                                                                                ${isSelected ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:bg-white/5'}
                                                                            `}
                                                                        >
                                                                            {timeStr}
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Notas (Opcional)</label>
                                        <div className="relative group">
                                            <div className="absolute top-4 left-4"><FileText className="h-5 w-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" /></div>
                                            <textarea
                                                value={formData.notes}
                                                onChange={e => setFormData({...formData, notes: e.target.value})}
                                                className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm outline-none min-h-[100px] resize-none transition-all placeholder:text-zinc-700"
                                                placeholder="Ej. Viene en auto azul..."
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6 flex gap-4">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            onClick={() => setIsCreateModalOpen(false)} 
                                            className="flex-1 h-14 text-zinc-500 hover:text-white rounded-2xl"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button 
                                            type="submit" 
                                            disabled={isGenerating} 
                                            className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-indigo-500/20 shadow-xl transition-all"
                                        >
                                            {isGenerating ? 'Generando...' : 'Generar Pase'}
                                        </Button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Modal de Confirmación de Borrado Profesional */}
            <ConfirmDeleteModal 
                isOpen={!!passToDelete}
                onClose={() => setPassToDelete(null)}
                onConfirm={handleDeletePass}
                visitorName={passToDelete?.visitor_name || ''}
                isLoading={isDeleting}
            />
        </div>
    )
}
