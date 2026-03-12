'use client'

import { motion } from 'framer-motion'
import { Settings, Shield, Bell, Database, Globe, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-black text-white tracking-tighter">Configuración del Sistema</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 space-y-6">
                        <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
                            <div className="h-12 w-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">Seguridad Global</h3>
                                <p className="text-zinc-500 text-xs">Ajustes de autenticación y acceso.</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                                <span className="text-sm font-medium text-zinc-300">Autenticación 2FA</span>
                                <div className="h-4 w-8 bg-indigo-600 rounded-full cursor-pointer relative">
                                    <div className="absolute right-1 top-1 h-2 w-2 bg-white rounded-full" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                                <span className="text-sm font-medium text-zinc-300">Sesiones Simultáneas</span>
                                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Limitado</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 space-y-6">
                        <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
                            <div className="h-12 w-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20">
                                <Bell size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">Notificaciones System-wide</h3>
                                <p className="text-zinc-500 text-xs">Alertas para dueños y soporte.</p>
                            </div>
                        </div>
                        <Button variant="ghost" className="w-full text-zinc-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">
                            Configurar Webhooks de Alerta
                        </Button>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="h-24 w-24 bg-zinc-950 rounded-[2rem] flex items-center justify-center text-zinc-700 border border-zinc-800 scale-110 mb-2">
                        <Database size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Infraestructura</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto">Estado de los servidores, buckets de almacenamiento y conexiones a base de datos en tiempo real.</p>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 rounded-full border border-emerald-500/20">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Todos los sistemas operativos</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
