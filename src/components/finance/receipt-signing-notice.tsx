'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, PenLine, ShieldAlert, BadgeCheck } from 'lucide-react'
import { getMySigningStatusAction } from '@/app/actions/signature-actions'
import { SEDETUS_STATUS_LABEL, type SedetusStatus } from '@/types/admin-identity'

type SigningStatus = { canSignRole: boolean; hasSignature: boolean; sedetusStatus: SedetusStatus }

/**
 * Avisos en las pantallas donde se registran o validan pagos: cada recibo lleva
 * la firma de quien lo valida (obligatoria), seguridad no puede validar, y la
 * matrícula SEDETUS vencida o sin registrar se avisa (por ahora no bloquea).
 */
export function ReceiptSigningNotice({ profileHref = '/dashboard/perfil' }: { profileHref?: string }) {
    const [status, setStatus] = useState<SigningStatus | null>(null)

    useEffect(() => {
        getMySigningStatusAction().then(setStatus).catch(() => setStatus(null))
    }, [])

    if (!status) return null

    const notices: React.ReactNode[] = []

    if (!status.canSignRole) {
        notices.push(
            <div key="role" className="flex items-start gap-3 rounded-2xl border border-zinc-700 bg-zinc-900/70 px-4 py-3">
                <ShieldAlert className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-300">
                    Los pagos solo los registra y valida la administración, porque cada recibo lleva su firma. Desde seguridad puedes consultarlos, pero no aprobarlos ni registrarlos.
                </p>
            </div>
        )
    } else if (!status.hasSignature) {
        notices.push(
            <div key="signature" className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                <PenLine className="h-5 w-5 text-amber-400 shrink-0" />
                <p className="text-sm text-amber-100 flex-1">
                    <span className="font-semibold">Sube tu firma para registrar o validar pagos.</span> Cada recibo lleva la firma de quien lo valida.
                </p>
                <Link href={profileHref} className="text-xs font-bold uppercase tracking-widest text-amber-300 hover:text-amber-200 whitespace-nowrap">
                    Ir a Mi Perfil →
                </Link>
            </div>
        )
    }

    if (status.canSignRole && ['vencida', 'sin_registro', 'por_vencer'].includes(status.sedetusStatus)) {
        const expired = status.sedetusStatus !== 'por_vencer'
        notices.push(
            <div key="sedetus" className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border px-4 py-3 ${expired ? 'border-red-500/30 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/5'}`}>
                {expired ? <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" /> : <BadgeCheck className="h-5 w-5 text-amber-400 shrink-0" />}
                <p className={`text-sm flex-1 ${expired ? 'text-red-100' : 'text-amber-100'}`}>
                    <span className="font-semibold">Matrícula SEDETUS: {SEDETUS_STATUS_LABEL[status.sedetusStatus]}.</span>{' '}
                    {status.sedetusStatus === 'sin_registro'
                        ? 'Registra la matrícula del administrador en la Ficha del Administrador: aparece en cada recibo.'
                        : status.sedetusStatus === 'vencida'
                            ? 'Los recibos se siguen emitiendo, pero muestran la matrícula vencida. Renuévala y actualízala en la Ficha del Administrador.'
                            : 'Vence en menos de 30 días. Renuévala para que los recibos la muestren vigente.'}
                </p>
                <Link href={profileHref} className={`text-xs font-bold uppercase tracking-widest whitespace-nowrap ${expired ? 'text-red-300 hover:text-red-200' : 'text-amber-300 hover:text-amber-200'}`}>
                    Actualizar →
                </Link>
            </div>
        )
    }

    if (notices.length === 0) return null
    return <div className="space-y-3">{notices}</div>
}
