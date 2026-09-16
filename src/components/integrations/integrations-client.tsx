'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    CheckCircle2, ShieldCheck, Smartphone, Landmark, Zap, BellRing,
    RefreshCw, LogOut, Wallet, Shield, AlertTriangle, ExternalLink,
    Loader2, CheckCircle, XCircle, Clock, Building2
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'

const MP_BLUE = '#009EE3'

interface CondominiumStatus {
    condominiumId: string
    condominiumName: string
    connected: boolean
    mpUserId: string | null
    expiresAt: string | null
    lastUpdated: string | null
}

interface IntegrationsClientProps {
    /** Lista de condominios con su estado de conexión a MP */
    condominiums: CondominiumStatus[]
}

function buildOAuthUrl(condominiumId: string): string {
    const clientId = process.env.NEXT_PUBLIC_MP_CLIENT_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const redirectUri = encodeURIComponent(`${appUrl}/api/mercadopago/oauth/callback`)
    return (
        `https://auth.mercadopago.com/authorization` +
        `?client_id=${clientId}` +
        `&response_type=code` +
        `&platform_id=mp` +
        `&state=${encodeURIComponent(condominiumId)}` +
        `&redirect_uri=${redirectUri}`
    )
}

function formatExpiresAt(dateStr: string | null): string {
    if (!dateStr) return 'Desconocida'
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatLastUpdated(dateStr: string | null): string {
    if (!dateStr) return 'N/A'
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Hoy'
    if (days === 1) return 'Ayer'
    return `Hace ${days} días`
}

// ── Tarjeta individual de condominio ──────────────────────────────────────────
function CondominiumCard({ condo, onDisconnect }: {
    condo: CondominiumStatus
    onDisconnect: (id: string, name: string) => void
}) {
    const oauthUrl = buildOAuthUrl(condo.condominiumId)

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all duration-300 group"
        >
            {/* Accent line */}
            <div className={`absolute top-0 left-0 w-1 h-full rounded-l-3xl transition-colors ${
                condo.connected
                    ? 'bg-gradient-to-b from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-b from-zinc-600 to-zinc-700'
            }`} />

            <div className="pl-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2.5 rounded-2xl shrink-0 ${
                            condo.connected
                                ? 'bg-emerald-500/10 border border-emerald-500/20'
                                : 'bg-zinc-800 border border-zinc-700'
                        }`}>
                            <Building2 className={`h-5 w-5 ${condo.connected ? 'text-emerald-400' : 'text-zinc-500'}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-white font-bold text-sm truncate">{condo.condominiumName}</p>
                            {condo.mpUserId && (
                                <p className="text-zinc-500 text-xs mt-0.5 font-mono">ID: {condo.mpUserId}</p>
                            )}
                        </div>
                    </div>

                    {condo.connected ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0 text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" /> Conectado
                        </Badge>
                    ) : (
                        <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 shrink-0 text-xs">
                            <XCircle className="mr-1 h-3 w-3" /> Sin conectar
                        </Badge>
                    )}
                </div>

                {/* Stats when connected */}
                {condo.connected && (
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-zinc-950/60 rounded-2xl p-3 border border-zinc-800/50">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                                <Clock className="inline h-2.5 w-2.5 mr-1" />Vence
                            </p>
                            <p className="text-white text-xs font-semibold">{formatExpiresAt(condo.expiresAt)}</p>
                        </div>
                        <div className="bg-zinc-950/60 rounded-2xl p-3 border border-zinc-800/50">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Conexión</p>
                            <p className="text-white text-xs font-semibold">{formatLastUpdated(condo.lastUpdated)}</p>
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                    {condo.connected ? (
                        <>
                            {/* Reconectar = volver a iniciar OAuth */}
                            <a
                                href={oauthUrl}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white text-xs font-bold transition-all border border-zinc-700"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Reconectar
                            </a>
                            <button
                                onClick={() => onDisconnect(condo.condominiumId, condo.condominiumName)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all border border-rose-500/20"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                                Desconectar
                            </button>
                        </>
                    ) : (
                        <a
                            href={oauthUrl}
                            style={{ backgroundColor: MP_BLUE }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Conectar con Mercado Pago
                        </a>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function IntegrationsClient({ condominiums: initialCondominiums }: IntegrationsClientProps) {
    const [condominiums, setCondominiums] = useState<CondominiumStatus[]>(initialCondominiums)
    const [disconnectTarget, setDisconnectTarget] = useState<{ id: string; name: string } | null>(null)
    const [isDisconnecting, setIsDisconnecting] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const anyConnected = condominiums.some((c) => c.connected)

    // Refrescar estado si la URL tiene ?mp_connected=1 o ?mp_error=...
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const mpConnected = params.get('mp_connected')
        const mpError = params.get('mp_error')

        if (mpConnected) {
            toast.success('¡Cuenta de Mercado Pago conectada exitosamente!')
            // Limpiar parámetro de la URL sin recargar
            window.history.replaceState({}, '', window.location.pathname)
            refreshStatus()
        }

        if (mpError) {
            const errorMessages: Record<string, string> = {
                missing_params: 'Faltan parámetros en el callback de autorización.',
                token_exchange_failed: 'Error al intercambiar el código con Mercado Pago.',
                network_error: 'Error de red al contactar Mercado Pago.',
                db_save_failed: 'Error al guardar la conexión en la base de datos.',
                unauthorized_condominium: 'No tienes permiso sobre ese condominio.',
                no_access_token: 'Mercado Pago no devolvió un token de acceso.',
            }
            toast.error(errorMessages[mpError] ?? `Error de conexión: ${mpError}`)
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [])

    const refreshStatus = async () => {
        setRefreshing(true)
        try {
            const res = await fetch('/api/mercadopago/oauth/status')
            if (res.ok) {
                const data = await res.json()
                if (data.condominiums) {
                    setCondominiums(data.condominiums)
                }
            }
        } catch (err) {
            console.error('Error refrescando estado MP:', err)
        }
        setRefreshing(false)
    }

    const handleDisconnect = async () => {
        if (!disconnectTarget) return
        setIsDisconnecting(true)
        try {
            const res = await fetch('/api/mercadopago/oauth/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ condominium_id: disconnectTarget.id }),
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(`Mercado Pago desconectado de ${disconnectTarget.name}`)
                setCondominiums((prev) =>
                    prev.map((c) =>
                        c.condominiumId === disconnectTarget.id
                            ? { ...c, connected: false, mpUserId: null, expiresAt: null, lastUpdated: null }
                            : c
                    )
                )
            } else {
                toast.error(data.error ?? 'Error al desconectar')
            }
        } catch {
            toast.error('Error de red al desconectar')
        }
        setIsDisconnecting(false)
        setDisconnectTarget(null)
    }

    return (
        <div className="mx-auto max-w-6xl space-y-10 p-8">
            {/* ── Header ── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Zap className="h-8 w-8 text-indigo-400" />
                        Integraciones
                    </h1>
                    <p className="text-zinc-400 text-lg mt-1">
                        Conecta cada condominio con su propia cuenta de Mercado Pago Business.
                    </p>
                </div>

                <button
                    onClick={refreshStatus}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm font-bold transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Actualizar estado
                </button>
            </motion.div>

            {/* ── Aviso de configuración pendiente ── */}
            {!process.env.NEXT_PUBLIC_MP_CLIENT_ID ||
             process.env.NEXT_PUBLIC_MP_CLIENT_ID === 'TU_MP_CLIENT_ID_AQUI' ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30"
                >
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-amber-300 font-bold text-sm">
                            Falta configurar <code className="bg-amber-500/20 px-1 rounded">NEXT_PUBLIC_MP_CLIENT_ID</code>
                        </p>
                        <p className="text-amber-400/70 text-xs mt-1">
                            Obtén tu Client ID en{' '}
                            <a
                                href="https://www.mercadopago.com.mx/developers/panel/app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-amber-300"
                            >
                                developers.mercadopago.com
                            </a>{' '}
                            y agrégalo a <code className="bg-amber-500/20 px-1 rounded">.env.local</code>.
                        </p>
                    </div>
                </motion.div>
            ) : null}

            {/* ── Tarjetas de condominios ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <AnimatePresence mode="popLayout">
                    {condominiums.map((condo) => (
                        <CondominiumCard
                            key={condo.condominiumId}
                            condo={condo}
                            onDisconnect={(id, name) => setDisconnectTarget({ id, name })}
                        />
                    ))}
                </AnimatePresence>

                {condominiums.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <Building2 className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-500 font-bold">No se encontraron condominios.</p>
                    </div>
                )}
            </div>

            {/* ── Sección de características (activa solo si hay 1 conectado) ── */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-500 ${
                anyConnected ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'
            }`}>
                {[
                    { title: 'Cobro automático de cuotas', desc: 'Automatiza el cobro mensual.' },
                    { title: 'Pagos en línea para residentes', desc: 'Tus residentes pagan desde la App.' },
                    { title: 'Registro automático de pagos', desc: 'Reconciliación bancaria al instante.' },
                    { title: 'Reportes financieros en tiempo real', desc: 'Todo en orden para tu contabilidad.' },
                ].map((feature, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -4, scale: 1.02 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
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

            {/* ── Seguridad ── */}
            <Card className="bg-zinc-950/40 border-zinc-800/50 backdrop-blur-md overflow-hidden group w-full shadow-2xl border-l-4 border-l-indigo-500">
                <div className="p-10 flex items-start gap-8 text-left">
                    <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-all duration-300 group-hover:scale-110 shadow-lg">
                        <ShieldCheck className="h-10 w-10 text-indigo-400" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-white font-bold text-2xl mb-2">Seguridad Bancaria Avanzada</h3>
                        <p className="text-zinc-400 text-lg leading-relaxed">
                            Tus credenciales están protegidas mediante el protocolo{' '}
                            <span className="text-white font-semibold underline decoration-indigo-500/40 underline-offset-4">
                                OAuth oficial de Mercado Pago
                            </span>
                            .{' '}
                            InmobiGo nunca almacena, procesa ni tiene acceso a tus contraseñas bancarias.
                            El dinero de los residentes va directo a tu cuenta de MP.
                        </p>
                        <div className="flex items-center gap-2 pt-2">
                            <Shield className="h-4 w-4 text-emerald-400 fill-emerald-500/10" />
                            <p className="text-emerald-400/80 text-sm font-black tracking-wider uppercase">
                                InmobiGo no administra ni retiene fondos
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* ── Beneficios ── */}
            <Card className="bg-zinc-950/40 border-zinc-800/50 backdrop-blur-md overflow-hidden w-full shadow-2xl">
                <div className="p-12 text-left">
                    <h3 className="text-3xl font-bold text-white mb-12 flex items-center gap-5">
                        <span className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xl font-bold shadow-inner">?</span>
                        ¿Qué pasa al conectar tu cuenta?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {[
                            { icon: Smartphone, title: 'Pagos desde la App', desc: 'Los residentes podrán pagar todas sus cuotas cómodamente desde su celular', color: 'blue' },
                            { icon: Landmark, title: 'Depósitos Directos', desc: 'Tus fondos llegarán íntegros y directamente a tu cuenta bancaria vinculada', color: 'emerald' },
                            { icon: Zap, title: 'Conciliación Automática', desc: 'Cada pago se registra al instante en tu contabilidad sin intervención manual', color: 'amber' },
                            { icon: BellRing, title: 'Recordatorios Inteligentes', desc: 'El sistema envía notificaciones de cobro automáticas a los residentes', color: 'rose' },
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

            {/* ── Modal de desconexión ── */}
            <Modal isOpen={!!disconnectTarget} onClose={() => setDisconnectTarget(null)}>
                <div className="flex flex-col items-center text-center p-6 space-y-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-lg shadow-rose-500/5">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">
                            ¿Desconectar Mercado Pago?
                        </h3>
                        <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
                            Al desconectar <strong className="text-zinc-200">{disconnectTarget?.name}</strong>,
                            los residentes <strong className="text-zinc-200">ya no podrán pagar</strong> en línea
                            desde la app. Podrás volver a conectar en cualquier momento.
                        </p>
                    </div>
                    <div className="flex w-full flex-col sm:flex-row gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setDisconnectTarget(null)}
                            disabled={isDisconnecting}
                            className="w-full border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 h-12 rounded-xl transition-all"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDisconnect}
                            disabled={isDisconnecting}
                            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold h-12 rounded-xl shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
                        >
                            {isDisconnecting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Desconectando...</>
                            ) : (
                                'Desconectar cuenta'
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
