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
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="rounded-lg bg-zinc-800 p-2 text-zinc-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors flex-shrink-0">
                        <Building className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors truncate">{name}</h3>
                        <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1 truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{city} • {type === 'residential' ? 'Residencial' : type}</span>
                        </div>
                    </div>
                </div>
                <Badge variant={status === 'active' ? 'success' : 'default'} className="flex-shrink-0">
                    {status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-zinc-800/50">
                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Ocupación</p>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-bold text-white">{occupancyRate}%</span>
                        <div className="h-1.5 w-full max-w-[100px] rounded-full bg-zinc-800 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${occupancyRate > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${occupancyRate}%` }}
                            />
                        </div>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Residentes</p>
                    <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="text-sm font-bold text-white">{residentsCount} <span className="text-zinc-500 font-normal">/ {unitsCount}</span></span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-500 hover:text-white hover:bg-zinc-800" onClick={() => onEdit(id)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => onDelete(id)}>
                            <Trash className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        <Activity className="h-3 w-3 text-emerald-500" />
                        En línea
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Link href={`/dashboard/residentes?condoId=${id}`} className="w-full">
                        <Button variant="outline" className="w-full gap-2 border-zinc-800 hover:bg-zinc-800 text-zinc-300 h-10 text-xs">
                            <Users className="h-3.5 w-3.5" />
                            Residentes
                        </Button>
                    </Link>
                    <Link href={`/dashboard/condominios/${id}`} className="w-full">
                        <Button className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500 text-white border-0 transition-all h-10 text-xs">
                            Gestionar
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </motion.div>
    )
}
