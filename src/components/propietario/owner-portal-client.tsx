'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, CreditCard, FileDown, KeyRound, Loader2, Briefcase, UserRound, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { generateReceiptForResident } from '@/components/residente/resident-payments-client'
import { createOwnerPaymentCheckoutAction, ownerRemoveManagerAction, ownerSetManagerAction } from '@/app/actions/owner-portal-actions'
import { OCCUPANCY_LABEL, PAYMENT_RESPONSIBLE_LABEL, type OccupancyType, type PaymentResponsible } from '@/types/unit-ownership'

export interface PortalInvoice {
    id: string
    folio: string | null
    description: string | null
    amount: number
    balance_due: number
    status: string
    due_date: string | null
    paid_at: string | null
    payment_method: string | null
    invoice_type: string | null
}

export interface PortalPayment {
    id: string
    folio: string | null
    amount: number
    payment_method: string | null
    paid_at: string | null
    concept: string
}

export interface PortalUnitView {
    unit_id: string
    unit_number: string
    condominium_name: string
    role: 'propietario' | 'copropietario' | 'gestor'
    can_pay: boolean
    occupancy_type: string
    payment_responsible: string
    monto_mensual: number
    owner_name: string | null
    manager: { name: string; phone: string | null; email: string | null; can_pay: boolean; has_access: boolean } | null
    mp_connected: boolean
    owner_record_id: string | null
    owner_invoices: PortalInvoice[]
    owner_payments: PortalPayment[]
    occupants: { id: string; name: string; invoices: PortalInvoice[] }[]
}

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (iso: string | null) => iso
    ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' })
    : '—'
const todayMx = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
const isPending = (i: PortalInvoice) => (i.status === 'pending' || i.status === 'overdue') && i.balance_due > 0
const isOverdue = (i: PortalInvoice) => i.status === 'overdue' || (i.status === 'pending' && !!i.due_date && i.due_date < todayMx())
const sum = (list: PortalInvoice[]) => list.reduce((acc, i) => acc + i.balance_due, 0)

const ROLE_LABEL = { propietario: 'Propietario', copropietario: 'Copropietario', gestor: 'Gestor' } as const

export function OwnerPortalClient({ units }: { units: PortalUnitView[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [managerTarget, setManagerTarget] = useState<PortalUnitView | null>(null)

    useEffect(() => {
        const status = searchParams.get('mp_status')
        if (!status) return
        if (status === 'success') toast.success('Pago recibido. En unos momentos se reflejará en tu estado de cuenta.')
        else if (status === 'pending') toast.info('Tu pago quedó pendiente de confirmación.')
        else toast.error('El pago no se completó.')
        router.replace('/propietario')
    }, [searchParams, router])

    const totals = useMemo(() => {
        const ownerDebt = units.reduce((acc, u) => acc + sum(u.owner_invoices.filter(isPending)), 0)
        const tenantsWithDebt = units.reduce((acc, u) => acc + u.occupants.filter((o) => o.invoices.some(isOverdue)).length, 0)
        return { ownerDebt, tenantsWithDebt }
    }, [units])

    if (units.length === 0) {
        return (
            <div className="mx-auto max-w-3xl p-6">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-10 text-center">
                    <Building2 className="mx-auto h-10 w-10 text-zinc-600" />
                    <p className="mt-4 text-white font-semibold">Aún no tienes unidades asignadas</p>
                    <p className="mt-1 text-sm text-zinc-400">Pide a la administración de tu condominio que te registre como propietario o gestor de tu unidad.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Mis unidades</h1>
                <p className="text-sm text-zinc-400">Estado de cuenta de tus unidades, tus inquilinos y la cuota de mantenimiento.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <SummaryCard icon={Building2} label="Unidades" value={String(units.length)} tone="indigo" />
                <SummaryCard icon={Wallet} label="Cuota por pagar" value={money(totals.ownerDebt)} tone={totals.ownerDebt > 0 ? 'amber' : 'emerald'} />
                <SummaryCard icon={AlertTriangle} label="Inquilinos con adeudo vencido" value={String(totals.tenantsWithDebt)} tone={totals.tenantsWithDebt > 0 ? 'red' : 'emerald'} />
            </div>

            <div className="space-y-5">
                {units.map((u) => <UnitCard key={u.unit_id} unit={u} onManager={() => setManagerTarget(u)} onChanged={() => router.refresh()} />)}
            </div>

            <ManagerModal unit={managerTarget} onClose={() => setManagerTarget(null)} onSaved={() => router.refresh()} />
        </div>
    )
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: 'indigo' | 'amber' | 'emerald' | 'red' }) {
    const tones = {
        indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        red: 'text-red-400 bg-red-500/10 border-red-500/20',
    }
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-center gap-3">
            <div className={`p-3 rounded-xl border ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
            <div>
                <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">{label}</p>
                <p className="text-xl font-black text-white leading-none mt-1">{value}</p>
            </div>
        </div>
    )
}

function UnitCard({ unit, onManager, onChanged }: { unit: PortalUnitView; onManager: () => void; onChanged: () => void }) {
    const [paying, setPaying] = useState<string | null>(null)
    const [removing, setRemoving] = useState(false)
    const pending = unit.owner_invoices.filter(isPending).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
    const debt = sum(pending)
    const billedToOwner = unit.occupancy_type !== 'propietario' && unit.payment_responsible !== 'inquilino'
    const isOwner = unit.role !== 'gestor'
    const occupantLabel = unit.occupancy_type === 'vacacional' ? 'Huésped' : unit.occupancy_type === 'inquilino' ? 'Inquilino' : 'Residente'

    const pay = async (key: string, amount?: number, concept?: string) => {
        if (!unit.owner_record_id) return
        setPaying(key)
        try {
            const result = await createOwnerPaymentCheckoutAction(unit.owner_record_id, { amount, concept })
            if (!result.success) throw new Error(result.error)
            window.location.href = result.checkoutUrl
        } catch (error: any) {
            toast.error(error.message || 'No se pudo iniciar el pago')
            setPaying(null)
        }
    }

    const removeManager = async () => {
        if (!confirm(`¿Quitar a ${unit.manager?.name} como gestor de la unidad ${unit.unit_number}?`)) return
        setRemoving(true)
        const result = await ownerRemoveManagerAction(unit.unit_id)
        setRemoving(false)
        if (!result.success) return toast.error(result.error)
        toast.success('Gestor removido')
        onChanged()
    }

    const receipt = (p: PortalPayment) => generateReceiptForResident(
        { folio: p.folio, paymentId: p.id, concept: p.concept, amount: p.amount, payment_method: p.payment_method, date: fmtDate(p.paid_at) },
        unit.owner_name || 'Propietario',
        unit.condominium_name,
        unit.unit_number,
    )

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
                <div>
                    <p className="text-xs text-zinc-500">{unit.condominium_name}</p>
                    <p className="text-lg font-bold text-white">Unidad {unit.unit_number}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/10 border-indigo-500/20">{ROLE_LABEL[unit.role]}</span>
                    <span className="px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider text-zinc-300 bg-zinc-800 border-zinc-700">
                        {OCCUPANCY_LABEL[unit.occupancy_type as OccupancyType] || unit.occupancy_type}
                    </span>
                </div>
            </div>

            <div className="grid gap-px bg-zinc-800 lg:grid-cols-2">
                {/* Cuota de mantenimiento */}
                <section className="bg-zinc-900/80 p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white flex items-center gap-2"><CreditCard className="h-4 w-4 text-indigo-400" /> Cuota de mantenimiento</p>
                        <p className="text-xs text-zinc-500">Paga: {PAYMENT_RESPONSIBLE_LABEL[unit.payment_responsible as PaymentResponsible] || unit.payment_responsible}</p>
                    </div>

                    {!billedToOwner && pending.length === 0 ? (
                        <p className="text-sm text-zinc-400">
                            {unit.payment_responsible === 'inquilino'
                                ? 'La cuota la paga tu inquilino. Revisa su estado a la derecha.'
                                : 'La cuota se le factura al residente de la unidad.'}
                        </p>
                    ) : (
                        <>
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Saldo pendiente</p>
                                    <p className={`text-2xl font-black ${debt > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{money(debt)}</p>
                                </div>
                                {debt > 0 && unit.can_pay && unit.mp_connected && (
                                    <Button onClick={() => pay('all')} disabled={!!paying} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                                        {paying === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Pagar todo
                                    </Button>
                                )}
                            </div>
                            {debt > 0 && !unit.can_pay && (
                                <p className="text-xs text-zinc-500">El propietario no te autorizó para pagar en su nombre.</p>
                            )}
                            {debt > 0 && unit.can_pay && !unit.mp_connected && (
                                <p className="text-xs text-zinc-500">El condominio aún no recibe pagos en línea: paga directamente con la administración.</p>
                            )}
                            {pending.length > 0 && (
                                <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
                                    {pending.map((inv) => (
                                        <li key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                                            <div className="min-w-0">
                                                <p className="text-zinc-200 truncate">{inv.description || 'Cargo'}</p>
                                                <p className="text-xs text-zinc-500">
                                                    Vence {fmtDate(inv.due_date)}
                                                    {isOverdue(inv) && <span className="ml-2 font-bold text-red-400">Vencida</span>}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="font-semibold text-white tabular-nums">{money(inv.balance_due)}</span>
                                                {unit.can_pay && unit.mp_connected && (
                                                    <button
                                                        onClick={() => pay(inv.id, inv.balance_due, inv.description || undefined)}
                                                        disabled={!!paying}
                                                        className="h-8 px-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/20 disabled:opacity-50"
                                                    >
                                                        {paying === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Pagar'}
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {unit.owner_payments.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Pagos y recibos</p>
                                    <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
                                        {unit.owner_payments.map((p) => (
                                            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                                <div className="min-w-0">
                                                    <p className="text-zinc-300 truncate">{p.concept}</p>
                                                    <p className="text-xs text-zinc-500">{fmtDate(p.paid_at)}{p.folio ? ` · ${p.folio}` : ''}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="font-semibold text-emerald-400 tabular-nums">{money(p.amount)}</span>
                                                    {p.folio && (
                                                        <button onClick={() => receipt(p)} title="Descargar recibo" className="h-8 w-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300">
                                                            <FileDown size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* Ocupantes y gestor */}
                <section className="bg-zinc-900/80 p-5 space-y-4">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-white flex items-center gap-2"><KeyRound className="h-4 w-4 text-indigo-400" /> {occupantLabel}</p>
                        {unit.occupants.length === 0 ? (
                            <p className="text-sm text-zinc-500">{unit.occupancy_type === 'desocupada' ? 'Unidad desocupada.' : 'Sin residentes registrados.'}</p>
                        ) : unit.occupants.map((o) => {
                            const owed = sum(o.invoices.filter(isPending))
                            const overdue = o.invoices.filter((i) => isPending(i) && isOverdue(i))
                            return (
                                <div key={o.id} className="rounded-xl border border-zinc-800 p-3 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm text-zinc-200 flex items-center gap-2"><UserRound className="h-3.5 w-3.5 text-zinc-500" /> {o.name}</p>
                                        {owed > 0 ? (
                                            <span className={`text-xs font-bold ${overdue.length > 0 ? 'text-red-400' : 'text-amber-400'}`}>
                                                Debe {money(owed)}{overdue.length > 0 ? ` · ${overdue.length} vencido${overdue.length > 1 ? 's' : ''}` : ''}
                                            </span>
                                        ) : (
                                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Al corriente</span>
                                        )}
                                    </div>
                                    {owed > 0 && (
                                        <ul className="space-y-1">
                                            {o.invoices.filter(isPending).map((inv) => (
                                                <li key={inv.id} className="flex justify-between gap-2 text-xs text-zinc-400">
                                                    <span className="truncate">{inv.description || 'Cargo'} · vence {fmtDate(inv.due_date)}</span>
                                                    <span className="tabular-nums text-zinc-300">{money(inv.balance_due)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <div className="space-y-2 border-t border-zinc-800 pt-4">
                        <p className="text-sm font-semibold text-white flex items-center gap-2"><Briefcase className="h-4 w-4 text-indigo-400" /> Gestor</p>
                        {unit.role === 'gestor' ? (
                            <p className="text-sm text-zinc-400">Administras esta unidad para {unit.owner_name || 'el propietario'}.{unit.can_pay ? ' Puedes pagar la cuota en su nombre.' : ''}</p>
                        ) : unit.manager ? (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm text-zinc-200">{unit.manager.name}</p>
                                    <p className="text-xs text-zinc-500">
                                        {unit.manager.can_pay ? 'Puede pagar en tu nombre' : 'Solo consulta'} · {unit.manager.has_access ? 'Con acceso al portal' : 'Sin acceso al portal'}
                                    </p>
                                </div>
                                {isOwner && (
                                    <div className="flex gap-2">
                                        <Button variant="ghost" onClick={onManager} className="h-8 text-xs text-indigo-300">Cambiar</Button>
                                        <Button variant="ghost" onClick={removeManager} disabled={removing} className="h-8 text-xs text-red-400">Quitar</Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm text-zinc-500">Sin gestor. Puedes asignar a quien te administra la propiedad.</p>
                                <Button variant="ghost" onClick={onManager} className="h-8 text-xs text-indigo-300 shrink-0">+ Asignar gestor</Button>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}

function ManagerModal({ unit, onClose, onSaved }: { unit: PortalUnitView | null; onClose: () => void; onSaved: () => void }) {
    if (!unit) return null
    // key: el formulario se reinicia con los datos de cada unidad
    return <ManagerForm key={unit.unit_id} unit={unit} onClose={onClose} onSaved={onSaved} />
}

function ManagerForm({ unit, onClose, onSaved }: { unit: PortalUnitView; onClose: () => void; onSaved: () => void }) {
    const [name, setName] = useState(unit.manager?.name || '')
    const [phone, setPhone] = useState(unit.manager?.phone || '')
    const [email, setEmail] = useState(unit.manager?.email || '')
    const [canPay, setCanPay] = useState(!!unit.manager?.can_pay)
    const [invite, setInvite] = useState(!unit.manager?.has_access)
    const [saving, setSaving] = useState(false)

    const save = async () => {
        setSaving(true)
        const result = await ownerSetManagerAction(unit.unit_id, { full_name: name, phone, email, can_pay: canPay, invite })
        setSaving(false)
        if (!result.success) return toast.error(result.error)
        toast.success(invite ? 'Gestor guardado e invitado al portal' : 'Gestor guardado')
        onSaved()
        onClose()
    }

    const inputClass = 'bg-zinc-950/60 border-zinc-800 focus:border-indigo-500 rounded-xl'
    return (
        <Modal isOpen onClose={() => !saving && onClose()} title={`Gestor · Unidad ${unit.unit_number}`}>
            <div className="space-y-3">
                <p className="text-xs text-zinc-400">Persona que te administra la propiedad: verá el estado de cuenta de la unidad y de tus inquilinos.</p>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" className={inputClass} />
                <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono (WhatsApp)" className={inputClass} />
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" type="email" className={inputClass} />
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="checkbox" checked={canPay} onChange={(e) => setCanPay(e.target.checked)} className="accent-indigo-500" />
                    Puede pagar la cuota en mi nombre
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} className="accent-indigo-500" />
                    Enviarle invitación al portal por correo
                </label>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={onClose} disabled={saving} className="text-zinc-300">Cancelar</Button>
                    <Button onClick={save} disabled={saving || !name.trim()} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
