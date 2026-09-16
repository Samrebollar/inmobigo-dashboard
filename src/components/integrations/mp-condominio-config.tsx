'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Zap, CheckCircle, XCircle, Clock, ExternalLink, RefreshCw,
    LogOut, AlertTriangle, ShieldCheck, Loader2, Share2, Copy, Check, Link
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

interface MpCondominioConfigProps {
    condominiumId: string
    condominiumName?: string
}

function buildOAuthUrl(condominiumId: string): string {
    const clientId = process.env.NEXT_PUBLIC_MP_CLIENT_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
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

export function MpCondominioConfig({ condominiumId, condominiumName }: MpCondominioConfigProps) {
    const [status, setStatus] = useState<CondominiumStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [showDisconnectModal, setShowDisconnectModal] = useState(false)
    const [isDisconnecting, setIsDisconnecting] = useState(false)

    // Estados para enlace de invitación
    const [generatingInvite, setGeneratingInvite] = useState(false)
    const [inviteUrl, setInviteUrl] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)

    useEffect(() => {
        fetchStatus()
        handleUrlParams()
    }, [condominiumId])

    const handleUrlParams = () => {
        if (typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        const mpConnected = params.get('mp_connected')
        const mpError = params.get('mp_error')

        if (mpConnected) {
            toast.success('¡Cuenta de Mercado Pago conectada exitosamente a este condominio!')
            cleanUrlParams()
        }

        if (mpError) {
            const errorMessages: Record<string, string> = {
                missing_params: 'Faltan parámetros en el callback de autorización.',
                token_exchange_failed: 'Error al intercambiar el código con Mercado Pago.',
                network_error: 'Error de red al contactar Mercado Pago.',
                db_save_failed: 'Error al guardar la conexión en la base de datos.',
                unauthorized_condominium: 'No tienes permiso sobre este condominio.',
                no_access_token: 'Mercado Pago no devolvió un token de acceso.',
            }
            toast.error(errorMessages[mpError] ?? `Error de conexión: ${mpError}`)
            cleanUrlParams()
        }
    }

    const cleanUrlParams = () => {
        const url = new URL(window.location.href)
        url.searchParams.delete('mp_connected')
        url.searchParams.delete('mp_error')
        window.history.replaceState({}, '', url.toString())
    }

    const fetchStatus = async () => {
        try {
            setRefreshing(true)
            const res = await fetch('/api/mercadopago/oauth/status')
            if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data.condominiums)) {
                    const match = data.condominiums.find((c: CondominiumStatus) => c.condominiumId === condominiumId)
                    if (match) {
                        setStatus(match)
                    } else {
                        setStatus({
                            condominiumId,
                            condominiumName: condominiumName || 'Condominio',
                            connected: false,
                            mpUserId: null,
                            expiresAt: null,
                            lastUpdated: null,
                        })
                    }
                }
            }
        } catch (err) {
            console.error('Error obteniendo estado de Mercado Pago:', err)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const handleDisconnect = async () => {
        setIsDisconnecting(true)
        try {
            const res = await fetch('/api/mercadopago/oauth/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ condominium_id: condominiumId }),
            })
            const data = await res.json()
            if (res.ok) {
                toast.success('Mercado Pago desconectado exitosamente')
                setStatus((prev) =>
                    prev
                        ? { ...prev, connected: false, mpUserId: null, expiresAt: null, lastUpdated: null }
                        : null
                )
            } else {
                toast.error(data.error ?? 'Error al desconectar Mercado Pago')
            }
        } catch (err) {
            toast.error('Error de red al desconectar Mercado Pago')
        } finally {
            setIsDisconnecting(false)
            setShowDisconnectModal(false)
        }
    }

    const handleGenerateInvite = async () => {
        setGeneratingInvite(true)
        try {
            const res = await fetch('/api/mercadopago/oauth/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ condominium_id: condominiumId }),
            })
            const data = await res.json()
            if (res.ok && data.invite_url) {
                setInviteUrl(data.invite_url)
                setShowInviteModal(true)
                try {
                    await navigator.clipboard.writeText(data.invite_url)
                    setCopied(true)
                    toast.success('¡Enlace de invitación copiado al portapapeles!')
                    setTimeout(() => setCopied(false), 3000)
                } catch {
                    toast.success('Enlace generado correctamente')
                }
            } else {
                toast.error(data.error ?? 'Error al generar enlace de invitación')
            }
        } catch {
            toast.error('Error de red al generar el enlace de invitación')
        } finally {
            setGeneratingInvite(false)
        }
    }

    const handleCopyInvite = async () => {
        if (!inviteUrl) return
        try {
            await navigator.clipboard.writeText(inviteUrl)
            setCopied(true)
            toast.success('¡Enlace copiado al portapapeles!')
            setTimeout(() => setCopied(false), 3000)
        } catch {
            toast.error('No se pudo copiar automáticamente')
        }
    }

    const oauthUrl = buildOAuthUrl(condominiumId)
    const isClientIdMissing =
        !process.env.NEXT_PUBLIC_MP_CLIENT_ID ||
        process.env.NEXT_PUBLIC_MP_CLIENT_ID === 'TU_MP_CLIENT_ID_AQUI'

    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap className="h-5 w-5 text-indigo-400" />
                        Cobros en línea (Mercado Pago)
                    </CardTitle>
                    <CardDescription className="text-zinc-400 mt-1">
                        Conecta la cuenta de Mercado Pago Business de este condominio para que los residentes paguen sus mantenimientos desde la App.
                    </CardDescription>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchStatus}
                    disabled={refreshing}
                    className="text-zinc-400 hover:text-white"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>

            <CardContent className="space-y-5">
                {/* Advertencia Client ID faltante */}
                {isClientIdMissing && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-amber-300">
                            <p className="font-bold">Falta configurar Client ID de Mercado Pago</p>
                            <p className="text-amber-400/80 mt-0.5">
                                Agrega <code className="bg-amber-500/20 px-1 rounded">NEXT_PUBLIC_MP_CLIENT_ID</code> en el archivo <code className="bg-amber-500/20 px-1 rounded">.env.local</code> para habilitar la conexión OAuth.
                            </p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="p-6 text-center text-zinc-500 flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Cargando estado de integración...
                    </div>
                ) : (
                    <motion.div
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.2 }}
                        className="p-5 rounded-2xl bg-zinc-950/50 border border-zinc-800 space-y-4"
                    >
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl border ${
                                    status?.connected
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                                }`}>
                                    <Zap className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Mercado Pago Business</p>
                                    {status?.connected && status.mpUserId && (
                                        <p className="text-zinc-500 text-xs font-mono">ID Mercado Pago: {status.mpUserId}</p>
                                    )}
                                </div>
                            </div>

                            {status?.connected ? (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                    <CheckCircle className="mr-1 h-3.5 w-3.5" /> Conectado
                                </Badge>
                            ) : (
                                <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">
                                    <XCircle className="mr-1 h-3.5 w-3.5" /> Sin conectar
                                </Badge>
                            )}
                        </div>

                        {status?.connected ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> Vencimiento de Token
                                        </p>
                                        <p className="text-white text-xs font-semibold">{formatExpiresAt(status.expiresAt)}</p>
                                    </div>
                                    <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Última actualización</p>
                                        <p className="text-white text-xs font-semibold">{formatLastUpdated(status.lastUpdated)}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/60">
                                    <a
                                        href={oauthUrl}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white text-xs font-bold transition-all border border-zinc-700"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" /> Reconectar
                                    </a>
                                    <button
                                        onClick={handleGenerateInvite}
                                        disabled={generatingInvite}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 text-xs font-bold transition-all border border-indigo-500/20"
                                    >
                                        {generatingInvite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
                                        Enviar enlace a comité
                                    </button>
                                    <button
                                        onClick={() => setShowDisconnectModal(true)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all border border-rose-500/20"
                                    >
                                        <LogOut className="h-3.5 w-3.5" /> Desconectar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 pt-1">
                                <p className="text-zinc-400 text-xs leading-relaxed">
                                    Al conectar la cuenta de Mercado Pago de este condominio, el dinero abonado por los residentes se depositará íntegro y directo en su cuenta bancaria. InmobiGo no cobra comisiones ni retiene fondos.
                                </p>

                                <div className="flex flex-wrap gap-3">
                                    <a
                                        href={oauthUrl}
                                        style={{ backgroundColor: MP_BLUE }}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                    >
                                        <ExternalLink className="h-4 w-4" /> Conectar Mercado Pago
                                    </a>

                                    <Button
                                        variant="outline"
                                        onClick={handleGenerateInvite}
                                        disabled={generatingInvite}
                                        className="gap-2 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl text-sm font-semibold h-[42px]"
                                    >
                                        {generatingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4 text-indigo-400" />}
                                        Enviar enlace a comité (sin sesión)
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/50 text-xs text-zinc-500">
                            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span>Conexión cifrada mediante OAuth oficial de Mercado Pago.</span>
                        </div>
                    </motion.div>
                )}
            </CardContent>

            {/* Modal de Enlace de Invitación */}
            <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)}>
                <div className="flex flex-col items-center text-center p-6 space-y-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-lg">
                        <Link className="h-7 w-7" />
                    </div>

                    <div className="space-y-1.5">
                        <h3 className="text-xl font-bold text-white tracking-tight">
                            Enlace de Invitación Generado
                        </h3>
                        <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
                            Este enlace permite conectar Mercado Pago Business <strong className="text-zinc-200">sin necesidad de iniciar sesión</strong> en InmobiGo. Ideal para compartir con el comité de vigilancia o el dueño de la cuenta bancaria.
                        </p>
                    </div>

                    {inviteUrl && (
                        <div className="w-full bg-zinc-950 p-3 rounded-2xl border border-zinc-800 flex items-center justify-between gap-2">
                            <input
                                type="text"
                                readOnly
                                value={inviteUrl}
                                className="bg-transparent text-xs text-zinc-300 font-mono w-full outline-none truncate"
                            />
                            <Button
                                size="sm"
                                onClick={handleCopyInvite}
                                className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1 rounded-xl h-9"
                            >
                                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                {copied ? 'Copiado' : 'Copiar'}
                            </Button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-amber-400/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 w-full text-left">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>Válido por <strong>48 horas</strong> o hasta su primer uso exitoso.</span>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => setShowInviteModal(false)}
                        className="w-full border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 h-11 rounded-xl mt-2"
                    >
                        Cerrar
                    </Button>
                </div>
            </Modal>

            {/* Modal de Desconexión */}
            <Modal isOpen={showDisconnectModal} onClose={() => setShowDisconnectModal(false)}>
                <div className="flex flex-col items-center text-center p-6 space-y-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-lg shadow-rose-500/5">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">
                            ¿Desconectar Mercado Pago?
                        </h3>
                        <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
                            Al desconectar esta cuenta de Mercado Pago, los residentes de este condominio <strong className="text-zinc-200">ya no podrán pagar</strong> en línea desde la app. Podrás volver a conectar en cualquier momento.
                        </p>
                    </div>
                    <div className="flex w-full flex-col sm:flex-row gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDisconnectModal(false)}
                            disabled={isDisconnecting}
                            className="w-full border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 h-11 rounded-xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDisconnect}
                            disabled={isDisconnecting}
                            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold h-11 rounded-xl shadow-lg shadow-rose-600/20"
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
        </Card>
    )
}
