'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Home, KeyRound, Palmtree, DoorOpen, UserRound, Users, Briefcase, Loader2, Save, Send } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveUnitOwnershipAction } from '@/app/actions/unit-ownership-actions'
import { inviteUnitContactAction } from '@/app/actions/owner-portal-actions'
import {
    OCCUPANCY_LABEL,
    PAYMENT_RESPONSIBLE_LABEL,
    type OccupancyType,
    type PaymentResponsible,
    type UnitContact,
    type UnitContactInput,
    type UnitContactKind,
    type UnitOwnership,
} from '@/types/unit-ownership'

const inputClass = 'bg-zinc-950/60 border-zinc-800 focus:border-indigo-500 rounded-xl'

const OCCUPANCY_OPTIONS: { value: OccupancyType; icon: React.ElementType; hint: string }[] = [
    { value: 'propietario', icon: Home, hint: 'El dueño vive en la unidad' },
    { value: 'inquilino', icon: KeyRound, hint: 'Rentada a largo plazo' },
    { value: 'vacacional', icon: Palmtree, hint: 'Airbnb / renta por noches' },
    { value: 'desocupada', icon: DoorOpen, hint: 'Nadie la habita' },
]

type ContactDraft = { id: string | null; full_name: string; phone: string; email: string }

const toDraft = (c: UnitContact | null): ContactDraft =>
    ({ id: c?.id || null, full_name: c?.full_name || '', phone: c?.phone || '', email: c?.email || '' })

const toInput = (d: ContactDraft): UnitContactInput | null =>
    d.full_name.trim() ? { id: d.id, full_name: d.full_name, phone: d.phone || null, email: d.email || null } : null

function ContactFields({
    title,
    icon: Icon,
    kind,
    draft,
    onChange,
    contacts,
    required,
    hint,
    saved,
}: {
    title: string
    icon: React.ElementType
    kind: UnitContactKind
    draft: ContactDraft
    onChange: (d: ContactDraft) => void
    contacts: UnitContact[]
    required?: boolean
    hint?: string
    /** Contacto ya guardado en esta unidad (para invitarlo al portal) */
    saved?: UnitContact | null
}) {
    const options = contacts.filter((c) => c.kind === kind)
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <Icon className="h-4 w-4 text-indigo-400" /> {title}
                    {required && <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Obligatorio</span>}
                </p>
                {options.length > 0 && (
                    <select
                        value={draft.id || ''}
                        onChange={(e) => {
                            const chosen = options.find((c) => c.id === e.target.value)
                            onChange(chosen ? toDraft(chosen) : { id: null, full_name: '', phone: '', email: '' })
                        }}
                        className="h-8 max-w-[55%] px-2 text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">+ Nuevo</option>
                        {options.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.email || c.phone ? ` · ${c.email || c.phone}` : ''}</option>)}
                    </select>
                )}
            </div>
            {hint && <p className="text-xs text-zinc-500 -mt-1">{hint}</p>}
            <div className="grid gap-2 sm:grid-cols-3">
                <Input value={draft.full_name} onChange={(e) => onChange({ ...draft, full_name: e.target.value })} placeholder="Nombre completo" className={`${inputClass} sm:col-span-3`} />
                <Input value={draft.phone} onChange={(e) => onChange({ ...draft, phone: e.target.value })} placeholder="Teléfono (WhatsApp)" className={inputClass} />
                <Input value={draft.email} onChange={(e) => onChange({ ...draft, email: e.target.value })} placeholder="Correo" type="email" className={`${inputClass} sm:col-span-2`} />
            </div>
            {draft.id && <p className="text-[11px] text-zinc-500">Ya registrado: si cambias sus datos se actualizan en todas sus unidades.</p>}
            {saved && <PortalInvite contact={saved} />}
        </div>
    )
}

/** Invitación al Portal de Propietarios y Gestores de un contacto ya guardado en esta unidad. */
function PortalInvite({ contact }: { contact: UnitContact }) {
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    if (!contact.email) {
        return <p className="text-[11px] text-zinc-500">Captura su correo para darle acceso al portal de propietarios.</p>
    }
    const send = async () => {
        setSending(true)
        const result = await inviteUnitContactAction(contact.id)
        setSending(false)
        if (!result.success) return toast.error(result.error)
        setSent(true)
        toast.success(`Invitación enviada a ${contact.email}`)
    }
    return (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
            <p className="text-[11px] text-zinc-400">
                {contact.has_access || sent ? 'Con acceso al portal de propietarios' : 'Sin acceso al portal de propietarios'}
            </p>
            <button type="button" onClick={send} disabled={sending} className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 flex items-center gap-1 disabled:opacity-50">
                {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                {contact.has_access || sent ? 'Reenviar invitación' : 'Invitar al portal'}
            </button>
        </div>
    )
}

/**
 * Ficha de propietario de una unidad: quién la ocupa, quién paga la cuota y
 * los datos del propietario, copropietario y gestor.
 */
export function UnitOwnershipModal({
    isOpen,
    onClose,
    onSaved,
    ownership,
    contacts,
}: {
    isOpen: boolean
    onClose: () => void
    onSaved: () => void
    ownership: UnitOwnership | null
    contacts: UnitContact[]
}) {
    const [occupancy, setOccupancy] = useState<OccupancyType>('propietario')
    const [responsible, setResponsible] = useState<PaymentResponsible>('propietario')
    const [owner, setOwner] = useState<ContactDraft>(toDraft(null))
    const [coOwner, setCoOwner] = useState<ContactDraft>(toDraft(null))
    const [manager, setManager] = useState<ContactDraft>(toDraft(null))
    const [managerCanPay, setManagerCanPay] = useState(false)
    const [showCoOwner, setShowCoOwner] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen || !ownership) return
        setOccupancy(ownership.occupancy_type)
        setResponsible(ownership.payment_responsible)
        setOwner(toDraft(ownership.owner))
        setCoOwner(toDraft(ownership.co_owner))
        setManager(toDraft(ownership.manager))
        setManagerCanPay(ownership.manager_can_pay)
        setShowCoOwner(!!ownership.co_owner)
    }, [isOpen, ownership])

    // El inquilino solo puede ser responsable si la unidad está rentada a un inquilino
    useEffect(() => {
        if (responsible === 'inquilino' && occupancy !== 'inquilino') setResponsible('propietario')
    }, [occupancy, responsible])

    if (!ownership) return null
    const ownerLivesThere = occupancy === 'propietario'

    const handleSave = async () => {
        setSaving(true)
        try {
            const result = await saveUnitOwnershipAction(ownership.unit_id, {
                occupancy_type: occupancy,
                payment_responsible: responsible,
                owner: toInput(owner),
                co_owner: showCoOwner ? toInput(coOwner) : null,
                manager: toInput(manager),
                manager_can_pay: managerCanPay || responsible === 'gestor',
            })
            if (!result.success) throw new Error(result.error)
            toast.success(`Unidad ${ownership.unit_number} actualizada`)
            if (result.invited.length > 0) toast.success(`Invitación al portal de propietarios enviada a ${result.invited.join(', ')}`)
            for (const failure of result.inviteErrors) toast.error(`No se pudo invitar al portal a ${failure}`)
            onSaved()
            onClose()
        } catch (error: any) {
            toast.error(error.message || 'No se pudo guardar')
        } finally {
            setSaving(false)
        }
    }

    const responsibleOptions: PaymentResponsible[] = occupancy === 'inquilino' ? ['propietario', 'gestor', 'inquilino'] : ['propietario', 'gestor']

    return (
        <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title={`Propietario · Unidad ${ownership.unit_number}`} className="max-w-2xl">
            <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
                {/* Ocupación */}
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">¿Quién ocupa la unidad?</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {OCCUPANCY_OPTIONS.map(({ value, icon: Icon, hint }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setOccupancy(value)}
                                className={`p-3 rounded-xl border text-left transition-all ${occupancy === value ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'}`}
                            >
                                <Icon className={`h-4 w-4 mb-1.5 ${occupancy === value ? 'text-indigo-300' : 'text-zinc-500'}`} />
                                <p className={`text-xs font-semibold ${occupancy === value ? 'text-white' : 'text-zinc-300'}`}>{OCCUPANCY_LABEL[value]}</p>
                                <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">{hint}</p>
                            </button>
                        ))}
                    </div>
                    {ownership.occupants.length > 0 && (
                        <p className="text-xs text-zinc-500">
                            {occupancy === 'inquilino' ? 'Inquilino' : occupancy === 'propietario' ? 'Propietario que vive aquí' : 'Residente registrado'}: <span className="text-zinc-300">{ownership.occupants.join(', ')}</span>
                        </p>
                    )}
                </div>

                {/* Responsable de pago */}
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">¿Quién paga la cuota de mantenimiento?</p>
                    <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                        {responsibleOptions.map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setResponsible(r)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${responsible === r ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                            >
                                {PAYMENT_RESPONSIBLE_LABEL[r]}
                            </button>
                        ))}
                    </div>
                    <p className="text-[11px] text-zinc-500">
                        Por ley el propietario responde por la cuota aunque la unidad no esté habitada.
                        {!ownerLivesThere && responsible !== 'inquilino' && ' La cuota mensual se le factura al propietario (aunque pague el gestor en su nombre); el inquilino ya no la recibe. Multas y amenidades siguen siendo del inquilino.'}
                        {responsible === 'inquilino' && ' La cuota se le factura al inquilino y el propietario recibe copia de los recordatorios.'}
                    </p>
                </div>

                {/* Propietario */}
                <ContactFields
                    title={ownerLivesThere ? 'Propietario (opcional)' : 'Propietario'}
                    icon={UserRound}
                    kind="propietario"
                    draft={owner}
                    onChange={setOwner}
                    contacts={contacts}
                    required={!ownerLivesThere}
                    saved={ownership.owner}
                    hint={ownerLivesThere
                        ? 'El dueño es el residente que vive aquí. Captúralo solo si quieres registrar otros datos de contacto.'
                        : 'El dueño no vive en la unidad: es a quien se le cobra y avisa.'}
                />

                {showCoOwner ? (
                    <ContactFields title="Copropietario" icon={Users} kind="propietario" draft={coOwner} onChange={setCoOwner} contacts={contacts} saved={ownership.co_owner} />
                ) : (
                    <button type="button" onClick={() => setShowCoOwner(true)} className="text-xs font-semibold text-indigo-300 hover:text-indigo-200">
                        + Agregar copropietario
                    </button>
                )}

                {/* Gestor */}
                <ContactFields
                    title="Gestor (opcional)"
                    icon={Briefcase}
                    kind="gestor"
                    draft={manager}
                    onChange={setManager}
                    contacts={contacts}
                    required={responsible === 'gestor'}
                    saved={ownership.manager}
                    hint="Persona que le administra la propiedad al dueño. Puede llevar varias unidades."
                />
                {manager.full_name.trim() && (
                    <label className="flex items-center gap-2 text-sm text-zinc-300 -mt-2 px-1">
                        <input type="checkbox" checked={managerCanPay || responsible === 'gestor'} disabled={responsible === 'gestor'} onChange={(e) => setManagerCanPay(e.target.checked)} className="accent-indigo-500" />
                        El gestor puede pagar a nombre del propietario
                    </label>
                )}
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-zinc-800">
                <Button variant="ghost" onClick={onClose} disabled={saving} className="text-zinc-300">Cancelar</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
                </Button>
            </div>
        </Modal>
    )
}
