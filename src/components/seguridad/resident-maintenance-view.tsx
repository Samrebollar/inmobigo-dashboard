'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Plus, Filter, Wrench, Clock, CheckCircle2, AlertCircle, ChevronRight, Search } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { Ticket } from '@/types/tickets'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CreateTicketModal } from '@/components/seguridad/CreateTicketModal'

// Mock data generator for visual dev (replace with real fetch later if needed, but we'll try to fetch real data)
const MOCK_TICKETS: Ticket[] = [
    {
        id: '1',
        title: 'Fuga de agua en baño principal',
        description: 'Hay una gotera constante en el lavabo del baño principal.',
        status: 'open',
        priority: 'high',
        created_at: '2026-02-15T10:00:00Z',
        updated_at: '2026-02-15T10:00:00Z',
        organization_id: 'org1',
        condominium_id: 'condo1',
    },
    {
        id: '2',
        title: 'Luz del pasillo fundida',
        description: 'La lámpara del pasillo de entrada no enciende.',
        status: 'resolved',
        priority: 'low',
        created_at: '2026-02-10T14:30:00Z',
        updated_at: '2026-02-11T09:00:00Z',
        organization_id: 'org1',
        condominium_id: 'condo1',
    }
]

export default function ResidentMaintenanceView({ user }: { user: any }) {
    const supabase = createClient()
    const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS) // Start with mock for instant UI feedback
    const [loading, setLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Fetch real tickets
    useEffect(() => {
        const fetchTickets = async () => {
            // In a real app, we would fetch from Supabase
            // const { data } = await supabase.from('tickets').select('*').eq('resident_id', user.id)
            // if (data) setTickets(data)
            setLoading(false)
        }
        fetchTickets()
    }, [user.id])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
            case 'in_progress': return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
            case 'resolved': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
            case 'closed': return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
            default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'open': return 'Abierto'
            case 'in_progress': return 'En Progreso'
            case 'resolved': return 'Resuelto'
            case 'closed': return 'Cerrado'
            default: return status
        }
    }

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'high':
            case 'critical': return <AlertCircle className="h-4 w-4 text-rose-500" />
            default: return <div className="h-2 w-2 rounded-full bg-blue-500" />
        }
    }

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <div className="h-full flex flex-col space-y-8 p-2 md:p-8 max-w-7xl mx-auto">

            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Wrench className="h-8 w-8 text-indigo-500" />
                        Mantenimiento
                    </h1>
                    <p className="text-zinc-400 mt-1">Reporta problemas y da seguimiento a tus solicitudes.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Reporte
                    </Button>
                </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 flex items-center gap-4 cursor-pointer hover:border-indigo-500/30 hover:shadow-indigo-500/10 group"
                >
                    <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <TicketIcon className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-zinc-400 text-sm font-medium">Tickets Abiertos</p>
                        <h3 className="text-3xl font-bold text-white">1</h3>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 flex items-center gap-4 cursor-pointer hover:border-emerald-500/30 hover:shadow-emerald-500/10 group"
                >
                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-zinc-400 text-sm font-medium">Resueltos</p>
                        <h3 className="text-3xl font-bold text-white">12</h3>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 flex items-center gap-4 cursor-pointer hover:border-amber-500/30 hover:shadow-amber-500/10 group"
                >
                    <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <Clock className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-zinc-400 text-sm font-medium">Tiempo Promedio</p>
                        <h3 className="text-3xl font-bold text-white">24h</h3>
                    </div>
                </motion.div>
            </div>

            {/* Filters & Content */}
            <div className="space-y-4">
                <div className="flex items-center gap-4 bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800 w-full md:w-fit">
                    <Search className="h-5 w-5 text-zinc-500 ml-2" />
                    <Input
                        placeholder="Buscar tickets..."
                        className="border-none bg-transparent focus-visible:ring-0 text-white placeholder:text-zinc-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>

                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid gap-4"
                >
                    {tickets.map((ticket) => (
                        <motion.div
                            key={ticket.id}
                            variants={item}
                            whileHover={{ scale: 1.01, x: 4 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 hover:bg-zinc-900 hover:border-indigo-500/30 transition-all cursor-pointer"
                        >
                            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 p-2 rounded-xl ${ticket.priority === 'high' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        <Wrench className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                                            {ticket.title}
                                        </h3>
                                        <p className="text-zinc-400 text-sm line-clamp-1">{ticket.description}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> Reportado el {new Date(ticket.created_at).toLocaleDateString()}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                {getPriorityIcon(ticket.priority)} Prioridad {ticket.priority}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-4 mt-4 md:mt-0 pl-14 md:pl-0">
                                    <Badge variant="outline" className={getStatusColor(ticket.status)}>
                                        {getStatusLabel(ticket.status)}
                                    </Badge>
                                    <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {tickets.length === 0 && (
                    <div className="text-center py-20 text-zinc-500">
                        <Wrench className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No tienes reportes activos</p>
                    </div>
                )}
            </div>

            <CreateTicketModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => { }} // Reload tickets
            />
        </div>
    )
}

function TicketIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            <path d="M13 5v2" />
            <path d="M13 17v2" />
            <path d="M13 11v2" />
        </svg>
    )
}

