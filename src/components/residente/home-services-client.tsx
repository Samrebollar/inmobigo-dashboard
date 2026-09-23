'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Sparkles,
    Droplet,
    Leaf,
    PaintBucket,
    Hammer,
    Umbrella,
    Zap,
    MessageCircle,
    Clock,
    CheckCircle2,
    Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const INMOBIGO_WHATSAPP = '529982338624'

type Category = 'Plomería' | 'Jardinería' | 'Pintura' | 'Mantenimiento' | 'Impermeabilización' | 'Electricidad'

interface Service {
    id: string
    name: string
    description: string
    category: Category
}

const CATEGORY_META: Record<Category, { icon: any, color: string, gradient: string }> = {
    'Plomería': { icon: Droplet, color: 'text-cyan-400', gradient: 'from-cyan-500/15 to-cyan-500/0' },
    'Jardinería': { icon: Leaf, color: 'text-emerald-400', gradient: 'from-emerald-500/15 to-emerald-500/0' },
    'Pintura': { icon: PaintBucket, color: 'text-fuchsia-400', gradient: 'from-fuchsia-500/15 to-fuchsia-500/0' },
    'Mantenimiento': { icon: Hammer, color: 'text-amber-400', gradient: 'from-amber-500/15 to-amber-500/0' },
    'Impermeabilización': { icon: Umbrella, color: 'text-sky-400', gradient: 'from-sky-500/15 to-sky-500/0' },
    'Electricidad': { icon: Zap, color: 'text-yellow-400', gradient: 'from-yellow-500/15 to-yellow-500/0' },
}

const SERVICES: Service[] = [
    { id: 'pl1', name: 'Detección y Reparación de Fugas', description: 'Localizamos y reparamos fugas de agua visibles u ocultas antes de que dañen tu hogar.', category: 'Plomería' },
    { id: 'pl2', name: 'Destape de Drenajes y Tuberías', description: 'Desazolve profesional de coladeras, WC y tuberías obstruidas.', category: 'Plomería' },
    { id: 'pl3', name: 'Instalación de Muebles de Baño', description: 'Instalación y cambio de regaderas, llaves, WC y calentadores.', category: 'Plomería' },

    { id: 'j1', name: 'Mantenimiento de Jardín Residencial', description: 'Poda, riego y limpieza para el jardín o terraza de tu casa.', category: 'Jardinería' },
    { id: 'j2', name: 'Diseño de Áreas Verdes', description: 'Transformamos tu patio o balcón con plantas y paisajismo a tu gusto.', category: 'Jardinería' },
    { id: 'j3', name: 'Control de Plagas en Jardín', description: 'Fumigación segura para proteger tus plantas y mascotas.', category: 'Jardinería' },

    { id: 'pi1', name: 'Pintura de Interiores', description: 'Renueva paredes, techos y acabados con pintura de alta calidad.', category: 'Pintura' },
    { id: 'pi2', name: 'Pintura de Fachadas', description: 'Protección y estética para el exterior de tu casa.', category: 'Pintura' },
    { id: 'pi3', name: 'Resanes y Acabados', description: 'Reparación de grietas y humedad antes de pintar.', category: 'Pintura' },

    { id: 'm1', name: 'Reparaciones del Hogar', description: 'Ese pendiente de arreglar en casa: puertas, chapas, muebles y más.', category: 'Mantenimiento' },
    { id: 'm2', name: 'Instalación de Muebles y Accesorios', description: 'Montaje de cocinas integrales, closets, cortineros y repisas.', category: 'Mantenimiento' },
    { id: 'm3', name: 'Mantenimiento Preventivo', description: 'Revisión general para detectar fallas antes de que sean un problema mayor.', category: 'Mantenimiento' },

    { id: 'im1', name: 'Impermeabilización de Azotea', description: 'Protege tu hogar de goteras e infiltraciones, con garantía.', category: 'Impermeabilización' },
    { id: 'im2', name: 'Sellado de Grietas y Filtraciones', description: 'Reparación puntual de humedad en techos y muros.', category: 'Impermeabilización' },
    { id: 'im3', name: 'Impermeabilización de Tinacos y Cisternas', description: 'Cuida la calidad del agua de tu hogar.', category: 'Impermeabilización' },

    { id: 'e1', name: 'Instalaciones Eléctricas', description: 'Instalación de contactos, apagadores, lámparas y circuitos nuevos.', category: 'Electricidad' },
    { id: 'e2', name: 'Detección de Fallas Eléctricas', description: 'Diagnóstico y reparación de cortos y apagones.', category: 'Electricidad' },
    { id: 'e3', name: 'Instalación de Minisplits y A/C', description: 'Montaje eléctrico seguro para tus equipos de climatización.', category: 'Electricidad' },
]

export default function HomeServicesClient({
    residentName,
    unitNumber,
    condominiumName,
}: {
    residentName: string
    unitNumber?: string | null
    condominiumName?: string | null
}) {
    const [activeTab, setActiveTab] = useState<Category>('Plomería')

    const categories = Object.keys(CATEGORY_META) as Category[]
    const filteredServices = SERVICES.filter(s => s.category === activeTab)

    const buildWhatsAppLink = (service: Service) => {
        const lines = [
            `Hola, quiero cotizar un servicio para mi hogar con InmobiGo.`,
            ``,
            `Servicio: ${service.name}`,
            `Categoría: ${service.category}`,
            `Residente: ${residentName}`,
            unitNumber ? `Unidad: ${unitNumber}` : null,
            condominiumName ? `Condominio: ${condominiumName}` : null,
        ].filter(Boolean)

        const text = encodeURIComponent(lines.join('\n'))
        return `https://wa.me/${INMOBIGO_WHATSAPP}?text=${text}`
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                    <Sparkles size={14} />
                    <span>InmobiGo Hogar</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                    Servicios para tu <span className="text-indigo-500">Hogar</span>
                </h1>
                <p className="text-zinc-400 text-lg max-w-2xl font-medium">
                    ¿Necesitas un plomero, un electricista o pintar tu casa? Cotiza directo con InmobiGo por WhatsApp — independiente de tu administración.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 p-1 bg-zinc-900/50 rounded-2xl border border-zinc-800 w-fit backdrop-blur-xl">
                {categories.map((cat) => {
                    const meta = CATEGORY_META[cat]
                    return (
                        <button
                            key={cat}
                            onClick={() => setActiveTab(cat)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                                activeTab === cat
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-105"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                            )}
                        >
                            <meta.icon size={18} />
                            {cat}
                        </button>
                    )
                })}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="wait">
                    {filteredServices.map((service) => {
                        const meta = CATEGORY_META[service.category]
                        return (
                            <motion.div
                                key={service.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className={cn(
                                    "group relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all duration-500 flex flex-col h-full shadow-lg bg-gradient-to-br",
                                    meta.gradient
                                )}
                            >
                                <div className="flex-1 p-6 space-y-4">
                                    <div className="p-3 bg-zinc-800/80 rounded-2xl w-fit">
                                        <meta.icon size={26} className={meta.color} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-white">
                                            {service.name}
                                        </h3>
                                        <p className="text-zinc-400 text-sm leading-relaxed">
                                            {service.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6 pt-0">
                                    <a
                                        href={buildWhatsAppLink(service)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5c] text-white font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-[#25D366]/20 active:scale-95"
                                    >
                                        <MessageCircle size={18} />
                                        Solicitar Cotización
                                    </a>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {/* Value Props */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                {[
                    { icon: Shield, title: 'Personal Certificado', desc: 'Todo nuestro staff cuenta con capacitación técnica y seguros vigentes.' },
                    { icon: Clock, title: 'Respuesta en 24h', desc: 'Tu solicitud de cotización será atendida el mismo día por un ejecutivo.' },
                    { icon: CheckCircle2, title: 'Calidad Garantizada', desc: 'Sistemas de control de calidad bajo estándares internacionales.' },
                ].map((prop, index) => (
                    <div key={index} className="flex gap-4 p-6 bg-zinc-900/30 rounded-3xl border border-zinc-800/50 backdrop-blur-sm">
                        <prop.icon className="text-indigo-500 h-8 w-8 shrink-0" />
                        <div className="space-y-1">
                            <h4 className="text-white font-bold">{prop.title}</h4>
                            <p className="text-zinc-500 text-xs leading-relaxed">{prop.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
