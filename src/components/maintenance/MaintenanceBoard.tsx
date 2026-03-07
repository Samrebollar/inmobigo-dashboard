'use client'

import { useState } from 'react'
import { Ticket } from '@/types/tickets'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MoreHorizontal, MessageSquare, Clock, AlertCircle } from 'lucide-react'

interface MaintenanceBoardProps {
    tickets: Ticket[]
    onUpdateTicket: (ticket: Ticket) => void
}

export function MaintenanceBoard({ tickets, onUpdateTicket }: MaintenanceBoardProps) {
    const columns = [
        { id: 'open', label: 'Pendientes', color: 'border-l-rose-500' },
        { id: 'in_progress', label: 'En Progreso', color: 'border-l-indigo-500' },
        { id: 'resolved', label: 'Resueltos', color: 'border-l-emerald-500' }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
            {columns.map(col => {
                const colTickets = tickets.filter(t => t.status === col.id)

                return (
                    <div key={col.id} className="flex flex-col h-full bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                        <div className={`p-4 border-b border-zinc-800 ${col.color} border-l-4 rounded-tl-xl`}>
                            <h3 className="font-medium text-white flex items-center justify-between">
                                {col.label}
                                <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                                    {colTickets.length}
                                </span>
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {colTickets.length === 0 && (
                                <div className="text-center py-10 text-zinc-600 text-sm">
                                    No hay tickets {col.label.toLowerCase()}
                                </div>
                            )}

                            {colTickets.map(ticket => (
                                <Card key={ticket.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all hover:translate-x-1">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <Badge variant={
                                                ticket.priority === 'critical' ? 'destructive' :
                                                    ticket.priority === 'high' ? 'warning' : 'default'
                                            } className="text-xs h-5">
                                                {ticket.priority.toUpperCase()}
                                            </Badge>
                                            <button className="text-zinc-500 hover:text-white">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-white mb-1">{ticket.title}</h4>
                                            <p className="text-xs text-zinc-400 line-clamp-2">{ticket.description}</p>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-zinc-600">{ticket.condominium_name}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
