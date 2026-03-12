'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, FileSpreadsheet, History, Calendar } from 'lucide-react'
import { ReportsGeneratorModal } from '@/components/finance/reports-generator'

export default function ReportsPage() {
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)

    // Mock history data
    const history = [
        { id: 1, type: 'Reporte Mensual', date: '2024-05-01', size: '2.4 MB', format: 'PDF' },
        { id: 2, type: 'Morosidad - Abril', date: '2024-04-05', size: '1.1 MB', format: 'Excel' },
        { id: 3, type: 'Gastos Trimestre Q1', date: '2024-04-01', size: '4.8 MB', format: 'PDF' },
    ]

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Centro de Reportes</h1>
                    <p className="text-zinc-400">Genera y descarga informes detallados de tu organización.</p>
                </div>
                <Button
                    onClick={() => setIsGeneratorOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                >
                    <Download className="mr-2 h-4 w-4" /> Nuevo Reporte
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group" onClick={() => setIsGeneratorOpen(true)}>
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                            <FileText size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Reporte Financiero</h3>
                            <p className="text-sm text-zinc-500 mt-1">Balances, ingresos y egresos detallados por periodo.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group" onClick={() => setIsGeneratorOpen(true)}>
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                            <FileSpreadsheet size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Reporte Operativo</h3>
                            <p className="text-sm text-zinc-500 mt-1">Ocupación, residentes y estado de tickets.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group" onClick={() => setIsGeneratorOpen(true)}>
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="p-4 rounded-full bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 transition-colors">
                            <Calendar size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Morosidad</h3>
                            <p className="text-sm text-zinc-500 mt-1">Listado de unidades con pagos pendientes.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

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
                        {history.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-950/30 hover:bg-zinc-900/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${item.format === 'PDF' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                        {item.format === 'PDF' ? <FileText size={20} /> : <FileSpreadsheet size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{item.type}</p>
                                        <p className="text-sm text-zinc-500">{item.date} • {item.size}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                    <Download size={16} />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <ReportsGeneratorModal
                isOpen={isGeneratorOpen}
                onClose={() => setIsGeneratorOpen(false)}
            />
        </div>
    )
}
