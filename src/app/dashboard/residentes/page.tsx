'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
    Search,
    Phone,
    Plus,
    Building,
    FileText,
    User,
    FilePlus,
    AlertTriangle,
    Mail,
    UserCheck,
    CreditCard,
    FileSpreadsheet,
    MessageCircle
} from 'lucide-react'
import { Resident } from '@/types/residents'
import { Invoice } from '@/types/finance'
import { residentsService } from '@/services/residents-service'
import { financeService } from '@/services/finance-service'
import { CreateResidentModal } from '@/components/residents/CreateResidentModal'
import { BulkUploadResidentsModal } from '@/components/residents/BulkUploadResidentsModal'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { useDemoMode } from '@/hooks/use-demo-mode'
import { demoDb } from '@/utils/demo-db'
import { unitsService } from '@/services/units-service'

interface Condominium {
    id: string
    name: string
}

interface ResidentWithFinance extends Resident {
    calculatedDebt: number
    overdueCount: number
    lastPaymentDate?: string
    maxDaysOverdue: number
}



export default function ResidentsPage() {
    const supabase = createClient()

    // State
    const [loading, setLoading] = useState(true)
    const [residents, setResidents] = useState<ResidentWithFinance[]>([])
    const [condominiums, setCondominiums] = useState<Condominium[]>([])
    const [selectedCondo, setSelectedCondo] = useState<string>('')
    const [search, setSearch] = useState('')

    // Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isBulkOpen, setIsBulkOpen] = useState(false)
    const [units, setUnits] = useState<any[]>([])
    const { checkAction, isDemo, loading: loadingDemo } = useDemoMode()
    const searchParams = useSearchParams()
    const condoIdParam = searchParams.get('condoId')

    useEffect(() => {
        if (!loadingDemo) {
            initialize()
        }
    }, [loadingDemo])

    useEffect(() => {
        if (selectedCondo) {
            fetchData(selectedCondo)
        } else {
            setResidents([])
        }
    }, [selectedCondo])

    const initialize = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: orgUser } = await supabase
                .from('organization_users')
                .select('organization_id')
                .eq('user_id', user.id)
                .single()

            if (!orgUser) {
                if (isDemo) {
                    const demoCondos = demoDb.getProperties()
                    setCondominiums(demoCondos.map(c => ({ id: c.id, name: c.name })))
                    if (demoCondos.length > 0) {
                        setSelectedCondo(demoCondos[0].id)
                    }
                }
                setLoading(false)
                return
            }

            const { data: condos } = await supabase
                .from('condominiums')
                .select('id, name')
                .eq('organization_id', orgUser.organization_id)
                .eq('status', 'active')
                .order('name')

            let allCondos = condos || []
            if (isDemo) {
                const demoCondos = demoDb.getProperties()
                // Merge without duplicates
                const demoCondosSimple = demoCondos.map(c => ({ id: c.id, name: c.name }))
                allCondos = [...demoCondosSimple, ...allCondos.filter(c => !demoCondosSimple.some(dc => dc.id === c.id))]
            }

            setCondominiums(allCondos)

            // Priority: Query Param > First Available
            if (condoIdParam && allCondos.some(c => c.id === condoIdParam)) {
                setSelectedCondo(condoIdParam)
            } else if (allCondos.length > 0) {
                setSelectedCondo(allCondos[0].id)
            }
            setLoading(false)
        } catch (error) {
            if (isDemo) {
                const demoCondos = demoDb.getProperties()
                setCondominiums(demoCondos.map(c => ({ id: c.id, name: c.name })))
                if (demoCondos.length > 0) {
                    setSelectedCondo(demoCondos[0].id)
                }
            }
            console.error(error)
            setLoading(false)
        }
    }

    const fetchData = async (condoId: string) => {
        try {
            setLoading(true)
            const [residentsData, invoicesData, unitsData] = await Promise.all([
                residentsService.getByCondominium(condoId),
                financeService.getByCondominium(condoId),
                unitsService.getByCondominium(condoId)
            ])

            setUnits(unitsData)

            // Combine data
            const enrichedResidents = residentsData.map(resident => {
                // Filter invoices for this resident's unit
                // We assume residents are linked to units, and invoices are linked to units
                const unitInvoices = invoicesData.filter(inv =>
                    resident.unit_id && inv.unit_id === resident.unit_id
                )

                const pendingInvoices = unitInvoices.filter(i => i.status === 'pending' || i.status === 'overdue')
                const overdueInvoices = unitInvoices.filter(i => i.status === 'overdue')
                const paidInvoices = unitInvoices.filter(i => i.status === 'paid').sort((a, b) => new Date(b.paid_at || '').getTime() - new Date(a.paid_at || '').getTime())

                const debt = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0)
                const lastPayment = paidInvoices.length > 0 ? paidInvoices[0].paid_at : undefined

                let maxDays = 0
                if (overdueInvoices.length > 0) {
                    const oldest = overdueInvoices.reduce((prev, curr) =>
                        new Date(prev.due_date) < new Date(curr.due_date) ? prev : curr
                    )
                    maxDays = differenceInDays(new Date(), parseISO(oldest.due_date))
                }

                return {
                    ...resident,
                    calculatedDebt: debt,
                    overdueCount: overdueInvoices.length,
                    lastPaymentDate: lastPayment,
                    maxDaysOverdue: maxDays
                }
            })

            setResidents(enrichedResidents)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const filteredResidents = residents.filter(resident =>
        `${resident.first_name} ${resident.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        resident.unit_number?.toLowerCase().includes(search.toLowerCase())
    )

    // Helper for formatting currency
    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
    }

    // Helper actions (mock)
    const handleViewMovements = (id: string) => alert('Ver movimientos: ' + id)
    const handleSendReminder = (id: string) => checkAction(() => alert('Enviar recordatorio: ' + id))
    const handleCreateInvoice = (id: string) => checkAction(() => alert('Crear factura: ' + id))

    return (
        <div className="mx-auto max-w-7xl space-y-6 md:space-y-8 p-4 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Forced recompile console log */}
                {console.log('Rendering residents page (cache busted)')}
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Residentes</h1>
                    <p className="text-sm md:text-base text-zinc-400">Directorio global de residentes por condominio.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
                    <div className="relative">
                        <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <select
                            className="h-10 w-full sm:w-auto rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-8 text-sm text-white focus:border-indigo-500 focus:outline-none appearance-none cursor-pointer"
                            value={selectedCondo}
                            onChange={(e) => setSelectedCondo(e.target.value)}
                        >
                            {condominiums.length === 0 && <option value="">Sin condominios</option>}
                            {condominiums.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                            variant="outline"
                            onClick={() => checkAction(() => setIsBulkOpen(true))}
                            className="flex-1 sm:flex-none border-zinc-800 hover:bg-zinc-800 text-zinc-300 gap-2 h-10 px-3 md:px-4"
                            disabled={!selectedCondo}
                        >
                            <FileSpreadsheet className="h-4 w-4" /> <span className="hidden xs:inline">Carga Masiva</span><span className="xs:hidden">Cargar</span>
                        </Button>
                        <Button
                            onClick={() => checkAction(() => setIsCreateOpen(true))}
                            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500 text-white gap-2 h-10 px-3 md:px-4"
                            disabled={!selectedCondo}
                        >
                            <Plus className="h-4 w-4" /> <span className="hidden xs:inline">Nuevo Residente</span><span className="xs:hidden">Nuevo</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                        placeholder="Buscar por nombre o unidad..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-zinc-900 border-zinc-800 focus:border-indigo-500"
                    />
                </div>
            </div>


            {/* Cards List */}
            <div className="grid gap-6">
                {filteredResidents.map((resident, index) => (
                    <motion.div
                        key={resident.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -5, scale: 1.005, transition: { duration: 0.2 } }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden transition-all duration-300 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 hover:bg-zinc-900/80">
                            <CardContent className="p-0">
                                <div className="flex flex-col lg:flex-row w-full">
                                    {/* Left: Profile Info */}
                                    <div className="p-5 md:p-8 flex-1 border-b lg:border-b-0 lg:border-r border-zinc-800 space-y-5 md:space-y-6">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex items-start gap-4 md:gap-6">
                                                {/* Avatar */}
                                                <div className="h-14 w-14 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-orange-500/20 to-pink-500/20 text-orange-500 flex items-center justify-center text-xl md:text-3xl font-bold border border-orange-500/30 shadow-lg shadow-orange-900/10 flex-shrink-0">
                                                    {resident.first_name.charAt(0)}
                                                </div>
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                                        <h3 className="font-bold text-lg md:text-2xl text-white tracking-tight truncate">
                                                            {resident.first_name} {resident.last_name}
                                                        </h3>
                                                        {resident.overdueCount > 0 && (
                                                            <motion.div
                                                                animate={{ scale: [1, 1.2, 1] }}
                                                                transition={{ repeat: Infinity, duration: 2 }}
                                                                className="flex-shrink-0"
                                                            >
                                                                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                    <p className="text-sm md:text-base text-zinc-400 font-medium truncate">{resident.email}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={`
                                                px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-sm font-medium flex-shrink-0
                                                ${resident.status === 'active'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                                    : 'bg-red-500/10 text-red-400 border-red-500/20'}
                                            `}>
                                                {resident.status === 'active' ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 md:gap-6 pt-2">
                                            <div className="flex items-center gap-3 text-zinc-300 text-sm md:text-base bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                                                <div className="p-2 bg-zinc-800 rounded-md flex-shrink-0">
                                                    <Building className="h-4 w-4 md:h-5 md:w-5 text-indigo-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Unidad</p>
                                                    <p className="font-medium truncate">{resident.unit_number || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-zinc-300 text-sm md:text-base bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                                                <div className="p-2 bg-zinc-800 rounded-md flex-shrink-0">
                                                    <Phone className="h-4 w-4 md:h-5 md:w-5 text-emerald-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Teléfono</p>
                                                    <p className="font-medium truncate">{resident.phone || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle: Finance Info */}
                                    <div className="p-5 md:p-8 lg:w-[350px] border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col justify-center space-y-4 bg-zinc-900/10">
                                        <div>
                                            <p className="text-zinc-400 text-xs md:text-sm font-medium mb-1 uppercase tracking-wider">Saldo pendiente</p>
                                            <p className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                                                {formatMoney(resident.calculatedDebt)}
                                            </p>
                                        </div>
                                        <div className="space-y-3 pt-2">
                                            <div className="flex justify-between items-center text-xs md:text-sm border-b border-zinc-800 pb-2">
                                                <span className="text-zinc-500 font-medium">Último pago</span>
                                                <span className="text-zinc-300 font-semibold">
                                                    {resident.lastPaymentDate ? format(parseISO(resident.lastPaymentDate), 'd MMM yyyy', { locale: es }) : 'Sin registros'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-zinc-400 text-xs md:text-sm">{resident.overdueCount} facturas vencidas</span>
                                                {resident.overdueCount > 0 && (
                                                    <Badge variant="destructive" className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 transition-colors py-0 md:py-1">
                                                        {resident.maxDaysOverdue}+ días
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="p-5 md:p-8 lg:w-[260px] flex flex-col xs:flex-row lg:flex-col gap-3 justify-center bg-zinc-950/30">
                                        <Link href={`/dashboard/residentes/${resident.id}`} className="flex-1 lg:flex-none">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className="w-full flex items-center justify-center lg:justify-start px-4 py-3 rounded-lg text-xs md:text-sm font-semibold transition-all
                                                bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/30 shadow-lg shadow-orange-900/5 h-11 md:h-12"
                                            >
                                                <FileText className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" />
                                                <span className="lg:hidden xl:inline">Movimientos</span><span className="hidden lg:inline xl:hidden">Ver</span>
                                            </motion.button>
                                        </Link>

                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleSendReminder(resident.id)}
                                            className="flex-1 lg:flex-none w-full flex items-center justify-center lg:justify-start px-4 py-3 rounded-lg text-xs md:text-sm font-semibold transition-all
                                            bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 shadow-lg shadow-emerald-900/5 h-11 md:h-12"
                                        >
                                            <svg className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" viewBox="0 0 448 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.6-30.6-38.1-3.2-5.6-.3-8.6 2.5-11.4 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.2 3.7-5.5 5.5-9.2 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.6 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
                                            <span className="lg:hidden xl:inline">Recordatorio</span><span className="hidden lg:inline xl:hidden">Avisar</span>
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleCreateInvoice(resident.id)}
                                            className="flex-1 lg:flex-none w-full flex items-center justify-center lg:justify-start px-4 py-3 rounded-lg text-xs md:text-sm font-semibold transition-all
                                            bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/30 shadow-lg shadow-indigo-900/5 h-11 md:h-12"
                                        >
                                            <FilePlus className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" />
                                            <span className="lg:hidden xl:inline">Factura</span><span className="hidden lg:inline xl:hidden">Cobrar</span>
                                        </motion.button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}

                {filteredResidents.length === 0 && !loading && (
                    <div className="py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                        No se encontraron residentes.
                    </div>
                )}
            </div>

            {selectedCondo && (
                <CreateResidentModal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    onSuccess={(newResident) => {
                        if (isDemo && newResident) {
                            // residentesService.create already saved to demoDb
                            const unit = units.find(u => u.id === newResident.unit_id)
                            const enriched: ResidentWithFinance = {
                                ...newResident,
                                unit_number: unit?.unit_number || 'N/A',
                                calculatedDebt: newResident.debt_amount || 0,
                                overdueCount: 0,
                                maxDaysOverdue: 0
                            }

                            setResidents(prev => {
                                const exists = prev.findIndex(r => r.id === enriched.id)
                                if (exists >= 0) {
                                    const updated = [...prev]
                                    updated[exists] = enriched
                                    return updated
                                }
                                return [enriched, ...prev]
                            })
                        } else {
                            fetchData(selectedCondo)
                        }
                    }}
                    condominiumId={selectedCondo}
                />
            )}

            {selectedCondo && (
                <BulkUploadResidentsModal
                    isOpen={isBulkOpen}
                    onClose={() => setIsBulkOpen(false)}
                    onSuccess={() => fetchData(selectedCondo)}
                    condominiumId={selectedCondo}
                />
            )}
        </div>
    )
}
