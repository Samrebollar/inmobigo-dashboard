'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, Filter, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FinanceTab() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-medium text-white">Facturación y Cobranza</h3>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">
                        <Filter className="mr-2 h-4 w-4" /> Periodo: Este Mes
                    </Button>
                    <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">
                        <Download className="mr-2 h-4 w-4" /> Exportar
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Facturado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">$124,500.00</div>
                        <div className="flex items-center gap-1 text-xs text-emerald-500">
                            <ArrowUpRight className="h-3 w-3" /> +12% vs mes anterior
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Recaudado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">$98,200.00</div>
                        <p className="text-xs text-zinc-500">78.8% del total</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Por Cobrar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-400">$26,300.00</div>
                        <p className="text-xs text-zinc-500">24 facturas pendientes</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Vencido (Morosidad)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-400">$4,500.00</div>
                        <div className="flex items-center gap-1 text-xs text-rose-500">
                            <ArrowDownRight className="h-3 w-3" /> +2% vs mes anterior
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Invoices Table */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle>Facturas Recientes</CardTitle>
                    <CardDescription>Últimos movimientos registrados en el condominio.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-900/80 text-zinc-400">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Folio</th>
                                    <th className="px-4 py-3 font-medium">Unidad</th>
                                    <th className="px-4 py-3 font-medium">Concepto</th>
                                    <th className="px-4 py-3 font-medium">Monto</th>
                                    <th className="px-4 py-3 font-medium">Estado</th>
                                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i} className="hover:bg-zinc-900/50 transition-colors">
                                        <td className="px-4 py-3 text-white font-medium">INV-{2024000 + i}</td>
                                        <td className="px-4 py-3 text-zinc-300">A-{100 + i}</td>
                                        <td className="px-4 py-3 text-zinc-400">Mantenimiento Marzo 2024</td>
                                        <td className="px-4 py-3 text-white font-medium">$2,500.00</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={i % 3 === 0 ? 'destructive' : i % 2 === 0 ? 'success' : 'warning'}>
                                                {i % 3 === 0 ? 'Vencida' : i % 2 === 0 ? 'Pagada' : 'Pendiente'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <FileText className="h-4 w-4 text-zinc-400" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
