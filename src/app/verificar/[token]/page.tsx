import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    CheckCircle2,
    XCircle,
    Clock,
    ShieldCheck,
    ShieldAlert,
    Building2,
    Users,
    BadgeCheck,
    UserCircle2,
    CalendarDays,
    Wallet,
    Home,
    ExternalLink,
    Hash,
    FileText,
} from 'lucide-react'
import { getVerifiedReceipt } from '@/services/receipt-verification-service'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Verificación de recibo | InmobiGo',
    description: 'Verificación de autenticidad de un recibo de pago',
}

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// El servidor corre en UTC: la hora se muestra en la zona de México, igual que en el PDF
const formatDateTime = (iso: string | null) => {
    if (!iso) return null
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
    const tz = { timeZone: 'America/Mexico_City' } as const
    const day = date.toLocaleDateString('es-MX', { ...tz, day: 'numeric', month: 'long', year: 'numeric' })
    const time = date.toLocaleTimeString('es-MX', { ...tz, hour: '2-digit', minute: '2-digit', hour12: false })
    return `${day}, ${time} h`
}

const formatDate = (iso: string | null) => {
    if (!iso) return null
    try {
        return format(parseISO(iso), "d 'de' MMMM yyyy", { locale: es })
    } catch {
        return iso
    }
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
    if (!value) return null
    return (
        <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-800/80 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-zinc-300" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">{label}</p>
                <p className="text-sm text-zinc-100 break-words">{value}</p>
            </div>
        </div>
    )
}

export default async function VerificarReciboPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const receipt = await getVerifiedReceipt(token)

    if (!receipt) {
        return (
            <div className="min-h-screen bg-black text-white font-sans px-4 py-12 flex items-center justify-center">
                <main className="w-full max-w-md rounded-[2rem] border border-red-500/30 bg-zinc-900/70 p-8 text-center">
                    <div className="mx-auto h-20 w-20 rounded-full bg-red-500/15 ring-4 ring-red-500/20 flex items-center justify-center mb-5">
                        <XCircle className="h-10 w-10 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-black">Recibo no encontrado</h1>
                    <p className="text-sm text-zinc-400 mt-2">
                        Este código no corresponde a ningún recibo emitido por InmobiGo. Si alguien te entregó este recibo, podría no ser auténtico.
                    </p>
                    <Link href="/verificar" className="inline-block mt-6 text-sm font-semibold text-indigo-300 hover:text-indigo-200">Verificar otro código →</Link>
                </main>
            </div>
        )
    }

    const tampered = receipt.sealOk === false
    const state = tampered ? 'alterado' : receipt.status
    const STATE = {
        valido: { title: 'Recibo válido', subtitle: 'Recibido y validado por la administración del condominio.', icon: CheckCircle2, ring: 'ring-emerald-500/25', bg: 'bg-emerald-500/15', color: 'text-emerald-400', border: 'border-emerald-500/30' },
        firma_pendiente: { title: 'Recibo válido · firma pendiente', subtitle: 'El pago fue recibido. La firma del administrador se estampará en cuanto la registre.', icon: Clock, ring: 'ring-amber-500/25', bg: 'bg-amber-500/15', color: 'text-amber-400', border: 'border-amber-500/30' },
        cancelado: { title: 'Recibo cancelado', subtitle: 'La administración canceló este recibo. Ya no ampara el pago.', icon: XCircle, ring: 'ring-red-500/25', bg: 'bg-red-500/15', color: 'text-red-400', border: 'border-red-500/30' },
        alterado: { title: 'Datos alterados', subtitle: 'El sello digital no coincide: la información de este recibo fue modificada después de emitirse. Comunícate con la administración.', icon: ShieldAlert, ring: 'ring-red-500/25', bg: 'bg-red-500/15', color: 'text-red-400', border: 'border-red-500/30' },
    }[state]
    const StateIcon = STATE.icon
    const isEmpresa = receipt.adminType === 'empresa'

    return (
        <div className="min-h-screen bg-black text-white font-sans px-4 py-8 md:py-12 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none" />
            <main className="relative z-10 max-w-lg mx-auto space-y-5">
                {/* Estado */}
                <section className={`rounded-[2rem] border ${STATE.border} bg-zinc-900/70 backdrop-blur-2xl p-7 text-center shadow-2xl`}>
                    <div className={`mx-auto h-20 w-20 rounded-full ${STATE.bg} ring-4 ${STATE.ring} flex items-center justify-center mb-4`}>
                        <StateIcon className={`h-10 w-10 ${STATE.color}`} />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">{STATE.title}</h1>
                    <p className="text-sm text-zinc-400 mt-2">{STATE.subtitle}</p>
                    {state === 'cancelado' && (receipt.cancelReason || receipt.canceledAt) && (
                        <p className="text-xs text-red-300/80 mt-3">
                            {receipt.canceledAt ? `Cancelado el ${formatDateTime(receipt.canceledAt)}` : ''}{receipt.cancelReason ? ` · Motivo: ${receipt.cancelReason}` : ''}
                        </p>
                    )}
                    {state === 'cancelado' && receipt.replacedBy && (
                        <Link href={`/verificar/${receipt.replacedBy.token}`} className="inline-block mt-4 text-sm font-semibold text-indigo-300 hover:text-indigo-200">
                            Fue reemplazado por el recibo {receipt.replacedBy.shortCode} →
                        </Link>
                    )}
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-zinc-950/70 border border-zinc-800 px-4 py-1.5">
                        <Hash className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="font-mono text-sm tracking-widest">{receipt.shortCode}</span>
                    </div>
                </section>

                {/* Pago */}
                <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                    <div className="flex items-baseline justify-between gap-3">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Pago</h2>
                        <p className="text-2xl font-black">{money(receipt.total)}</p>
                    </div>
                    {receipt.items.length > 1 && (
                        <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/60 divide-y divide-zinc-800/60">
                            {receipt.items.map((item, i) => (
                                <div key={i} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                                    <span className="text-zinc-300">{item.concept || 'Pago'}</span>
                                    <span className="font-semibold">{money(item.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <Row icon={Hash} label="Folio" value={receipt.folio} />
                    {receipt.items.length === 1 && <Row icon={Wallet} label="Concepto" value={receipt.items[0].concept} />}
                    <Row icon={Wallet} label="Forma de pago" value={receipt.paymentMethod} />
                    <Row icon={CalendarDays} label="Fecha de pago" value={formatDateTime(receipt.paidAt)} />
                    <Row icon={UserCircle2} label="Residente" value={receipt.residentName} />
                    <Row icon={Home} label="Unidad" value={[receipt.condominiumName, receipt.unitNumber].filter(Boolean).join(' · ') || null} />
                </section>

                {/* Validación */}
                <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Recibido y validado por</h2>
                    <Row icon={UserCircle2} label={receipt.signerPosition || 'Firmante'} value={receipt.signerName} />
                    <Row
                        icon={isEmpresa ? Building2 : Users}
                        label={isEmpresa ? 'Empresa administradora' : receipt.adminType === 'comite' ? 'Comité de administración' : 'Administración'}
                        value={receipt.adminDisplayName}
                    />
                    <Row icon={FileText} label="Razón social" value={receipt.adminLegalName} />
                    <Row
                        icon={BadgeCheck}
                        label="Matrícula SEDETUS"
                        value={receipt.sedetusNumber
                            ? `${receipt.sedetusNumber}${receipt.sedetusExpiry ? ` · vigente hasta ${formatDate(receipt.sedetusExpiry)}` : ''}`
                            : 'Sin registrar al momento de emitir el recibo'}
                    />
                    <Row
                        icon={CalendarDays}
                        label="Validado"
                        value={`${formatDateTime(receipt.issuedAt)}${receipt.validationMode === 'automatico' ? ' · pago en línea confirmado' : receipt.validationMode === 'historico' ? ' · recibo emitido para un pago anterior' : ''}`}
                    />
                    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${tampered ? 'border-red-500/30 bg-red-500/10' : receipt.sealOk ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-950/50'}`}>
                        {tampered ? <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" /> : <ShieldCheck className={`h-5 w-5 shrink-0 ${receipt.sealOk ? 'text-emerald-400' : 'text-zinc-500'}`} />}
                        <p className="text-xs text-zinc-300">
                            {tampered
                                ? 'Sello digital NO coincide: los datos fueron alterados.'
                                : receipt.sealOk
                                    ? 'Sello digital íntegro: los datos no han sido modificados desde que se emitió.'
                                    : 'Este recibo no tiene sello digital verificable.'}
                        </p>
                    </div>
                    {receipt.adminCardPath && (
                        <Link href={receipt.adminCardPath} className="flex items-center justify-center gap-2 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 text-sm font-semibold transition-colors">
                            <ExternalLink className="h-4 w-4" /> Ver ficha del administrador
                        </Link>
                    )}
                </section>

                <p className="text-center text-[11px] text-zinc-600 pt-1">
                    Compara estos datos con tu recibo impreso. Si no coinciden, el documento pudo haber sido alterado.<br />
                    Verificación provista por <span className="font-bold text-zinc-400">InmobiGo</span>
                </p>
            </main>
        </div>
    )
}
