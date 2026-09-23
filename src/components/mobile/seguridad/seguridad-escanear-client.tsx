'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/utils/supabase/client'
import {
    ScanLine,
    ShieldCheck,
    ShieldAlert,
    Loader2,
    RefreshCcw,
    Clock,
    MapPin,
    Calendar,
} from 'lucide-react'

type PassResult = {
    id: string
    visitor_name: string
    unit_name: string
    organization_name?: string
    visit_date: string
    start_time: string
    end_time: string
    status: string
    used_at?: string | null
    notes?: string | null
}

type ScanState = 'idle' | 'scanning' | 'looking-up' | 'found' | 'not-found' | 'authorizing' | 'authorized' | 'error'

export default function MobileSeguridadEscanearClient() {
    const [state, setState] = useState<ScanState>('idle')
    const [pass, setPass] = useState<PassResult | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const scannerRef = useRef<Html5Qrcode | null>(null)
    const containerId = 'seguridad-qr-reader'
    const isTransitioning = useRef(false)

    const stopScanner = async () => {
        if (!scannerRef.current || isTransitioning.current) return
        if (!scannerRef.current.isScanning) {
            scannerRef.current = null
            return
        }
        isTransitioning.current = true
        try {
            await scannerRef.current.stop()
            scannerRef.current = null
            const container = document.getElementById(containerId)
            if (container) container.innerHTML = ''
        } catch {
            // ignorar errores de transición esperados
        } finally {
            isTransitioning.current = false
        }
    }

    const extractToken = (decodedText: string) => {
        const trimmed = decodedText.trim()
        const parts = trimmed.split('/')
        return parts[parts.length - 1] || trimmed
    }

    const lookupPass = async (token: string) => {
        setState('looking-up')
        const supabase = createClient()
        const { data, error } = await supabase
            .from('visitor_passes')
            .select('id, visitor_name, unit_name, organization_name, visit_date, start_time, end_time, status, used_at, notes')
            .eq('qr_token', token)
            .maybeSingle()

        if (error || !data) {
            setPass(null)
            setState('not-found')
            return
        }

        setPass(data as PassResult)
        setState('found')
    }

    const handleScanSuccess = async (decodedText: string) => {
        await stopScanner()
        const token = extractToken(decodedText)
        await lookupPass(token)
    }

    const startScanner = async () => {
        if (isTransitioning.current) return
        isTransitioning.current = true
        setErrorMsg(null)
        setPass(null)
        setState('scanning')

        try {
            await new Promise((resolve) => setTimeout(resolve, 250))
            const container = document.getElementById(containerId)
            if (!container) throw new Error('Contenedor no encontrado')

            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode(containerId)
            }

            await scannerRef.current.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                (decodedText) => handleScanSuccess(decodedText),
                () => {}
            )
        } catch (err: any) {
            setErrorMsg('No se pudo acceder a la cámara. Verifica los permisos.')
            setState('error')
        } finally {
            isTransitioning.current = false
        }
    }

    useEffect(() => {
        startScanner()
        return () => {
            stopScanner()
        }
    }, [])

    const handleAutorizar = async () => {
        if (!pass) return
        setState('authorizing')
        try {
            const supabase = createClient()

            const { data: latest, error: fetchErr } = await supabase
                .from('visitor_passes')
                .select('status')
                .eq('id', pass.id)
                .single()

            if (fetchErr) throw fetchErr

            if (latest.status !== 'pending') {
                toast.error('El estado del pase ya cambió (puede que otro guardia ya lo haya registrado).')
                setPass({ ...pass, status: latest.status })
                setState('found')
                return
            }

            const { error: updateErr } = await supabase
                .from('visitor_passes')
                .update({ status: 'used', used_at: new Date().toISOString() })
                .eq('id', pass.id)

            if (updateErr) throw updateErr

            toast.success(`Entrada autorizada para ${pass.visitor_name}`)
            setPass({ ...pass, status: 'used', used_at: new Date().toISOString() })
            setState('authorized')
        } catch {
            toast.error('No se pudo autorizar el pase.')
            setState('found')
        }
    }

    const reset = () => {
        setPass(null)
        setErrorMsg(null)
        startScanner()
    }

    return (
        <div className="mx-auto flex max-w-[480px] flex-col gap-6 px-5 pb-8 pt-6">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d1fae5]">
                    <ScanLine size={18} className="text-[#059669]" />
                </span>
                <h1 className="text-[20px] font-semibold text-[#191C1D]">Escanear pase</h1>
            </div>

            <div className="relative aspect-square w-full overflow-hidden rounded-[24px] border border-[#c3d7c6] bg-[#0f172a]">
                <div id={containerId} className={state === 'scanning' ? 'h-full w-full' : 'hidden'} />

                {state === 'idle' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
                    </div>
                )}

                {state === 'scanning' && (
                    <div className="pointer-events-none absolute inset-10 rounded-3xl border-2 border-dashed border-white/30" />
                )}

                {state === 'looking-up' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0f172a]">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                        <p className="text-[13px] text-white/70">Buscando pase...</p>
                    </div>
                )}

                {state === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0f172a] p-6 text-center">
                        <ShieldAlert className="h-10 w-10 text-[#f87171]" />
                        <p className="text-[13px] text-white/70">{errorMsg}</p>
                    </div>
                )}

                {state === 'not-found' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0f172a] p-6 text-center">
                        <ShieldAlert className="h-14 w-14 text-[#f87171]" />
                        <p className="text-[16px] font-semibold text-white">Pase no encontrado</p>
                        <p className="text-[13px] text-white/60">Este código QR no corresponde a ningún pase de visita.</p>
                    </div>
                )}

                {(state === 'found' || state === 'authorizing' || state === 'authorized') && pass && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0f172a] p-6 text-center">
                        {pass.status === 'used' ? (
                            <ShieldCheck className="h-14 w-14 text-[#34d399]" />
                        ) : (
                            <ShieldAlert className="h-14 w-14 text-[#fbbf24]" />
                        )}
                        <p className="text-[18px] font-semibold text-white">{pass.visitor_name}</p>
                        <p className="text-[13px] text-white/60">Unidad {pass.unit_name}</p>
                        <span
                            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.5px] ${
                                pass.status === 'used'
                                    ? 'bg-[#d1fae5] text-[#059669]'
                                    : pass.status === 'cancelled' || pass.status === 'expired'
                                    ? 'bg-[#fee2e2] text-[#dc2626]'
                                    : 'bg-[#fef3c7] text-[#b45309]'
                            }`}
                        >
                            {pass.status === 'used'
                                ? 'Ya registrado'
                                : pass.status === 'cancelled'
                                ? 'Cancelado'
                                : pass.status === 'expired'
                                ? 'Expirado'
                                : 'Pendiente'}
                        </span>
                    </div>
                )}
            </div>

            {(state === 'found' || state === 'authorizing' || state === 'authorized') && pass && (
                <div className="flex flex-col gap-3 rounded-[20px] border border-[#c3d7c6] bg-white p-[17px]">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-[#434655]" />
                        <span className="text-[13px] text-[#191C1D]">
                            {format(new Date(pass.visit_date), "d MMM, yyyy", { locale: es })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-[#434655]" />
                        <span className="text-[13px] text-[#191C1D]">
                            {pass.start_time?.slice(0, 5)} - {pass.end_time?.slice(0, 5)}
                        </span>
                    </div>
                    {pass.organization_name && (
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-[#434655]" />
                            <span className="text-[13px] text-[#191C1D]">{pass.organization_name}</span>
                        </div>
                    )}
                    {pass.notes && <p className="text-[12px] italic text-[#434655]">"{pass.notes}"</p>}
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={reset}
                    className="flex h-14 items-center justify-center gap-2 rounded-xl border border-[#c3d7c6] bg-white text-[14px] font-semibold text-[#191C1D]"
                >
                    <RefreshCcw size={16} />
                    {state === 'idle' || state === 'scanning' ? 'Reintentar' : 'Escanear otro'}
                </button>

                {state === 'found' && pass?.status === 'pending' ? (
                    <button
                        onClick={handleAutorizar}
                        className="flex h-14 items-center justify-center gap-2 rounded-xl bg-[#059669] text-[14px] font-semibold text-white"
                    >
                        <ShieldCheck size={16} />
                        Autorizar entrada
                    </button>
                ) : (
                    <button
                        disabled={state === 'authorizing'}
                        className="flex h-14 items-center justify-center gap-2 rounded-xl bg-[#e7e8e9] text-[14px] font-semibold text-[#9ca3af]"
                    >
                        {state === 'authorizing' ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                        Autorizar entrada
                    </button>
                )}
            </div>
        </div>
    )
}
