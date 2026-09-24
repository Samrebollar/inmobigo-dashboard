'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, FileSpreadsheet, History, Calendar, CheckCircle2, BookOpen, Handshake, Eye } from 'lucide-react'
import { ReportsGeneratorModal } from '@/components/finance/reports-generator'
import { motion } from 'framer-motion'

export default function ReportsPage() {
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
    const [generatorType, setGeneratorType] = useState<'executive' | 'delinquency' | 'bitacora' | 'convenios' | 'lectura'>('executive')
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

                {/* Card 3: Reporte de Bitácora */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card className="h-full bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group" onClick={() => { setGeneratorType('bitacora'); setIsGeneratorOpen(true) }}>
                        <CardContent className="h-full p-6 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                                <BookOpen size={32} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Reportes de Bitácora</h3>
                                <p className="text-sm text-zinc-500 mt-1">Accesos, entregas y amenidades registrados por periodo.</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Card 4: Convenios */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card className="h-full bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group" onClick={() => { setGeneratorType('convenios'); setIsGeneratorOpen(true) }}>
                        <CardContent className="h-full p-6 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-4 rounded-full bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                                <Handshake size={32} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Convenios</h3>
                                <p className="text-sm text-zinc-500 mt-1">Convenios de pago acordados con residentes y su estatus.</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Card 5: Control de Lectura */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card className="h-full bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group" onClick={() => { setGeneratorType('lectura'); setIsGeneratorOpen(true) }}>
                        <CardContent className="h-full p-6 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-4 rounded-full bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                                <Eye size={32} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Reporte de Control de Lectura</h3>
                                <p className="text-sm text-zinc-500 mt-1">Quién confirmó haber leído cada aviso, y quién falta.</p>
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
                                                : item.type.includes('Bitácora') ? 'bg-emerald-500/10 text-emerald-400'
                                                : item.type.includes('Convenios') ? 'bg-amber-500/10 text-amber-400'
                                                : item.type.includes('Control de Lectura') ? 'bg-cyan-500/10 text-cyan-400'
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
