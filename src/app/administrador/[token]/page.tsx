import { notFound } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    Building2,
    Users,
    Phone,
    Mail,
    MapPin,
    Clock,
    Globe,
    FileText,
    UserCircle2,
    CalendarDays,
    ShieldCheck,
    MessageCircle,
    Home,
} from 'lucide-react'
import { getPublicAdminCard } from '@/services/admin-identity-service'
import { normalizeMexicanPhone } from '@/utils/phone-utils'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Administración | InmobiGo',
    description: 'Información del administrador del condominio',
}

const formatDate = (value: string | null) => {
    if (!value) return null
    try {
        return format(parseISO(value), "d 'de' MMMM yyyy", { locale: es })
    } catch {
        return value
    }
}

const whatsappHref = (phone: string) => `https://wa.me/${normalizeMexicanPhone(phone) || phone.replace(/\D/g, '')}`

function InfoRow({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string | null; href?: string }) {
    if (!value) return null
    const content = (
        <>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">{label}</p>
                <p className="text-sm text-zinc-100 break-words">{value}</p>
            </div>
        </>
    )
    return href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-80 transition-opacity">{content}</a>
    ) : (
        <div className="flex items-center gap-3">{content}</div>
    )
}

export default async function AdministradorPublicPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const card = await getPublicAdminCard(token)
    if (!card) notFound()

    const { identity, organizationName, condominiums } = card
    const isEmpresa = identity.admin_type === 'empresa'
    const title = identity.display_name || organizationName || 'Administración'
    const periodStart = formatDate(identity.committee_period_start)
    const periodEnd = formatDate(identity.committee_period_end)
    const period = periodStart || periodEnd ? `${periodStart || '—'} al ${periodEnd || '—'}` : null
    const websiteHref = identity.website ? (/^https?:\/\//.test(identity.website) ? identity.website : `https://${identity.website}`) : undefined

    return (
        <div className="min-h-screen bg-black text-white font-sans px-4 py-8 md:py-12 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-indigo-600/20 blur-[140px] rounded-full pointer-events-none" />

            <main className="relative z-10 max-w-lg mx-auto space-y-5">
                {/* Encabezado */}
                <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 backdrop-blur-2xl overflow-hidden shadow-2xl">
                    <div className="h-24 bg-gradient-to-r from-indigo-900 via-purple-900 to-zinc-900" />
                    <div className="px-6 pb-6 -mt-10">
                        <div className="h-20 w-20 rounded-2xl border-4 border-zinc-950 bg-zinc-800 flex items-center justify-center overflow-hidden shadow-xl">
                            {identity.logo_url ? (
                                <img src={identity.logo_url} alt={title} className="h-full w-full object-cover" />
                            ) : isEmpresa ? (
                                <Building2 className="h-9 w-9 text-indigo-300" />
                            ) : (
                                <Users className="h-9 w-9 text-indigo-300" />
                            )}
                        </div>
                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                                {isEmpresa ? 'Empresa administradora' : 'Comité de administración'}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                                <ShieldCheck className="h-3 w-3" /> Registrado en InmobiGo
                            </span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight mt-3">{title}</h1>
                        {isEmpresa && identity.legal_name && identity.legal_name !== title && (
                            <p className="text-sm text-zinc-400">{identity.legal_name}</p>
                        )}
                        {identity.description && <p className="text-sm text-zinc-400 mt-3 leading-relaxed whitespace-pre-line">{identity.description}</p>}

                        {identity.contact_phone && (
                            <div className="grid grid-cols-2 gap-2 mt-5">
                                <a href={whatsappHref(identity.contact_phone)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold transition-colors">
                                    <MessageCircle className="h-4 w-4" /> WhatsApp
                                </a>
                                <a href={`tel:${identity.contact_phone}`} className="flex items-center justify-center gap-2 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold transition-colors">
                                    <Phone className="h-4 w-4" /> Llamar
                                </a>
                            </div>
                        )}
                    </div>
                </section>

                {/* Datos de la empresa o del comité */}
                <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                        {isEmpresa ? 'Datos de la empresa' : 'Datos del comité'}
                    </h2>
                    {isEmpresa ? (
                        <>
                            <InfoRow icon={FileText} label="Razón social" value={identity.legal_name} />
                            <InfoRow icon={FileText} label="RFC" value={identity.rfc} />
                            <InfoRow icon={UserCircle2} label="Representante legal" value={identity.legal_representative} />
                            <InfoRow icon={MapPin} label="Domicilio fiscal" value={identity.fiscal_address} />
                            <InfoRow icon={Globe} label="Sitio web" value={identity.website} href={websiteHref} />
                        </>
                    ) : (
                        <>
                            <InfoRow icon={CalendarDays} label="Periodo de gestión" value={period} />
                            <InfoRow icon={FileText} label="Acta de asamblea" value={formatDate(identity.assembly_date)} />
                        </>
                    )}
                </section>

                {/* Integrantes del comité */}
                {!isEmpresa && identity.committee_members.length > 0 && (
                    <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-6">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Integrantes</h2>
                        <div className="space-y-3">
                            {identity.committee_members.map((m, i) => (
                                <div key={i} className="rounded-2xl bg-zinc-950/60 border border-zinc-800/60 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-white">{m.name}</p>
                                            <p className="text-xs text-indigo-300 font-medium">
                                                {m.position}{m.unit ? <span className="text-zinc-500"> · Unidad {m.unit}</span> : null}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            {m.phone && (
                                                <a href={whatsappHref(m.phone)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${m.name}`} className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/20">
                                                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                                                </a>
                                            )}
                                            {m.email && (
                                                <a href={`mailto:${m.email}`} aria-label={`Correo de ${m.name}`} className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center hover:bg-indigo-500/20">
                                                    <Mail className="h-4 w-4 text-indigo-400" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Atención */}
                <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Atención</h2>
                    <InfoRow icon={Phone} label="Teléfono" value={identity.contact_phone} href={identity.contact_phone ? `tel:${identity.contact_phone}` : undefined} />
                    <InfoRow icon={Mail} label="Correo" value={identity.contact_email} href={identity.contact_email ? `mailto:${identity.contact_email}` : undefined} />
                    <InfoRow icon={MapPin} label={isEmpresa ? 'Oficina' : 'Lugar de atención'} value={identity.office_address} />
                    <InfoRow icon={Clock} label="Horario" value={identity.office_hours} />
                    {!identity.contact_phone && !identity.contact_email && !identity.office_address && !identity.office_hours && (
                        <p className="text-sm text-zinc-500">Sin datos de atención registrados.</p>
                    )}
                </section>

                {/* Condominios administrados */}
                {condominiums.length > 0 && (
                    <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-6">
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">
                            {condominiums.length === 1 ? 'Condominio administrado' : 'Condominios administrados'}
                        </h2>
                        <div className="space-y-3">
                            {condominiums.map((c, i) => (
                                <InfoRow key={i} icon={Home} label="Condominio" value={c.address ? `${c.name} · ${c.address}` : c.name} />
                            ))}
                        </div>
                    </section>
                )}

                <p className="text-center text-[11px] text-zinc-600 pt-2">
                    Información publicada por la administración a través de <span className="font-bold text-zinc-400">InmobiGo</span>
                </p>
            </main>
        </div>
    )
}
