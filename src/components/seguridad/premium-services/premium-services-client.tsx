'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Sparkles, 
    Leaf, 
    Droplets, 
    Trash2, 
    Hammer, 
    MessageSquare, 
    X, 
    CheckCircle2,
    Clock,
    Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { preparePremiumLead } from '@/app/actions/premium-actions'

interface Service {
    id: string
    name: string
    description: string
    category: 'Jardinería' | 'Albercas' | 'Limpieza' | 'Mantenimiento'
    image: string
}

const SERVICES: Service[] = [
    // Jardinería
    { id: 'j1', name: 'Corte de Césped Profesional', description: 'Mantenimiento preventivo y estético para áreas verdes de alto tráfico.', category: 'Jardinería', image: '/images/premium/jardineria_1.png' },
    { id: 'j2', name: 'Podado de Árboles y Palmeras', description: 'Servicio especializado con equipo de seguridad y retiro de desechos.', category: 'Jardinería', image: '/images/premium/jardineria_2.png' },
    { id: 'j3', name: 'Diseño de Paisajismo', description: 'Transformación integral de jardines comunitarios con especies nativas.', category: 'Jardinería', image: '/images/premium/jardineria_3.png' },
    
    // Albercas
    { id: 'a1', name: 'Limpieza Profunda de Alberca', description: 'Aspirado, cepillado y balance de agua para cristalinidad total.', category: 'Albercas', image: '/images/premium/albercas_1.png' },
    { id: 'a2', name: 'Mantenimiento de Bombas y Filtros', description: 'Revisión técnica de sistemas de circulación y filtrado.', category: 'Albercas', image: '/images/premium/albercas_2.png' },
    { id: 'a3', name: 'Tratamiento Químico Especializado', description: 'Corrección de pH y niveles de cloro con certificación de salud.', category: 'Albercas', image: '/images/premium/albercas_3.png' },
    
    // Limpieza
    { id: 'l1', name: 'Limpieza de Salones y Áreas', description: 'Mantenimiento impecable de salones de eventos y áreas sociales con estándares de lujo caribeño.', category: 'Limpieza', image: '/images/premium/limpieza_1.png' },
    { id: 'l2', name: 'Limpieza de Elevadores', description: 'Limpieza técnica y pulido de cabinas para mantener una imagen impecable y libre de salitre.', category: 'Limpieza', image: '/images/premium/limpieza_2.png' },
    { id: 'l3', name: 'Fumigación Ambiental', description: 'Control profesional de plagas y fumigación preventiva adaptada al entorno tropical de Cancún.', category: 'Limpieza', image: '/images/premium/limpieza_3.png' },
    
    // Mantenimiento
    { id: 'm1', name: 'Electricidad y Corrosión', description: 'Mantenimiento eléctrico preventivo contra la corrosión marina y fallas por humedad.', category: 'Mantenimiento', image: '/images/premium/mantenimiento_1.png' },
    { id: 'm2', name: 'Plomería y Sarro', description: 'Optimización de presión y tratamiento de agua contra el sarro típico de Quintana Roo.', category: 'Mantenimiento', image: '/images/premium/mantenimiento_2.png' },
    { id: 'm3', name: 'Pintura y Protección UV', description: 'Protección climática de alta resistencia contra rayos UV y salitre en fachadas de lujo.', category: 'Mantenimiento', image: '/images/premium/mantenimiento_3.png' },
]

export default function PremiumServicesClient({ userName }: { userName: string }) {
    const [activeTab, setActiveTab] = useState<Service['category']>('Jardinería')
    const [selectedService, setSelectedService] = useState<Service | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const categories: { id: Service['category'], icon: any }[] = [
        { id: 'Jardinería', icon: Leaf },
        { id: 'Albercas', icon: Droplets },
        { id: 'Limpieza', icon: Trash2 },
        { id: 'Mantenimiento', icon: Hammer },
    ]

    const filteredServices = SERVICES.filter(s => s.category === activeTab)

    const handleConfirm = async () => {
        if (!selectedService) return
        
        setIsSubmitting(true)
        try {
            await preparePremiumLead({
                serviceName: selectedService.name,
                category: selectedService.category,
                userName: userName
            })
            
            setIsSuccess(true)
            setTimeout(() => {
                setIsSuccess(false)
                setSelectedService(null)
            }, 3000)
        } catch (error) {
            console.error('Error preparing lead:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                    <Sparkles size={14} />
                    <span>InmobiGo Elite</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                    Servicios <span className="text-indigo-500">Premium</span>
                </h1>
                <p className="text-zinc-400 text-lg max-w-2xl font-medium">
                    Soluciones profesionales diseñadas para maximizar el valor y la estética de tu condominio.
                </p>
            </div>

            {/* Tabs & Global Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2 p-1 bg-zinc-900/50 rounded-2xl border border-zinc-800 w-fit backdrop-blur-xl">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id)}
                            className={cn(
                                "flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                                activeTab === cat.id 
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-105" 
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                            )}
                        >
                            <cat.icon size={18} />
                            {cat.id}
                        </button>
                    ))}
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{ 
                        boxShadow: ["0px 0px 0px rgba(79, 70, 229, 0)", "0px 0px 20px rgba(79, 70, 229, 0.4)", "0px 0px 0px rgba(79, 70, 229, 0)"] 
                    }}
                    transition={{ 
                        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" } 
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl hover:from-indigo-500 hover:to-violet-500 transition-all border border-indigo-400/20 group"
                >
                    <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                    <span>Cotizar Ahora</span>
                </motion.button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="wait">
                    {filteredServices.map((service) => (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => setSelectedService(service)}
                            className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden cursor-pointer hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all duration-500 flex flex-col h-full shadow-lg hover:shadow-indigo-500/10"
                        >
                            <div className="flex-1 p-6 space-y-4">
                                <div className="p-3 bg-zinc-800 rounded-2xl w-fit group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                                    {categories.find(c => c.id === service.category)?.icon && (
                                        <div className="text-zinc-400 group-hover:text-white">
                                            {(() => {
                                                const Icon = categories.find(c => c.id === service.category)!.icon
                                                return <Icon size={24} />
                                            })()}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                                        {service.name}
                                    </h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        {service.description}
                                    </p>
                                </div>
                            </div>

                            {/* Image Section replaced Button */}
                            <div className="relative h-48 w-full overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent z-10 opacity-60" />
                                <motion.img
                                    src={service.image}
                                    alt={service.name}
                                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute bottom-4 left-6 z-20 flex items-center gap-2 text-white/90 text-xs font-bold uppercase tracking-wider backdrop-blur-md bg-white/10 px-3 py-1.5 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Sparkles size={12} className="text-indigo-400" />
                                    Ver Detalles
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Value Props */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
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

            {/* Modal */}
            <AnimatePresence>
                {selectedService && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSubmitting && setSelectedService(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 max-w-md w-full shadow-2xl overflow-hidden"
                        >
                            {!isSuccess ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                                            <MessageSquare size={24} />
                                        </div>
                                        <button 
                                            onClick={() => setSelectedService(null)}
                                            className="p-2 text-zinc-500 hover:text-white transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-black text-white">Confirmar Solicitud</h2>
                                        <p className="text-zinc-400">
                                            Estás por cotizar el servicio de <span className="text-indigo-400 font-bold whitespace-nowrap">{selectedService.name}</span>.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50 flex items-start gap-3">
                                        <div className="mt-0.5 text-amber-500">
                                            {(() => {
                                                const Icon = categories.find(c => c.id === selectedService.category)?.icon || Sparkles
                                                return <Icon size={16} />
                                            })()}
                                        </div>
                                        <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                                            Serás redirigido para cotizar este servicio. Nuestro equipo preparará una propuesta técnica personalizada para ti.
                                        </p>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            disabled={isSubmitting}
                                            onClick={() => setSelectedService(null)}
                                            className="flex-1 px-4 py-4 rounded-2xl bg-zinc-800 text-zinc-300 font-bold hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            disabled={isSubmitting}
                                            onClick={handleConfirm}
                                            className="flex-1 px-4 py-4 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                'Confirmar'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 text-center py-8">
                                    <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full mb-2">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black text-white italic uppercase tracking-tight">¡Genial!</h2>
                                        <p className="text-zinc-400 font-medium">
                                            Payload generado correctamente (Check console). Redirección preparada para n8n en el futuro.
                                        </p>
                                    </div>
                                    <div className="pt-4">
                                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: "100%" }}
                                                animate={{ width: "0%" }}
                                                transition={{ duration: 3 }}
                                                className="h-full bg-emerald-500" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

