'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ShieldCheck, Smartphone, Landmark, Zap, BellRing, RefreshCw, LogOut, Wallet, Info, Shield } from 'lucide-react'

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
        <div className="mx-auto max-w-6xl space-y-10 p-8">
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

            <div className="grid gap-10 items-start w-full">
                {/* 1. Main Connection Card (Top) */}
                <motion.div
                    whileHover={{ y: -4, scale: 1.005 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-full"
                >
                    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden relative shadow-lg hover:shadow-indigo-500/10 transition-shadow w-full">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-600"></div>
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-white text-xl font-bold">Activar cobranza Automática</CardTitle>
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
                        <CardContent className="space-y-10 pt-8 border-t border-zinc-800/50">
                            {!isConnected ? (
                                <div className="flex flex-col items-center py-8 text-center space-y-10">
                                    <div className="flex flex-col items-center space-y-6">
                                        <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl transition-transform hover:scale-105 duration-300">
                                            {/* Mock MercadoPago Logo */}
                                            <div className="flex items-center gap-3 text-white font-black text-3xl tracking-tighter">
                                                <div className="h-12 w-12 flex items-center justify-center bg-[#009EE3] rounded-xl">
                                                    <Wallet className="text-white h-7 w-7" />
                                                </div>
                                                <span>Mercado<span className="text-[#009EE3]">Pago</span></span>
                                            </div>
                                        </div>
                                        <div className="space-y-2 max-w-md">
                                            <p className="text-white font-bold text-xl">Acepta pagos en linea de forma profesional</p>
                                            <p className="text-zinc-400 text-sm leading-relaxed">
                                                Recibe pagos de mantenimiento mediante tarjetas, SPEI y OXXO directamente en tu cuenta bancaria.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-center gap-6">
                                        <Button
                                            onClick={handleConnect}
                                            disabled={isConnecting}
                                            style={{ backgroundColor: MP_BLUE }}
                                            className="hover:opacity-90 text-white font-bold h-14 px-12 rounded-2xl shadow-2xl shadow-blue-500/20 transition-all active:scale-95 text-lg"
                                        >
                                            {isConnecting ? (
                                                <>
                                                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                                                    Conectando...
                                                </>
                                            ) : (
                                                'Activar pagos en linea'
                                            )}
                                        </Button>
                                        <p className="text-zinc-500 text-sm flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                            Conexión cifrada y segura con Mercado Pago
                                        </p>
                                    </div>

                                    <div className="pt-4 space-y-12 w-full">
                                        <div className="flex flex-col items-center gap-8">
                                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-[0.4em]">Medios de pago soportados</p>
                                            <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-10 px-12 py-10 bg-zinc-950/40 rounded-[3rem] border border-zinc-800/30 backdrop-blur-xl w-full shadow-inner relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                                
                                                {/* Mercado Pago */}
                                                <div className="flex items-center gap-4 grayscale hover:grayscale-0 transition-all duration-500 cursor-default">
                                                    <svg className="h-10 w-auto fill-[#009EE3]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M11.115 16.479a.93.927 0 0 1-.939-.886c-.002-.042-.006-.155-.103-.155-.04 0-.074.023-.113.059-.112.103-.254.206-.46.206a.816.814 0 0 1-.305-.066c-.535-.214-.542-.578-.521-.725.006-.038.007-.08-.02-.11l-.032-.03h-.034c-.027 0-.055.012-.093.039a.788.786 0 0 1-.454.16.7.699 0 0 1-.253-.05c-.708-.27-.65-.928-.617-1.126.005-.041-.005-.072-.03-.092l-.05-.04-.047.043a.728.726 0 0 1-.505.203.73.728 0 0 1-.732-.725c0-.4.328-.722.732-.722.364 0 .675.27.721.63l.026.195.11-.165c.01-.018.307-.46.852-.46.102 0 .21.016.316.05.434.13.508.52.519.68.008.094.075.1.09.1.037 0 .064-.024.083-.045a.746.744 0 0 1 .54-.225c.128 0 .263.03.402.09.69.293.379 1.158.374 1.167-.058.144-.061.207-.005.244l.027.013h.02c.03 0 .07-.014.134-.035.093-.032.235-.08.367-.08a.944.942 0 0 1 .94.93.936.934 0 0 1-.94.928zm7.302-4.171c-1.138-.98-3.768-3.24-4.481-3.77-.406-.302-.685-.462-.928-.533a1.559 1.554 0 0 0-.456-.07c-.182 0-.376.032-.58.095-.46.145-.918.505-1.362.854l-.023.018c-.414.324-.84.66-1.164.73a1.986 1.98 0 0 1-.43.049c-.362 0-.687-.104-.81-.258-.02-.025-.007-.066.04-.125l.008-.008 1-1.067c.783-.774 1.525-1.506 3.23-1.545h.085c1.062 0 2.12.469 2.24.524a7.03 7.03 0 0 0 3.056.724c1.076 0 2.188-.263 3.354-.795a9.135 9.11 0 0 0-.405-.317c-1.025.44-2.003.66-2.946.66-.962 0-1.925-.229-2.858-.68-.05-.022-1.22-.567-2.44-.57-.032 0-.065 0-.096.002-1.434.033-2.24.536-2.782.976-.528.013-.982.138-1.388.25-.361.1-.673.186-.979.185-.125 0-.35-.01-.37-.012-.35-.01-2.115-.437-3.518-.962-.143.1-.28.203-.415.31 1.466.593 3.25 1.053 3.812 1.089.157.01.323.027.491.027.372 0 .744-.103 1.104-.203.213-.059.446-.123.692-.17l-.196.194-1.017 1.087c-.08.08-.254.294-.14.557a.705.703 0 0 0 .268.292c.243.162.677.27 1.08.271.152 0 .297-.015.43-.044.427-.095.874-.448 1.349-.82.377-.296.913-.672 1.323-.782a1.494 1.49 0 0 1 .37-.05.611.61 0 0 1 .095.005c.27.034.533.125 1.003.472.835.62 4.531 3.815 4.566 3.846.002.002.238.203.22.537-.007.186-.11.352-.294.466a.902.9 0 0 1-.484.15.804.802 0 0 1-.428-.124c-.014-.01-1.28-1.157-1.746-1.543-.074-.06-.146-.115-.22-.115a.122.122 0 0 0-.096.045c-.073.09.01.212.105.294l1.48 1.47c.002 0 .184.17.204.395.012.244-.106.447-.35.606a.957.955 0 0 1-.526.171.766.764 0 0 1-.42-.127l-.214-.206a21.035 20.978 0 0 0-1.08-1.009c-.072-.058-.148-.112-.221-.112a.127.127 0 0 0-.094.038c-.033.037-.056.103.028.212a.698.696 0 0 0 .075.083l1.078 1.198c.01.01.222.26.024.511l-.038.048a1.18 1.178 0 0 1-.1.096c-.184.15-.43.164-.527.164a.8.798 0 0 1-.147-.012c-.106-.018-.178-.048-.212-.089l-.013-.013c-.06-.06-.602-.609-1.054-.98-.059-.05-.133-.11-.21-.11a.128.128 0 0 0-.096.042c-.09.096.044.24.1.293l.92 1.003a.204.204 0 0 1-.033.062c-.033.044-.144.155-.479.196a.91.907 0 0 1-.122.007c-.345 0-.712-.164-.902-.264a1.343 1.34 0 0 0 .13-.576 1.368 1.365 0 0 0-1.42-1.357c.024-.342-.025-.99-.697-1.274a1.455 1.452 0 0 0-.575-.125c-.146 0-.287.025-.42.075a1.153 1.15 0 0 0-.671-.564 1.52 1.515 0 0 0-.494-.085c-.28 0-.537.08-.767.242a1.168 1.165 0 0 0-.903-.43 1.173 1.17 0 0 0-.82.335c-.287-.217-1.425-.93-4.467-1.613a17.39 17.344 0 0 1-.692-.189 4.822 4.82 0 0 0-.077.494l.67.157c3.108.682 4.136 1.391 4.309 1.525a1.145 1.142 0 0 0-.09.442 1.16 1.158 0 0 0 1.378 1.132c.096.467.406.821.879 1.003a1.165 1.162 0 0 0 .415.08c.09 0 .179-.012.266-.034.086.22.282.493.722.668a1.233 1.23 0 0 0 .457.094c.122 0 .241-.022.355-.063a1.373 1.37 0 0 0 1.269.841c.37.002.726-.147.985-.41.221.121.688.341 1.163.341.06 0 .118-.002.175-.01.47-.059.689-.24.789-.382a.571.57 0 0 0 .048-.078c.11.032.234.058.373.058.255 0 .501-.086.75-.265.244-.174.418-.424.444-.637v-.01c.083.017.167.026.251.026.265 0 .527-.082.773-.242.48-.31.562-.715.554-.98a1.28 1.279 0 0 0 .978-.194 1.04 1.04 0 0 0 .502-.808 1.088 1.085 0 0 0-.16-.653c.804-.342 2.636-1.003 4.795-1.483a4.734 4.721 0 0 0-.067-.492 27.742 27.667 0 0 0-5.049 1.62zm5.123-.763c0 4.027-5.166 7.293-11.537 7.293-6.372 0-11.538-3.266-11.538-7.293 0-4.028 5.165-7.293 11.539-7.293 6.371 0 11.537 3.265 11.537 7.293zm.46.004c0-4.272-5.374-7.755-12-7.755S.002 7.277.002 11.55L0 12.004c0 4.533 4.695 8.203 11.999 8.203 7.347 0 12-3.67 12-8.204z" />
                                                    </svg>
                                                    <span className="text-white font-bold tracking-tight text-2xl">Mercado Pago</span>
                                                </div>

                                                <div className="w-px h-12 bg-zinc-800/50 hidden md:block"></div>

                                                {/* OXXO */}
                                                <div className="grayscale hover:grayscale-0 transition-all duration-500 cursor-default">
                                                    <svg className="h-12 w-auto" viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
                                                        <rect width="100" height="40" rx="6" fill="#E4002B"/>
                                                        <rect x="2" y="2" width="96" height="36" rx="4" fill="none" stroke="#FFD100" strokeWidth="2"/>
                                                        <text x="50" y="29" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="24" fill="white" textAnchor="middle" letterSpacing="1">OXXO</text>
                                                    </svg>
                                                </div>

                                                <div className="w-px h-12 bg-zinc-800/50 hidden lg:block"></div>

                                                {/* SPEI */}
                                                <div className="flex items-center gap-4 grayscale hover:grayscale-0 transition-all duration-500 cursor-default">
                                                    <div className="bg-[#0054A6] px-5 py-2 rounded-xl shadow-lg">
                                                        <span className="text-white font-black italic tracking-tighter text-3xl">SPEI</span>
                                                    </div>
                                                </div>

                                                <div className="w-px h-12 bg-zinc-800/50 hidden lg:block"></div>

                                                {/* Cards */}
                                                <div className="flex items-center gap-10 grayscale hover:grayscale-0 transition-all duration-500 cursor-default">
                                                    <svg className="h-8 w-auto fill-[#1A1F71]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z" />
                                                    </svg>
                                                    <svg className="h-12 w-auto" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path fill="#EB001B" d="M11.343 18.031c.058.049.12.098.181.146-1.177.783-2.59 1.238-4.107 1.238C3.32 19.416 0 16.096 0 12c0-4.095 3.32-7.416 7.416-7.416 1.518 0 2.931.456 4.105 1.238-.06.051-.12.098-.165.15C9.6 7.489 8.595 9.688 8.595 12c0 2.311 1.001 4.51 2.748 6.031z"/>
                                                        <path fill="#F79E1B" d="M16.584 4.584c-1.52 0-2.931.456-4.105 1.238.06.051.12.098.165.15C14.4 7.489 15.405 9.688 15.405 12c0 2.31-1.001 4.507-2.748 6.031-.058.049-.12.098-.181.146 1.177.783 2.588 1.238 4.107 1.238C20.68 19.416 24 16.096 24 12c0-4.094-3.32-7.416-7.416-7.416z"/>
                                                        <path fill="#FF5F00" d="M12 6.174c-.096.075-.189.15-.28.231C10.156 7.764 9.169 9.765 9.169 12c0 2.236.987 4.236 2.551 5.595.09.08.185.158.28.232.096-.074.189-.152.28-.232 1.563-1.359 2.551-3.359 2.551-5.595 0-2.235-.987-4.236-2.551-5.595-.09-.08-.184-.156-.28-.231z"/>
                                                    </svg>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center gap-4 pt-4 animate-pulse duration-[3000ms]">
                                                <div className="flex items-center gap-3 text-emerald-500/80">
                                                    <Shield className="h-6 w-6 fill-emerald-500/10" />
                                                    <p className="text-sm font-black tracking-[0.3em] uppercase">InmobiGo no administra ni retiene fondos</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 py-2 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                        <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-2xl space-y-2 shadow-inner w-full">
                                            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Cuenta vinculada</p>
                                            <p className="text-white font-semibold text-lg">inmobigo_admin_mp</p>
                                        </div>
                                        <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-2xl space-y-2 shadow-inner w-full">
                                            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Fecha de conexión</p>
                                            <p className="text-white font-semibold text-lg">06 Marzo 2026</p>
                                        </div>
                                        <div className="bg-zinc-950 border border-zinc-800/50 p-6 rounded-2xl space-y-2 shadow-inner w-full">
                                            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Última sincronización</p>
                                            <p className="text-white font-semibold text-lg">Hace 5 minutos</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4 pt-4">
                                        <Button
                                            variant="outline"
                                            className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 h-12 px-8 rounded-xl transition-all"
                                            onClick={handleConnect}
                                        >
                                            <RefreshCw className="mr-3 h-5 w-5" /> Reconectar cuenta
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 h-12 px-8 rounded-xl transition-all"
                                            onClick={handleDisconnect}
                                        >
                                            <LogOut className="mr-3 h-5 w-5" /> Desconectar cuenta
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 2. Features Section (Now in the middle, above security) */}
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-500 w-full ${isConnected ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
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

                {/* 3. Security Card (Independent, Bottom) */}
                <Card className="bg-zinc-950/40 border-zinc-800/50 backdrop-blur-md overflow-hidden group w-full shadow-2xl border-l-4 border-l-indigo-500">
                    <div className="p-10 flex items-start gap-8 text-left">
                        <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-all duration-300 group-hover:scale-110 shadow-lg">
                            <ShieldCheck className="h-10 w-10 text-indigo-400" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-white font-bold text-2xl mb-2">Seguridad Bancaria Avanzada</h3>
                            <p className="text-zinc-400 text-lg leading-relaxed">
                                Tus credenciales están protegidas mediante el protocolo <span className="text-white font-semibold underline decoration-indigo-500/40 underline-offset-4">OAuth oficial de Mercado Pago</span>. 
                                Inmobigo nunca almacena, procesa ni tiene acceso a tus contraseñas bancarias.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* 4. Benefits Card (Independent, Bottom) */}
                <Card className="bg-zinc-950/40 border-zinc-800/50 backdrop-blur-md overflow-hidden w-full shadow-2xl">
                    <div className="p-12 text-left">
                        <h3 className="text-3xl font-bold text-white mb-12 flex items-center gap-5">
                            <span className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xl font-bold shadow-inner">?</span>
                            ¿Qué pasa al conectar tu cuenta?
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {[
                                { icon: Smartphone, title: "Pagos desde la App", desc: "Los residentes podrán pagar todas sus cuotas cómodamente desde su celular", color: "blue" },
                                { icon: Landmark, title: "Depósitos Directos", desc: "Tus fondos llegarán íntegros y directamente a tu cuenta bancaria vinculada", color: "emerald" },
                                { icon: Zap, title: "Conciliación Automática", desc: "Cada pago se registra al instante en tu contabilidad sin intervención manual", color: "amber" },
                                { icon: BellRing, title: "Recordatorios Inteligentes", desc: "El sistema envía notificaciones de cobro automáticas a los residentes", color: "rose" }
                            ].map((benefit, i) => (
                                <div key={i} className="flex gap-6 p-8 rounded-3xl hover:bg-white/[0.04] transition-all duration-500 group border border-transparent hover:border-zinc-800/50 hover:shadow-2xl">
                                    <div className={`p-5 rounded-2xl bg-${benefit.color}-500/10 border border-${benefit.color}-500/20 group-hover:scale-110 transition-transform duration-500 shrink-0 shadow-lg`}>
                                        <benefit.icon className={`h-8 w-8 text-${benefit.color}-400`} />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-white font-bold text-xl group-hover:text-blue-400 transition-colors">{benefit.title}</h4>
                                        <p className="text-zinc-500 text-base leading-relaxed">{benefit.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Future Monetization Section (Hidden for now as requested, but prepared) */}
                <div className="hidden border-t border-zinc-800 pt-8 mt-4 w-full">
                    <div className="flex items-center gap-2 mb-4 text-zinc-500">
                        <Info className="h-4 w-4" />
                        <span className="text-sm font-semibold uppercase tracking-wider">Configuración Avanzada</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
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
