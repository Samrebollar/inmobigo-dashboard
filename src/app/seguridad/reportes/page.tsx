'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, FileSpreadsheet, History, Calendar, CheckCircle2 } from 'lucide-react'
import { ReportsGeneratorModal } from '@/components/finance/reports-generator'
import { motion } from 'framer-motion'

const WhatsappIcon = ({ size = 24, className = "" }) => (
    <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.015c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.81 9.81 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.85 9.85 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.8 11.8 0 0 0-3.48-8.413" />
    </svg>
)

export default function ReportsPage() {
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
    const [generatorType, setGeneratorType] = useState<'executive' | 'delinquency' | 'whatsapp'>('executive')
    const [history, setHistory] = useState<any[]>([])

    // Cargar historial del LocalStorage al montar
    useEffect(() => {
        const saved = localStorage.getItem('inmobigo_reports_history')
        if (saved) {
            try {
                setHistory(JSON.parse(saved))
            } catch (e) { }
        }
    }, [])

    const handleReportSuccess = (reportMetadata: any) => {
        const newHistory = [reportMetadata, ...history].slice(0, 5) // Guardar los últimos 5
        setHistory(newHistory)
        localStorage.setItem('inmobigo_reports_history', JSON.stringify(newHistory))
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Centro de Reportes</h1>
                    <p className="text-zinc-400">Genera y descarga informes detallados de tus propiedades.</p>
                </div>
            </div>

            <motion.div 
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, staggerChildren: 0.1 }}
            >
                {/* Card 1: Reporte Financiero */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card className="h-full bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group" onClick={() => { setGeneratorType('executive'); setIsGeneratorOpen(true) }}>
                        <CardContent className="h-full p-6 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                                <FileText size={32} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Reporte Financiero</h3>
                                <p className="text-sm text-zinc-500 mt-1">Balances, ingresos y egresos detallados por periodo.</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Card 2: Morosidad */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card className="h-full bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group" onClick={() => { setGeneratorType('delinquency'); setIsGeneratorOpen(true) }}>
                        <CardContent className="h-full p-6 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-4 rounded-full bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 transition-colors">
                                <Calendar size={32} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Morosidad</h3>
                                <p className="text-sm text-zinc-500 mt-1">Listado de unidades con pagos pendientes.</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Card 3: Reporte WhatsApp (Próximamente) */}
                <motion.div>
                    <Card className="relative h-full bg-zinc-950/50 border-zinc-900 overflow-hidden">
                        <div className="absolute top-3 right-3">
                            <span className="inline-flex items-center rounded-full bg-zinc-800/80 px-2 py-1 text-xs font-medium text-zinc-400 ring-1 ring-inset ring-zinc-700/50">
                                Próximamente
                            </span>
                        </div>
                        <CardContent className="h-full p-6 flex flex-col items-center justify-center text-center space-y-4 opacity-60">
                            <div className="p-4 rounded-full bg-emerald-500/5 text-[#25D366]/50">
                                <WhatsappIcon size={32} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white/70 text-lg">Reporte por Whatsapp</h3>
                                <p className="text-sm text-zinc-600 mt-1">Envío automatizado de ingresos y egresos.</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <History className="text-zinc-400" size={20} />
                        <CardTitle className="text-white">Historial de Descargas</CardTitle>
                    </div>
                    <CardDescription className="text-zinc-400">Reportes generados recientemente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {history.length === 0 ? (
                            <p className="text-sm text-zinc-500 text-center py-4">No has generado ningún reporte recientemente.</p>
                        ) : (
                            history.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-950/30 hover:bg-zinc-900/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className={`p-2 rounded-lg ${
                                                item.type.includes('Morosidad') ? 'bg-rose-500/10 text-rose-400' 
                                                : item.type.includes('Whatsapp') || item.type.includes('WhatsApp') ? 'bg-emerald-500/10 text-[#25D366]' 
                                                : 'bg-indigo-500/10 text-indigo-400'
                                            }`}
                                        >
                                            {item.format === 'PDF' ? <FileText size={20} /> : <FileSpreadsheet size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{item.type} - <span className="text-zinc-400 font-normal">{item.periodName}</span></p>
                                            <p className="text-sm text-zinc-500">{item.date} • {item.size}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-zinc-600 cursor-not-allowed" title="Los reportes generados se descargan inmediatamente. Para obtener otra copia, vuelve a generarlo.">
                                        <CheckCircle2 size={16} className="text-emerald-500 mr-2" /> Completado
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <ReportsGeneratorModal
                isOpen={isGeneratorOpen}
                reportType={generatorType}
                onClose={() => setIsGeneratorOpen(false)}
                onSuccess={handleReportSuccess}
            />
        </div>
    )
}
