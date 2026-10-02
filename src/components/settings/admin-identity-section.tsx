'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'react-qr-code'
import { toPng } from 'html-to-image'
import { toast } from 'sonner'
import {
    Building2,
    Users,
    QrCode,
    Save,
    Loader2,
    Plus,
    Trash2,
    Copy,
    Download,
    ExternalLink,
    RefreshCw,
    Phone,
    Mail,
    Clock,
    MapPin,
    Globe,
    FileText,
    UserPlus,
    EyeOff,
    BadgeCheck,
    Upload,
    Paperclip,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { saveAdminIdentityAction, regenerateAdminQrAction } from '@/app/actions/admin-identity-actions'
import { createClient } from '@/utils/supabase/client'
import {
    COMMITTEE_POSITIONS,
    SEDETUS_STATUS_LABEL,
    getSedetusStatus,
    type AdminIdentity,
    type AdminType,
    type CommitteeMember,
    type SedetusStatus,
} from '@/types/admin-identity'

const inputClass = 'bg-zinc-950/50 border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all hover:bg-zinc-950'
const textareaClass = 'w-full min-h-[80px] px-3 py-2 text-sm text-white placeholder:text-zinc-600 bg-zinc-950/50 border border-zinc-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all hover:bg-zinc-950 resize-y'

export const SEDETUS_STATUS_STYLE: Record<SedetusStatus, string> = {
    vigente: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    sin_vigencia: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    por_vencer: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    vencida: 'text-red-400 bg-red-500/10 border-red-500/20',
    sin_registro: 'text-zinc-400 bg-zinc-500/10 border-zinc-700',
}

const SEDETUS_MAX_BYTES = 10 * 1024 * 1024
const SEDETUS_MIME = ['application/pdf', 'image/jpeg', 'image/png']

export const ADMIN_TYPE_LABEL: Record<AdminType, string> = {
    empresa: 'Empresa administradora',
    comite: 'Comité de administración',
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            <Label className="text-zinc-400">{label}</Label>
            {children}
        </div>
    )
}

function IconInput({ icon: Icon, ...props }: { icon: React.ElementType } & React.ComponentProps<typeof Input>) {
    return (
        <div className="relative">
            <Icon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input {...props} className={`pl-9 ${inputClass}`} />
        </div>
    )
}

/**
 * Ficha del administrador: el administrador de la organización puede ser una
 * Empresa administradora o un Comité de vecinos, y cada uno captura datos
 * distintos. Lo que se guarda aquí es lo que muestra el código QR.
 */
export function AdminIdentityCard({
    identity,
    onSaved,
    currentUser,
}: {
    identity: AdminIdentity
    onSaved: (identity: AdminIdentity) => void
    currentUser: { name: string; phone: string | null; email: string | null }
}) {
    const [form, setForm] = useState<AdminIdentity>(identity)
    const [saving, setSaving] = useState(false)
    const [uploadingDoc, setUploadingDoc] = useState(false)
    const docInputRef = useRef<HTMLInputElement>(null)
    const sedetusStatus = getSedetusStatus(form)

    useEffect(() => {
        setForm((prev) => ({ ...prev, public_token: identity.public_token, is_public: identity.is_public }))
    }, [identity.public_token, identity.is_public])

    const set = <K extends keyof AdminIdentity>(key: K, value: AdminIdentity[K]) => setForm((prev) => ({ ...prev, [key]: value }))

    const setMember = (index: number, patch: Partial<CommitteeMember>) =>
        set('committee_members', form.committee_members.map((m, i) => (i === index ? { ...m, ...patch } : m)))

    const addMember = (member?: Partial<CommitteeMember>) =>
        set('committee_members', [
            ...form.committee_members,
            { name: '', position: form.committee_members.length === 0 ? 'Presidente' : 'Vocal', unit: null, phone: null, email: null, ...member },
        ])

    const removeMember = (index: number) => set('committee_members', form.committee_members.filter((_, i) => i !== index))

    const alreadyListed = form.committee_members.some((m) => m.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase())

    const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        if (!SEDETUS_MIME.includes(file.type)) return void toast.error('La constancia debe ser PDF, JPG o PNG.')
        if (file.size > SEDETUS_MAX_BYTES) return void toast.error('La constancia no puede pesar más de 10 MB.')

        setUploadingDoc(true)
        try {
            const supabase = createClient()
            const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
            const filePath = `admin-accreditation/${form.organization_id}/sedetus-${Date.now()}.${ext}`
            const { error } = await supabase.storage.from('condominium_documents').upload(filePath, file, { upsert: true })
            if (error) throw error
            const { data } = supabase.storage.from('condominium_documents').getPublicUrl(filePath)
            set('sedetus_document_url', data.publicUrl)
            toast.success('Constancia cargada. Presiona "Guardar ficha" para publicarla.')
        } catch (error: any) {
            toast.error(`No se pudo subir la constancia: ${error.message || 'Error de red'}`)
        } finally {
            setUploadingDoc(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const { organization_id, public_token, updated_at, ...input } = form
            const result = await saveAdminIdentityAction(input)
            if (!result.success) throw new Error(result.error)
            setForm(result.identity)
            onSaved(result.identity)
            toast.success('Ficha del administrador guardada. El código QR ya muestra la información actualizada.')
        } catch (error: any) {
            toast.error(error.message || 'No se pudo guardar la ficha')
        } finally {
            setSaving(false)
        }
    }

    const typeOptions: { value: AdminType; title: string; subtitle: string; icon: React.ElementType }[] = [
        { value: 'empresa', title: 'Empresa', subtitle: 'Despacho o empresa administradora contratada', icon: Building2 },
        { value: 'comite', title: 'Comité', subtitle: 'Vecinos electos en asamblea (presidente, tesorero...)', icon: Users },
    ]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-indigo-500/30 transition-all shadow-lg"
        >
            <div className="flex items-start justify-between gap-4 mb-2">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    {form.admin_type === 'comite'
                        ? <Users className="h-5 w-5 text-indigo-400" />
                        : <Building2 className="h-5 w-5 text-indigo-400" />}
                    Ficha del Administrador
                </h2>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full shrink-0">
                    <QrCode className="h-3 w-3" /> Visible en QR
                </div>
            </div>
            <p className="text-sm text-zinc-500 mb-6">
                ¿Quién administra el condominio? Esta información es la que verán residentes, proveedores y visitantes al escanear tu código QR.
            </p>

            {/* Tipo de administrador */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {typeOptions.map(({ value, title, subtitle, icon: Icon }) => {
                    const active = form.admin_type === value
                    return (
                        <button
                            key={value}
                            type="button"
                            onClick={() => set('admin_type', value)}
                            className={`text-left p-4 rounded-2xl border transition-all flex items-start gap-3 ${active
                                ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.4)]'
                                : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'}`}
                        >
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className={`font-semibold ${active ? 'text-white' : 'text-zinc-300'}`}>{title}</p>
                                <p className="text-xs text-zinc-500">{subtitle}</p>
                            </div>
                        </button>
                    )
                })}
            </div>

            {!form.admin_type ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
                    Selecciona el tipo de administrador para capturar su información.
                </div>
            ) : (
                <div className="space-y-8">
                    {form.admin_type === 'empresa' ? (
                        <section className="space-y-4">
                            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Datos de la empresa</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Nombre comercial">
                                    <Input value={form.display_name || ''} onChange={(e) => set('display_name', e.target.value)} className={inputClass} placeholder="Ej. Administra Plus" />
                                </Field>
                                <Field label="Razón social">
                                    <Input value={form.legal_name || ''} onChange={(e) => set('legal_name', e.target.value)} className={inputClass} placeholder="Ej. Administra Plus S.A. de C.V." />
                                </Field>
                                <Field label="RFC">
                                    <Input value={form.rfc || ''} onChange={(e) => set('rfc', e.target.value.toUpperCase())} className={`${inputClass} uppercase`} placeholder="ABC123456XYZ" maxLength={13} />
                                </Field>
                                <Field label="Representante legal">
                                    <Input value={form.legal_representative || ''} onChange={(e) => set('legal_representative', e.target.value)} className={inputClass} placeholder={currentUser.name} />
                                </Field>
                                <Field label="Domicilio fiscal" className="md:col-span-2">
                                    <IconInput icon={FileText} value={form.fiscal_address || ''} onChange={(e) => set('fiscal_address', e.target.value)} placeholder="Calle, número, colonia, C.P., ciudad" />
                                </Field>
                                <Field label="Sitio web">
                                    <IconInput icon={Globe} value={form.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://..." />
                                </Field>
                            </div>
                        </section>
                    ) : (
                        <section className="space-y-4">
                            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Datos del comité</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Nombre del comité" className="md:col-span-2">
                                    <Input value={form.display_name || ''} onChange={(e) => set('display_name', e.target.value)} className={inputClass} placeholder="Ej. Comité de Administración Residencial Las Palmas" />
                                </Field>
                                <Field label="Inicio de gestión">
                                    <Input type="date" value={form.committee_period_start || ''} onChange={(e) => set('committee_period_start', e.target.value)} className={inputClass} />
                                </Field>
                                <Field label="Fin de gestión">
                                    <Input type="date" value={form.committee_period_end || ''} onChange={(e) => set('committee_period_end', e.target.value)} className={inputClass} />
                                </Field>
                                <Field label="Fecha del acta de asamblea">
                                    <Input type="date" value={form.assembly_date || ''} onChange={(e) => set('assembly_date', e.target.value)} className={inputClass} />
                                </Field>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Integrantes ({form.committee_members.length})</h3>
                                <div className="flex gap-2">
                                    {!alreadyListed && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => addMember({ name: currentUser.name, phone: currentUser.phone, email: currentUser.email })}
                                            className="h-8 rounded-xl text-xs text-indigo-300 hover:bg-indigo-500/10 gap-1"
                                        >
                                            <UserPlus className="h-3.5 w-3.5" /> Agregarme
                                        </Button>
                                    )}
                                    <Button type="button" variant="ghost" onClick={() => addMember()} className="h-8 rounded-xl text-xs text-indigo-300 hover:bg-indigo-500/10 gap-1">
                                        <Plus className="h-3.5 w-3.5" /> Integrante
                                    </Button>
                                </div>
                            </div>

                            {form.committee_members.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-zinc-800 p-5 text-center text-sm text-zinc-500">
                                    Agrega a los integrantes del comité (presidente, tesorero, secretario, vocales).
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {form.committee_members.map((member, index) => (
                                        <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 grid gap-3 md:grid-cols-6">
                                            <Input value={member.name} onChange={(e) => setMember(index, { name: e.target.value })} placeholder="Nombre completo" className={`${inputClass} md:col-span-3`} />
                                            <select
                                                value={member.position}
                                                onChange={(e) => setMember(index, { position: e.target.value })}
                                                className="md:col-span-2 h-10 px-3 text-sm text-white bg-zinc-950/50 border border-zinc-800 rounded-xl focus:border-indigo-500 focus:outline-none"
                                            >
                                                {COMMITTEE_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                                                {!COMMITTEE_POSITIONS.includes(member.position as any) && <option value={member.position}>{member.position}</option>}
                                            </select>
                                            <Button type="button" variant="ghost" onClick={() => removeMember(index)} className="h-10 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10" aria-label="Quitar integrante">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Input value={member.unit || ''} onChange={(e) => setMember(index, { unit: e.target.value })} placeholder="Unidad / Depto" className={`${inputClass} md:col-span-2`} />
                                            <Input value={member.phone || ''} onChange={(e) => setMember(index, { phone: e.target.value })} placeholder="Teléfono (opcional)" className={`${inputClass} md:col-span-2`} />
                                            <Input value={member.email || ''} onChange={(e) => setMember(index, { email: e.target.value })} placeholder="Correo (opcional)" className={`${inputClass} md:col-span-2`} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Acreditación SEDETUS — obligatoria para Empresa y para Comité */}
                    <section className="space-y-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.03] p-4 md:p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <BadgeCheck className="h-4 w-4" /> Matriculación y Acreditación
                                </h3>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Registro de Administrador Condominal emitido por la SEDETUS (Secretaría de Desarrollo Territorial Urbano Sustentable). Requisito obligatorio.
                                </p>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0 ${SEDETUS_STATUS_STYLE[sedetusStatus]}`}>
                                {SEDETUS_STATUS_LABEL[sedetusStatus]}
                            </span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Número de matrícula / registro">
                                <Input value={form.sedetus_registration_number || ''} onChange={(e) => set('sedetus_registration_number', e.target.value.toUpperCase())} className={`${inputClass} uppercase`} placeholder="Ej. SEDETUS-AC-0123/2026" />
                            </Field>
                            <Field label="Administrador acreditado">
                                <Input
                                    value={form.sedetus_holder_name || ''}
                                    onChange={(e) => set('sedetus_holder_name', e.target.value)}
                                    className={inputClass}
                                    placeholder={form.admin_type === 'empresa' ? 'Persona o empresa que aparece en la constancia' : currentUser.name || 'Nombre en la constancia'}
                                />
                            </Field>
                            <Field label="Fecha de emisión">
                                <Input type="date" value={form.sedetus_issue_date || ''} onChange={(e) => set('sedetus_issue_date', e.target.value)} className={inputClass} />
                            </Field>
                            <Field label="Vigente hasta">
                                <Input type="date" value={form.sedetus_expiry_date || ''} onChange={(e) => set('sedetus_expiry_date', e.target.value)} className={inputClass} />
                            </Field>
                            <Field label="Constancia de acreditación" className="md:col-span-2">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    {form.sedetus_document_url ? (
                                        <a href={form.sedetus_document_url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 flex items-center gap-2 h-10 px-3 rounded-xl border border-zinc-800 bg-zinc-950/50 text-sm text-indigo-300 hover:bg-zinc-950">
                                            <Paperclip className="h-4 w-4 shrink-0" /> <span className="truncate">Ver constancia cargada</span>
                                        </a>
                                    ) : (
                                        <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500">
                                            <Paperclip className="h-4 w-4 shrink-0" /> Sin constancia (PDF, JPG o PNG, máx. 10 MB)
                                        </div>
                                    )}
                                    <input ref={docInputRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={handleDocumentUpload} />
                                    <Button type="button" variant="ghost" onClick={() => docInputRef.current?.click()} disabled={uploadingDoc} className="h-10 rounded-xl text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 gap-1.5">
                                        {uploadingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                                        {form.sedetus_document_url ? 'Reemplazar' : 'Subir constancia'}
                                    </Button>
                                    {form.sedetus_document_url && (
                                        <Button type="button" variant="ghost" onClick={() => set('sedetus_document_url', null)} className="h-10 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10" aria-label="Quitar constancia">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </Field>
                        </div>
                    </section>

                    {/* Datos de atención — aplican a ambos tipos */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Atención a residentes</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Teléfono de atención">
                                <IconInput icon={Phone} value={form.contact_phone || ''} onChange={(e) => set('contact_phone', e.target.value)} placeholder={currentUser.phone || '+52 (55) 1234-5678'} />
                            </Field>
                            <Field label="Correo de atención">
                                <IconInput icon={Mail} type="email" value={form.contact_email || ''} onChange={(e) => set('contact_email', e.target.value)} placeholder={currentUser.email || 'contacto@...'} />
                            </Field>
                            <Field label={form.admin_type === 'empresa' ? 'Dirección de oficina' : 'Lugar de atención'}>
                                <IconInput icon={MapPin} value={form.office_address || ''} onChange={(e) => set('office_address', e.target.value)} placeholder={form.admin_type === 'empresa' ? 'Oficina de la empresa' : 'Ej. Caseta / Salón de usos múltiples'} />
                            </Field>
                            <Field label="Horario de atención">
                                <IconInput icon={Clock} value={form.office_hours || ''} onChange={(e) => set('office_hours', e.target.value)} placeholder="Lun a Vie 9:00 - 18:00" />
                            </Field>
                            <Field label="Descripción" className="md:col-span-2">
                                <textarea
                                    value={form.description || ''}
                                    onChange={(e) => set('description', e.target.value)}
                                    className={textareaClass}
                                    maxLength={500}
                                    placeholder={form.admin_type === 'empresa'
                                        ? 'Servicios que ofrece la empresa, años de experiencia, etc.'
                                        : 'Funciones del comité, cómo contactarlo, reuniones, etc.'}
                                />
                            </Field>
                        </div>
                    </section>

                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20">
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar ficha
                        </Button>
                    </div>
                </div>
            )}
        </motion.div>
    )
}

/** Código QR que abre la ficha pública del administrador (/administrador/<token>). */
export function AdminQrCard({
    identity,
    organizationName,
    onChange,
}: {
    identity: AdminIdentity
    organizationName?: string | null
    onChange: (identity: AdminIdentity) => void
}) {
    const [origin, setOrigin] = useState('')
    const [busy, setBusy] = useState<null | 'toggle' | 'regenerate' | 'download'>(null)
    const printableRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setOrigin(process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
    }, [])

    const url = origin ? `${origin.replace(/\/$/, '')}/administrador/${identity.public_token}` : ''
    const ready = !!identity.admin_type
    const active = ready && identity.is_public
    const title = identity.display_name || organizationName || 'Administración'

    const handleToggle = async (checked: boolean) => {
        if (!ready) {
            toast.error('Primero guarda la ficha eligiendo Empresa o Comité.')
            return
        }
        setBusy('toggle')
        const { organization_id, public_token, updated_at, ...input } = identity
        const result = await saveAdminIdentityAction({ ...input, is_public: checked })
        setBusy(null)
        if (!result.success) return toast.error(result.error)
        onChange(result.identity)
        toast.success(checked ? 'Tu ficha ahora es visible al escanear el QR.' : 'El QR quedó desactivado: nadie podrá ver tu ficha.')
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url)
            toast.success('Enlace copiado')
        } catch {
            toast.error('No se pudo copiar el enlace')
        }
    }

    const handleDownload = async () => {
        if (!printableRef.current) return
        setBusy('download')
        try {
            const dataUrl = await toPng(printableRef.current, { pixelRatio: 3, backgroundColor: '#ffffff' })
            const link = document.createElement('a')
            link.download = `QR_Administrador_${title.replace(/[^\p{L}\p{N}]+/gu, '_')}.png`
            link.href = dataUrl
            link.click()
        } catch (error) {
            console.error('Error generando QR:', error)
            toast.error('No se pudo descargar el QR')
        } finally {
            setBusy(null)
        }
    }

    const handleRegenerate = async () => {
        if (!confirm('Se generará un código QR nuevo y los QR que ya imprimiste o compartiste dejarán de funcionar. ¿Continuar?')) return
        setBusy('regenerate')
        const result = await regenerateAdminQrAction()
        setBusy(null)
        if (!result.success) return toast.error(result.error)
        onChange({ ...identity, public_token: result.token })
        toast.success('Código QR regenerado')
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden"
        >
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4 relative">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Mi Código QR</h3>
                <Switch checked={identity.is_public} disabled={busy !== null} onCheckedChange={handleToggle} aria-label="Ficha pública" />
            </div>

            {/* Tarjeta imprimible: es lo que se descarga como PNG */}
            <div className="relative">
                <div ref={printableRef} className="bg-white rounded-2xl p-5 flex flex-col items-center text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-1">
                        {identity.admin_type ? ADMIN_TYPE_LABEL[identity.admin_type] : 'Administración'}
                    </p>
                    <p className="text-sm font-bold text-zinc-900 leading-tight mb-3 line-clamp-2">{title}</p>
                    {identity.sedetus_registration_number && getSedetusStatus(identity) !== 'vencida' && (
                        <p className="-mt-2 mb-3 text-[9px] font-bold text-emerald-700 flex items-center gap-1">
                            <BadgeCheck className="h-3 w-3" /> Acreditado SEDETUS · {identity.sedetus_registration_number}
                        </p>
                    )}
                    {url ? (
                        <QRCode value={url} size={168} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} viewBox="0 0 256 256" />
                    ) : (
                        <div className="h-[168px] w-[168px] bg-zinc-100 rounded-xl animate-pulse" />
                    )}
                    <p className="text-[10px] text-zinc-500 mt-3">Escanea para ver la información del administrador</p>
                    <p className="text-[9px] font-bold text-zinc-400 mt-1">InmobiGo</p>
                </div>

                {!active && (
                    <div className="absolute inset-0 rounded-2xl bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 gap-2">
                        <EyeOff className="h-6 w-6 text-zinc-400" />
                        <p className="text-xs text-zinc-300 font-semibold">
                            {ready ? 'QR desactivado' : 'Completa tu ficha'}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                            {ready ? 'Actívalo con el interruptor para que se pueda consultar.' : 'Elige Empresa o Comité y guarda la ficha para activar tu QR.'}
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
                <Button variant="ghost" onClick={handleCopy} disabled={!active || !url} className="h-9 rounded-xl text-[11px] text-zinc-300 bg-zinc-950/50 border border-zinc-800 hover:bg-zinc-800 gap-1.5">
                    <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
                <Button variant="ghost" onClick={handleDownload} disabled={!active || busy !== null} className="h-9 rounded-xl text-[11px] text-zinc-300 bg-zinc-950/50 border border-zinc-800 hover:bg-zinc-800 gap-1.5">
                    {busy === 'download' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Descargar
                </Button>
                <Button variant="ghost" onClick={() => window.open(url, '_blank')} disabled={!active || !url} className="h-9 rounded-xl text-[11px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Ver ficha
                </Button>
                <Button variant="ghost" onClick={handleRegenerate} disabled={busy !== null} className="h-9 rounded-xl text-[11px] text-zinc-400 bg-zinc-950/50 border border-zinc-800 hover:bg-zinc-800 gap-1.5">
                    {busy === 'regenerate' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Regenerar
                </Button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-3 leading-relaxed">
                Imprímelo en caseta, áreas comunes o compártelo por WhatsApp. Solo se muestra la información de tu ficha.
            </p>
        </motion.div>
    )
}
