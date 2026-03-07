'use client'

import { Check, Zap, Building, Building2, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'

import { useState } from 'react'

export default function PlansPage() {
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

    const handleSubscribe = async (planKey: string) => {
        setLoadingPlan(planKey)
        try {
            const res = await fetch('/api/subscriptions/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planKey }),
            })

            const data = await res.json()

            if (res.ok && data.checkoutUrl) {
                window.location.href = data.checkoutUrl
            } else {
                const errorMsg = data.message ? `${data.error}: ${data.message}` : (data.error || 'Error al iniciar suscripción');
                alert(errorMsg)
            }
        } catch (error) {
            console.error('Subscription error:', error)
            alert('Error de conexión. Intenta de nuevo.')
        } finally {
            setLoadingPlan(null)
        }
    }

    const plans = [
        {
            name: 'CORE',
            price: '$1,199',
            period: 'MXN / mes',
            color: 'indigo',
            description: 'Todo lo esencial para comenzar a digitalizar tu administración.',
            features: [
                'Hasta 20 unidades',
                'Gestión de residentes',
                'Control de pagos y adeudos',
                'Reportes básicos',
                'Soporte vía email'
            ],
            idealFor: [
                'Administradores pequeños',
                'Privadas chicas'
            ],
            icon: <Building2 className="h-6 w-6" />,
            highlight: false
        },
        {
            name: 'PLUS',
            price: '$2,499',
            period: 'MXN / mes',
            color: 'emerald',
            description: 'El plan más equilibrado para administraciones en crecimiento.',
            features: [
                '21 – 60 unidades',
                'Todas las funciones de CORE',
                'Portal de residentes avanzado',
                'Gestión de amenidades',
                'Soporte prioritario'
            ],
            idealFor: [
                'Condominios medianos',
                'Plazas pequeñas'
            ],
            icon: <Zap className="h-6 w-6" />,
            highlight: true,
            badge: 'Plan más vendido'
        },
        {
            name: 'ELITE',
            price: '$4,499',
            period: 'MXN / mes',
            color: 'purple',
            description: 'Potencia total para gestores profesionales inmobiliarios.',
            features: [
                '61 – 120 unidades',
                'Todas las funciones de PLUS',
                'API de integración',
                'Reportes financieros avanzados',
                'Account Manager dedicado'
            ],
            idealFor: [
                'Administradores profesionales',
                'Empresas inmobiliarias'
            ],
            icon: <Building className="h-6 w-6" />,
            highlight: false
        },
        {
            name: 'CORPORATE',
            price: '$6,999',
            period: 'MXN / mes',
            color: 'rose',
            description: 'Escalabilidad sin límites para operaciones corporativas.',
            features: [
                '121 – 250 unidades',
                'Funciones multi-condominio',
                'Custom branding',
                'Entrenamiento presencial'
            ],
            idealFor: [
                'Operadores grandes',
                'Empresas consolidadas'
            ],
            icon: <Building2 className="h-6 w-6" />,
            highlight: false
        },
        {
            name: 'CORPORATE PLUS',
            key: 'CORPORATE PLUS',
            price: '$9,999',
            period: 'MXN / mes',
            color: 'amber',
            description: 'Soluciones a medida para los mayores operadores inmobiliarios.',
            features: [
                'Más de 250 unidades',
                'Soporte 24/7 dedicado',
                'Integraciones a medida',
                'Infraestructura dedicada',
                'Contrato de servicio dedicado'
            ],
            idealFor: [
                'Operadores de gran escala',
                'Consorcios inmobiliarios'
            ],
            icon: <Zap className="h-6 w-6" />,
            highlight: false
        },
        {
            name: 'CORE PRUEBA',
            price: '10',
            period: 'MXN / mes',
            color: 'cyan',
            description: 'Operación de gran escala, consorcios inmobiliarios.',
            features: [
                'Más de 500 unidades',
                'Todo lo anterior',
                'Soporte 24/7 Alta Prioridad',
                'Infraestructura Dedicada',
                'Reportes Corporativos'
            ],
            idealFor: [
                'Operadores de gran escala',
                'Consorcios inmobiliarios'
            ],
            icon: <Zap className="h-6 w-6" />,
            highlight: false
        }
    ]

    const getColorClasses = (color: string, isHighlighted: boolean) => {
        const colors: Record<string, any> = {
            indigo: {
                border: 'hover:border-indigo-500/50',
                glow: 'shadow-indigo-500/10',
                text: 'text-indigo-400',
                bg: 'bg-indigo-500/10',
                button: 'hover:!bg-indigo-600',
                badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
                bullet: 'bg-indigo-500',
                ring: 'ring-indigo-500 hover:ring-indigo-400',
                shadow: 'shadow-[0_0_50px_-12px_rgba(99,102,241,0.4)] hover:shadow-[0_0_60px_-10px_rgba(99,102,241,0.6)]',
                buttonBg: 'bg-zinc-800'
            },
            emerald: {
                border: 'hover:border-emerald-500/50',
                glow: 'shadow-emerald-500/20',
                text: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                button: 'hover:!bg-emerald-500',
                badge: 'bg-emerald-600 text-white border-none',
                bullet: 'bg-emerald-500',
                ring: 'ring-emerald-500 hover:ring-emerald-400',
                shadow: 'shadow-[0_0_50px_-12px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_-10px_rgba(16,185,129,0.7)]',
                buttonBg: 'bg-emerald-600'
            },
            purple: {
                border: 'hover:border-purple-500/50',
                glow: 'shadow-purple-500/10',
                text: 'text-purple-400',
                bg: 'bg-purple-500/10',
                button: 'hover:!bg-purple-600',
                badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                bullet: 'bg-purple-500',
                ring: 'ring-purple-500 hover:ring-purple-400',
                shadow: 'shadow-[0_0_50px_-12px_rgba(168,85,247,0.4)] hover:shadow-[0_0_60px_-10px_rgba(168,85,247,0.6)]',
                buttonBg: 'bg-zinc-800'
            },
            rose: {
                border: 'hover:border-rose-500/50',
                glow: 'shadow-rose-500/10',
                text: 'text-rose-400',
                bg: 'bg-rose-500/10',
                button: 'hover:!bg-rose-600',
                badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                bullet: 'bg-rose-500',
                ring: 'ring-rose-500 hover:ring-rose-400',
                shadow: 'shadow-[0_0_50px_-12px_rgba(244,63,94,0.4)] hover:shadow-[0_0_60px_-10px_rgba(244,63,94,0.6)]',
                buttonBg: 'bg-zinc-800'
            },
            amber: {
                border: 'hover:border-amber-500/50',
                glow: 'shadow-amber-500/10',
                text: 'text-amber-500',
                bg: 'bg-amber-500/10',
                button: 'hover:!bg-amber-600',
                badge: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
                bullet: 'bg-amber-500',
                ring: 'ring-amber-500 hover:ring-amber-400',
                shadow: 'shadow-[0_0_50px_-12px_rgba(245,158,11,0.4)] hover:shadow-[0_0_60px_-10px_rgba(245,158,11,0.6)]',
                buttonBg: 'bg-zinc-800'
            },
            cyan: {
                border: 'hover:border-cyan-500/50',
                glow: 'shadow-cyan-500/10',
                text: 'text-cyan-400',
                bg: 'bg-cyan-500/10',
                button: 'hover:!bg-cyan-600',
                badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
                bullet: 'bg-cyan-500',
                ring: 'ring-cyan-500 hover:ring-cyan-400',
                shadow: 'shadow-[0_0_50px_-12px_rgba(6,182,212,0.4)] hover:shadow-[0_0_60px_-10px_rgba(6,182,212,0.6)]',
                buttonBg: 'bg-zinc-800'
            }
        }
        return colors[color] || colors.indigo
    }

    return (
        <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="text-center mb-16">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-black tracking-tighter text-white sm:text-6xl"
                >
                    Planes y Suscripciones
                </motion.h1>
                <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    Escalabilidad profesional para tu administración. Desde comunidades locales hasta consorcios internacionales.
                </p>
            </div>

            <div className="flex flex-wrap gap-8 justify-center items-stretch">
                {plans.map((plan, index) => {
                    const c = getColorClasses(plan.color, plan.highlight)
                    return (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, type: 'spring', stiffness: 100 }}
                            whileHover={{ y: -12, transition: { duration: 0.3 } }}
                            className="w-full sm:w-[320px] lg:w-[280px] xl:w-[260px] 2xl:w-[290px]"
                        >
                            <Card className={`relative overflow-hidden bg-zinc-900 border-zinc-800 h-full flex flex-col transition-all duration-500 ${plan.highlight ? `ring-2 ${c.ring} ${c.shadow}` : `hover:shadow-3xl hover:bg-zinc-900/80 ${c.glow} ${c.border}`}`}>
                                {plan.highlight && (
                                    <div className="absolute top-0 right-0 z-20">
                                        <div className={`bg-${plan.color}-600 text-white text-[9px] uppercase font-black px-4 py-2 rounded-bl-xl shadow-lg tracking-[0.2em]`}>
                                            RECOMENDADO
                                        </div>
                                    </div>
                                )}
                                <CardHeader className="pb-6 relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <motion.div
                                            whileHover={{ rotate: 10, scale: 1.1 }}
                                            className={`p-3 rounded-2xl border transition-all duration-300 ${plan.highlight ? `bg-${plan.color}-500/20 border-${plan.color}-500/30` : `${c.bg} border-transparent`}`}
                                        >
                                            <div className={`${c.text}`}>
                                                {plan.icon}
                                            </div>
                                        </motion.div>
                                        <Badge className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-widest ${plan.highlight ? `bg-gradient-to-br from-${plan.color}-600 to-indigo-600 text-white border-none shadow-lg` : c.badge}`}>
                                            {plan.badge || 'PLAN'}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-xl text-white font-black tracking-tight mb-2 uppercase">{plan.name}</CardTitle>
                                    <CardDescription className="text-zinc-400 text-[11px] leading-relaxed line-clamp-2 h-10">
                                        {plan.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col gap-8 pt-0 relative z-10 px-8">
                                    <div className="flex flex-col gap-0.5 py-1">
                                        <div className="flex items-baseline gap-1">
                                            <>
                                                <span className="text-3xl font-black text-white tracking-tight">{plan.price}</span>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${c.text}`}>{plan.period}</span>
                                            </>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em] mb-4">
                                            Ideal para
                                        </p>
                                        <ul className="space-y-2">
                                            {plan.idealFor.map((item) => (
                                                <li key={item} className="flex items-center gap-3 text-xs text-zinc-300 font-bold">
                                                    <div className={`h-1.5 w-1.5 rounded-full ${c.bullet} shadow-sm`} />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-zinc-800/80">
                                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.25em] mb-4">
                                            Características
                                        </p>
                                        <ul className="space-y-3">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-3.5 text-xs text-zinc-400 font-medium">
                                                    <div className={`mt-0.5 rounded-full p-1 transition-colors duration-300 ${plan.highlight ? `bg-${plan.color}-500/20` : 'bg-zinc-800/80'}`}>
                                                        <Check className={`h-3 w-3 ${plan.highlight ? c.text : 'text-zinc-500'}`} />
                                                    </div>
                                                    <span className="leading-tight">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="mt-auto pt-10 pb-4">
                                        <motion.div
                                            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <button
                                                onClick={() => handleSubscribe(plan.name)}
                                                disabled={!!loadingPlan}
                                                className={`w-full font-black py-5 rounded-md text-[10px] transition-all duration-300 shadow-xl tracking-widest uppercase border-none text-white ${c.buttonBg} ${c.button} hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {loadingPlan === plan.name ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        CREANDO SUSCRIPCIÓN...
                                                    </span>
                                                ) : (
                                                    `SELECCIONAR ${plan.name}`
                                                )}
                                            </button>
                                        </motion.div>
                                        <p className="text-center text-[9px] text-zinc-700 mt-4 font-black uppercase tracking-[0.2em]">
                                            CANCELA EN CUALQUIER MOMENTO
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )
                })}
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-24 text-center pb-12"
            >
                <div className="inline-flex flex-col md:flex-row items-center gap-6 px-10 py-6 rounded-3xl bg-zinc-900 border border-zinc-800/80 shadow-2xl backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-violet-500/20 border border-violet-500/30">
                            <Zap className="h-6 w-6 text-violet-500 animate-pulse" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-white font-black text-sm tracking-tight">OPERACIONES A ESCALA GLOBAL</h3>
                            <p className="text-zinc-500 text-[11px] font-medium">Personalización total para consorcios e infraestructura dedicada.</p>
                        </div>
                    </div>
                    <div className="h-px w-full md:h-10 md:w-px bg-zinc-800" />
                    <button className="text-emerald-400 font-black text-xs uppercase tracking-widest hover:text-white hover:underline transition-all underline-offset-8">
                        HABLAR CON UN EXPERTO →
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
