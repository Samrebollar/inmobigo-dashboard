// Force refresh
'use client'
console.log('Mounting Property Page')

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    Building, MapPin, Users, Home, TrendingUp, Settings,
    ArrowLeft, Edit, AlertCircle
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
import { propertiesService } from '@/services/properties-service'
import { Condominium } from '@/types/properties'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import { UnitsTab } from '@/components/properties/tabs/UnitsTab'
import { ResidentsTab } from '@/components/properties/tabs/ResidentsTab'
import { SummaryTab } from '@/components/properties/tabs/SummaryTab'
import { FinanceTab } from '@/components/properties/tabs/FinanceTab'
import { SettingsTab } from '@/components/properties/tabs/SettingsTab'
import { demoDb } from '@/utils/demo-db'

export default function CondominiumPage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()

    const [condo, setCondo] = useState<Condominium | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('summary')

    useEffect(() => {
        fetchCondo()
    }, [])

    const fetchCondo = async () => {
        try {
            if (!params.id) {
                console.error('No ID in params:', params)
                return
            }

            const id = params.id as string
            console.log('Fetching Condo ID:', id)

            let data: Condominium | null = null

            if (id.startsWith('demo-')) {
                const demoProperties = demoDb.getProperties()
                data = demoProperties.find(p => p.id === id) || null
            } else {
                data = await propertiesService.getById(id)
            }

            console.log('Condo Data:', data)

            // Verify organization ownership
            const { data: { user } } = await supabase.auth.getUser()

            // Si estamos en modo demo (id empieza con demo-) o si data existe y hay usuario
            if (data && (id.startsWith('demo-') || user)) {
                setCondo(data)
            } else {
                router.push('/dashboard/properties')
            }
        } catch (error) {
            console.error(error)
            router.push('/dashboard/properties')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl p-6 space-y-8">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <Skeleton className="h-[200px] w-full rounded-2xl" />
            </div>
        )
    }

    if (!condo) return null

    const tabs = [
        { id: 'summary', label: 'Resumen', icon: TrendingUp },
        { id: 'units', label: 'Unidades', icon: Home },
        { id: 'residents', label: 'Residentes', icon: Users },
        { id: 'finance', label: 'Facturación', icon: AlertCircle },
        { id: 'settings', label: 'Configuración', icon: Settings },
    ]

    return (
        <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-b-3xl bg-zinc-900 border-b border-zinc-800 pb-8 pt-6 px-8 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10" />

                {/* Breadcrumb / Back */}
                <button
                    onClick={() => router.push('/dashboard/properties')}
                    className="relative z-10 mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Volver a Propiedades
                </button>

                <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700 shadow-xl">
                            <Building className="h-8 w-8 text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-white tracking-tight">{condo.name}</h1>
                                <Badge variant={condo.status === 'active' ? 'success' : 'warning'}>
                                    {condo.status === 'active' ? 'Activo' : 'Pausado'}
                                </Badge>
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-sm text-zinc-400">
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {condo.city}, {condo.state}
                                </div>
                                <div className="h-1 w-1 rounded-full bg-zinc-700" />
                                <span className="capitalize">{condo.type === 'residential' ? 'Residencial' : condo.type}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" className="gap-2 border-zinc-700 hover:bg-zinc-800">
                            <Settings className="h-4 w-4" /> Configuración
                        </Button>
                        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-500">
                            <Edit className="h-4 w-4" /> Editar Info
                        </Button>
                    </div>
                </div>

                {/* Quick Stats in Hero */}
                <div className="relative z-10 mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-8 border-t border-zinc-800/50 pt-8">
                    <div className="space-y-1">
                        <p className="text-sm text-zinc-500">Total Unidades</p>
                        <p className="text-2xl font-bold text-white">{condo.units_total}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-zinc-500">Ocupación</p>
                        <div className="flex items-center gap-2">
                            {(() => {
                                const residentsCount = condo.id.startsWith('demo-') ? demoDb.getResidents(condo.id).length : Math.floor(condo.units_total * 0.85)
                                const occRate = condo.units_total > 0 ? Math.min(100, Math.round((residentsCount / condo.units_total) * 100)) : 0
                                return (
                                    <p className={`text-2xl font-bold ${occRate > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {occRate}%
                                    </p>
                                )
                            })()}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-zinc-500">Residentes</p>
                        <p className="text-2xl font-bold text-white">
                            {condo.id.startsWith('demo-') ? demoDb.getResidents(condo.id).length : Math.floor(condo.units_total * 0.85)}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-zinc-500">Morosidad</p>
                        <p className="text-2xl font-bold text-rose-400">0%</p>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="mt-8 px-6">
                <div className="border-b border-zinc-800">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                    group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium transition-all
                    ${activeTab === tab.id
                                            ? 'border-indigo-500 text-indigo-400'
                                            : 'border-transparent text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                                        }
                  `}
                                >
                                    <Icon className={`-ml-0.5 mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'summary' && <SummaryTab />}
                        {activeTab === 'units' && <UnitsTab />}
                        {activeTab === 'residents' && <ResidentsTab />}
                        {activeTab === 'finance' && <FinanceTab />}
                        {activeTab === 'settings' && <SettingsTab />}
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
