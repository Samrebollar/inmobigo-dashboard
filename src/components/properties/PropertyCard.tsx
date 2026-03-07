'use client'

import { motion } from 'framer-motion'
import { Building, MapPin, Users, ArrowRight, MoreVertical, Edit, Trash, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export interface PropertyCardProps {
    id: string
    name: string
    city: string
    type: string
    unitsCount: number
    residentsCount: number
    occupancyRate: number
    status: 'active' | 'paused' | 'inactive'
    onEdit: (id: string) => void
    onDelete: (id: string) => void
}

export function PropertyCard({
    id,
    name,
    city,
    type,
    unitsCount,
    residentsCount,
    occupancyRate,
    status,
    onEdit,
    onDelete
}: PropertyCardProps) {

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 transition-all hover:bg-zinc-900/50 hover:shadow-2xl hover:shadow-indigo-500/10"
        >
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-zinc-800 p-2 text-zinc-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors">
                        <Building className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{name}</h3>
                        <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                            <MapPin className="h-3 w-3" />
                            {city} • <span className="capitalize">{type === 'residential' ? 'Residencial' : type}</span>
                        </div>
                    </div>
                </div>
                <Badge variant={status === 'active' ? 'success' : 'default'}>
                    {status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-zinc-800/50">
                <div>
                    <p className="text-xs text-zinc-500 mb-1">Ocupación</p>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{occupancyRate}%</span>
                        <div className="h-1.5 w-16 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${occupancyRate > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${occupancyRate}%` }}
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <p className="text-xs text-zinc-500 mb-1">Residentes</p>
                    <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-sm font-medium text-white">{residentsCount} / {unitsCount * 2}</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white" onClick={() => onEdit(id)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-400" onClick={() => onDelete(id)}>
                        <Trash className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex flex-col gap-2 w-full">
                    <Link href={`/dashboard/residents?condoId=${id}`} className="w-full">
                        <Button className="w-full gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/30 transition-all">
                            <Users className="h-4 w-4" />
                            Ver Residentes
                        </Button>
                    </Link>
                    <Link href={`/dashboard/properties/${id}`} className="w-full">
                        <Button className="w-full gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-0 transition-all">
                            Gestionar Admin
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </motion.div>
    )
}
