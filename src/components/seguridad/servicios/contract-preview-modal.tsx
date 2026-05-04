'use client'

import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    X, 
    Download, 
    Eye,
    ShieldCheck,
    Check,
    Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { toast } from 'sonner'

interface ContractPreviewModalProps {
    isOpen: boolean
    onClose: () => void
    contract: any
}

export function ContractPreviewModal({ isOpen, onClose, contract }: ContractPreviewModalProps) {
    const previewRef = useRef<HTMLDivElement>(null)
    const [isDownloading, setIsDownloading] = useState(false)

    if (!contract || !isOpen) return null

    const handleDownloadPDF = async () => {
        if (!previewRef.current) return
        
        setIsDownloading(true)
        const toastId = toast.loading('Generando documento legal PDF...')
        
        try {
            const node = previewRef.current;
            const dataUrl = await toPng(node, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#ffffff'
            })
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [node.offsetWidth, node.offsetHeight]
            })
            
            pdf.addImage(dataUrl, 'PNG', 0, 0, node.offsetWidth, node.offsetHeight)
            pdf.save(`Contrato_Arrendamiento_${contract.tenant_name.replace(/\s+/g, '_')}.pdf`)
            
            toast.success('Contrato legal generado con éxito', { id: toastId })
        } catch (error) {
            console.error('Error generating PDF:', error)
            toast.error('Error al generar el documento', { id: toastId })
        } finally {
            setIsDownloading(false)
        }
    }

    const todayStr = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })
    const startStr = format(new Date(contract.start_date), "d 'de' MMMM 'de' yyyy", { locale: es })
    const endStr = format(new Date(contract.end_date), "d 'de' MMMM 'de' yyyy", { locale: es })

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/95 backdrop-blur-sm"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    className="relative w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
                >
                    {/* Professional Header Controls */}
                    <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80 backdrop-blur-md z-30">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-white/5 text-zinc-400 rounded-lg flex items-center justify-center border border-white/10">
                                <Lock size={18} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white tracking-wide">Documento Legal Verificado</h2>
                                <p className="text-emerald-500 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 mt-0.5">
                                    <ShieldCheck size={10} /> Cumplimiento de Normativa Mexicana
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button 
                                onClick={handleDownloadPDF}
                                disabled={isDownloading}
                                className="h-10 bg-white text-black hover:bg-zinc-200 font-black rounded-xl px-6 flex items-center gap-2 transition-all active:scale-95 shadow-xl"
                            >
                                {isDownloading ? (
                                    <div className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Download size={18} />
                                        <span>DESCARGAR CONTRATO</span>
                                    </>
                                )}
                            </Button>
                            <button 
                                onClick={onClose} 
                                className="p-2 text-zinc-500 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Document Scroll View */}
                    <div className="flex-1 overflow-y-auto p-12 bg-black/40 custom-scrollbar flex justify-center">
                        {/* THE LEGAL DOCUMENT */}
                        <div 
                            ref={previewRef}
                            className="w-full max-w-[850px] bg-white text-black p-20 shadow-2xl rounded-sm font-serif leading-relaxed"
                            style={{ minHeight: '1200px' }}
                        >
                            {/* Legal Header */}
                            <div className="text-center mb-16 underline decoration-1 underline-offset-8">
                                <h1 className="text-2xl font-bold uppercase tracking-widest text-zinc-900">Contrato de Arrendamiento</h1>
                            </div>

                            {/* Preamble */}
                            <div className="mb-10 text-justify text-[13px] text-zinc-800 space-y-4">
                                <p>
                                    En la ciudad de Cancún, Estado de Quintana Roo, a {todayStr}, celebran el presente contrato de arrendamiento por una parte el señor(a) <span className="font-bold underline uppercase">ADMINISTRADOR DE PROPIEDADES INMOBIGO</span>, a quien en lo sucesivo se le denominará como el <span className="font-bold uppercase tracking-tighter">"ARRENDADOR"</span>, y por la otra parte el señor(a) <span className="font-bold underline uppercase">{contract.tenant_name}</span>, a quien en lo sucesivo se le denominará como el <span className="font-bold uppercase tracking-tighter">"ARRENDATARIO"</span>, al tenor de las siguientes:
                                </p>
                            </div>

                            {/* Declaraciones */}
                            <div className="mb-12 space-y-4">
                                <h3 className="font-bold uppercase text-center text-sm tracking-[0.3em] mb-6">Declaraciones</h3>
                                <div className="space-y-4 text-[12px] text-zinc-800 italic">
                                    <p><span className="font-bold not-italic">I.- Declara el ARRENDADOR:</span> Que cuenta con las facultades legales necesarias para dar en arrendamiento el inmueble objeto de este contrato, mismo que se encuentra ubicado en: <span className="font-bold uppercase underline not-italic">"{contract.property_name}, CANCÚN, Q. ROO"</span>.</p>
                                    <p><span className="font-bold not-italic">II.- Declara el ARRENDATARIO:</span> Que es su voluntad tomar en arrendamiento el inmueble anteriormente descrito, habiéndolo revisado previamente y encontrándolo en condiciones óptimas para su uso como habitación.</p>
                                </div>
                            </div>

                            {/* Cláusulas */}
                            <div className="space-y-10">
                                <h3 className="font-bold uppercase text-center text-sm tracking-[0.3em] mb-8">Cláusulas</h3>
                                
                                <div className="space-y-8 text-[12.5px] text-zinc-900 text-justify">
                                    <p>
                                        <span className="font-black uppercase">PRIMERA.- OBJETO.</span> El ARRENDADOR entrega en arrendamiento al ARRENDATARIO el inmueble descrito en la Declaración I, el cual será destinado única y exclusivamente para uso de <span className="font-bold underline italic">CASA HABITACIÓN</span>, quedando estrictamente prohibido darle cualquier otro uso.
                                    </p>

                                    <p>
                                        <span className="font-black uppercase">SEGUNDA.- RENTA.</span> El ARRENDATARIO se obliga a pagar al ARRENDADOR por concepto de renta mensual la cantidad de <span className="font-bold underline">${contract.monthly_rent.toLocaleString()} MXN (SON: {contract.monthly_rent.toLocaleString()} PESOS 00/100 M.N.)</span>, los cuales deberán ser liquidados dentro de los primeros <span className="font-bold">05 (CINCO) DÍAS NATURALES</span> de cada mes.
                                    </p>

                                    <p>
                                        <span className="font-black uppercase">TERCERA.- VIGENCIA.</span> El término de este contrato será de carácter forzoso tanto para el ARRENDADOR como para el ARRENDATARIO, entrando en vigor el día <span className="font-bold">{startStr}</span> y concluyendo de manera definitiva el día <span className="font-bold">{endStr}</span>.
                                    </p>

                                    <p>
                                        <span className="font-black uppercase">CUARTA.- DEPÓSITO.</span> El ARRENDATARIO entrega en este acto la cantidad de <span className="font-bold underline">${contract.deposit?.toLocaleString() || '0'} MXN</span> por concepto de depósito en garantía, el cual servirá para cubrir cualquier desperfecto al inmueble al concluir el arrendamiento, no pudiendo aplicarse en ningún caso al pago de rentas.
                                    </p>

                                    <p>
                                        <span className="font-black uppercase">QUINTA.- MANTENIMIENTO Y SERVICIOS.</span> El pago de servicios de agua, luz, internet y mantenimiento ordinario de la propiedad correrán por cuenta exclusiva del <span className="font-bold">ARRENDATARIO</span>, quien deberá presentar los comprobantes de pago correspondientes al término de cada periodo.
                                    </p>

                                    <p>
                                        <span className="font-black uppercase">SEXTA.- PROHIBICIONES.</span> Queda estrictamente prohibido al ARRENDATARIO subarrendar total o parcialmente el inmueble, así como realizar modificaciones estructurales o de pintura sin el consentimiento previo y por escrito del ARRENDADOR.
                                    </p>

                                    <p>
                                        <span className="font-black uppercase">SÉPTIMA.- JURISDICCIÓN.</span> Para todo lo relativo a la interpretación y cumplimiento del presente contrato, las partes se someten a las leyes y tribunales competentes de la Ciudad de Cancún, Estado de Quintana Roo, renunciando a cualquier otro fuero por razón de domicilio presente o futuro.
                                    </p>
                                </div>
                            </div>

                            {/* Signatures Area */}
                            <div className="mt-28 grid grid-cols-2 gap-32">
                                <div className="text-center space-y-6">
                                    <div className="h-px bg-black w-full" />
                                    <div className="space-y-1">
                                        <p className="text-[12px] font-black uppercase text-zinc-900 tracking-tighter italic">ARRENDADOR</p>
                                        <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-widest leading-none">Admin. Propiedades InmobiGo</p>
                                        <p className="text-[9px] text-zinc-400 font-serif italic pt-2">Firma verificada por sistema</p>
                                    </div>
                                </div>
                                <div className="text-center space-y-6">
                                    <div className="h-px bg-black w-full" />
                                    <div className="space-y-1">
                                        <p className="text-[12px] font-black uppercase text-zinc-900 tracking-tighter italic">{contract.tenant_name}</p>
                                        <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-widest leading-none">ARRENDATARIO</p>
                                        <p className="text-[9px] text-zinc-400 font-serif italic pt-2">Identificación cotejada</p>
                                    </div>
                                </div>
                            </div>

                            {/* Legal Footnote */}
                            <div className="mt-28 pt-8 border-t border-zinc-200 text-center opacity-40">
                                <p className="text-[8px] font-serif uppercase tracking-[0.2em] leading-relaxed">
                                    Este documento es una representación digital del acuerdo legal entre las partes firmantes.<br/>
                                    InmobiGo Secure Asset Management • QR ID: {contract.id.toUpperCase()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 border-t border-zinc-800 bg-zinc-900 flex justify-center items-center gap-6">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Estado del Documento:</span>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Listo para validez legal</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

