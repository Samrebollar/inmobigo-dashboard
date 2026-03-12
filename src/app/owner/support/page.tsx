'use client'

import { motion } from 'framer-motion'
import { Headphones, MessageSquare, Mail, PlayCircle, History } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SupportPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black text-white tracking-tighter">Centro de Soporte</h1>
                <p className="text-zinc-500 font-medium">Gestiona tickets técnicos y atención a administradores.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-6">
                    <div className="h-20 w-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <MessageSquare size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-widest">Tickets Pendientes</h3>
                        <p className="text-4xl font-black text-white mt-2">12</p>
                    </div>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-6 font-bold transition-all">
                        Atender Ahora
                    </Button>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-6">
                    <div className="h-20 w-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                        <History size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-widest">Resueltos Hoy</h3>
                        <p className="text-4xl font-black text-white mt-2">45</p>
                    </div>
                    <Button variant="outline" className="w-full bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white rounded-2xl py-6 font-bold transition-all">
                        Ver Historial
                    </Button>
                </div>
            </div>

            <div className="bg-indigo-600 rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-all">
                    <PlayCircle size={120} className="text-white" />
                </div>
                <div className="relative z-10 max-w-lg">
                    <h3 className="text-2xl font-black text-white tracking-tight mb-2">Tutoriales de Plataforma</h3>
                    <p className="text-indigo-100 font-medium mb-6">Aprende a gestionar las funciones más avanzadas del dashboard de dueño.</p>
                    <Button className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl px-8 font-bold transition-all">
                        Ver Vídeos
                    </Button>
                </div>
            </div>
        </div>
    )
}
