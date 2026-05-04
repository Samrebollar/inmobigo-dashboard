'use client'

import { useState } from 'react'
// Force re-index for new route
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ShieldCheck, AlertCircle, RefreshCw, LogOut, Wallet, Info, Zap } from 'lucide-react'

import { motion } from 'framer-motion'

// MercadoPago Blue: #009EE3
const MP_BLUE = '#009EE3'

export default function PaymentsPage() {
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)

    const handleConnect = () => {
        setIsConnecting(true)
        // Simulate OAuth flow
        setTimeout(() => {
            setIsConnected(true)
            setIsConnecting(false)
        }, 1500)
    }

    const handleDisconnect = () => {
        if (confirm('¿Estás seguro de que deseas desconectar tu cuenta de MercadoPago?')) {
            setIsConnected(false)
        }
    }

    return (
        <div className="mx-auto max-w-4xl space-y-8 p-8">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col gap-1"
            >
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Zap className="h-8 w-8 text-indigo-400" />
                    Integraciones
                </h1>
                <p className="text-zinc-400 text-lg">
                    Activa pagos en línea conectando tu cuenta de Mercado Pago.
                </p>
            </motion.div>

            <div className="grid gap-8 items-start">
                {/* Main Connection Card */}
                <motion.div
                    whileHover={{ y: -4, scale: 1.005 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden relative shadow-lg hover:shadow-indigo-500/10 transition-shadow">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-600"></div>
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-white text-xl">Vincular MercadoPago</CardTitle>
                                {isConnected && (
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1">
                                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Cuenta conectada
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="text-zinc-400 text-base">
                                Permite que los residentes paguen cuotas de mantenimiento y otros cargos directamente desde la plataforma.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-4 border-t border-zinc-800/50">
                            {!isConnected ? (
                                <div className="flex flex-col items-center py-8 text-center space-y-6">
                                    <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl">
                                        {/* Mock MercadoPago Logo */}
                                        <div className="flex items-center gap-2 text-white font-black text-2xl tracking-tighter">
                                            <div className="h-10 w-10 flex items-center justify-center bg-[#009EE3] rounded-lg">
                                                <Wallet className="text-white h-6 w-6" />
                                            </div>
                                            <span>Mercado<span className="text-[#009EE3]">Pago</span></span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-white font-semibold text-lg">Aún no has vinculado tu cuenta de Mercado Pago</h3>
                                        <p className="text-zinc-500 max-w-sm mx-auto">
                                            Vincula tu cuenta para activar los pagos automáticos y reconciliación de facturas.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleConnect}
                                        disabled={isConnecting}
                                        style={{ backgroundColor: MP_BLUE }}
                                        className="hover:opacity-90 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-blue-500/10 transition-all active:scale-95"
                                    >
                                        {isConnecting ? (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                Conectando...
                                            </>
                                        ) : (
                                            'Vincular MercadoPago'
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6 py-2">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-zinc-950 border border-zinc-800/50 p-4 rounded-xl space-y-1">
                                            <p className="text-xs text-zinc-500 uppercase font-semibold">Cuenta vinculada</p>
                                            <p className="text-white font-medium">inmobigo_admin_mp</p>
                                        </div>
                                        <div className="bg-zinc-950 border border-zinc-800/50 p-4 rounded-xl space-y-1">
                                            <p className="text-xs text-zinc-500 uppercase font-semibold">Fecha de conexión</p>
                                            <p className="text-white font-medium">06 Marzo 2026</p>
                                        </div>
                                        <div className="bg-zinc-950 border border-zinc-800/50 p-4 rounded-xl space-y-1">
                                            <p className="text-xs text-zinc-500 uppercase font-semibold">Última sincronización</p>
                                            <p className="text-white font-medium">Hace 5 minutos</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            variant="outline"
                                            className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                            onClick={handleConnect}
                                        >
                                            <RefreshCw className="mr-2 h-4 w-4" /> Reconectar cuenta
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                                            onClick={handleDisconnect}
                                        >
                                            <LogOut className="mr-2 h-4 w-4" /> Desconectar cuenta
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Features Section */}
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-500 ${isConnected ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                    {[
                        { title: 'Cobro automático de cuotas', desc: 'Automatiza el cobro mensual.' },
                        { title: 'Pagos en línea para residentes', desc: 'Tus residentes pagan desde la App.' },
                        { title: 'Registro automático de pagos', desc: 'Reconciliación bancaria al instante.' },
                        { title: 'Reportes financieros en tiempo real', desc: 'Todo en orden para tu contabilidad.' }
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ y: -4, scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="flex gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm hover:shadow-emerald-500/5 transition-shadow cursor-default"
                        >
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-white font-medium">{feature.title}</h4>
                                <p className="text-zinc-500 text-sm">{feature.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Security Message Box */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5 flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-1">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-zinc-200 font-semibold">Conexión Segura</h4>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            Tus credenciales están protegidas mediante OAuth con Mercado Pago.
                        </p>
                    </div>
                </div>

                {/* Future Monetization Section (Hidden for now as requested, but prepared) */}
                <div className="hidden border-t border-zinc-800 pt-8 mt-4">
                    <div className="flex items-center gap-2 mb-4 text-zinc-500">
                        <Info className="h-4 w-4" />
                        <span className="text-sm font-semibold uppercase tracking-wider">Configuración Avanzada</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 opacity-50">
                            <label className="text-sm font-medium text-zinc-400">Comisión por transacción (%)</label>
                            <input disabled type="text" value="3.5%" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-500 cursor-not-allowed" />
                        </div>
                        <div className="space-y-2 opacity-50">
                            <label className="text-sm font-medium text-zinc-400">Activar pagos automáticos</label>
                            <div className="h-10 flex items-center">
                                <div className="w-12 h-6 bg-zinc-800 rounded-full relative">
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-zinc-600 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2 opacity-50">
                            <label className="text-sm font-medium text-zinc-400">Suscripciones mensuales</label>
                            <div className="h-10 flex items-center">
                                <div className="w-12 h-6 bg-indigo-600/20 rounded-full relative">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-indigo-500 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

