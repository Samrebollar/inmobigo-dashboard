'use client'

import { Check, Zap, Building, Building2, Home, AlertCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function PlansContent() {
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
    const [orgStatus, setOrgStatus] = useState<any>(null)
    const [loadingStatus, setLoadingStatus] = useState(true)
    const searchParams = useSearchParams()
    const isExpired = searchParams.get('reason') === 'expired'

    useEffect(() => {
        fetch('/api/organizations/status')
            .then(res => res.json())
            .then(data => {
                setOrgStatus(data)
                setLoadingStatus(false)
            })
            .catch(() => setLoadingStatus(false))
    }, [])

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
            limit: 20,
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
            idealFor: ['Administradores pequeños', 'Privadas chicas'],
            icon: <Building2 className="h-6 w-6" />,
            highlight: false
        },
        {
            name: 'PLUS',
            limit: 60,
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
            idealFor: ['Condominios medianos', 'Plazas pequeñas'],
            icon: <Zap className="h-6 w-6" />,
            highlight: true,
            badge: 'Más popular'
        },
        {
            name: 'ELITE',
            limit: 120,
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
            idealFor: ['Administradores profesionales', 'Empresas inmobiliarias'],
            icon: <Building className="h-6 w-6" />,
            highlight: false
        },
        {
            name: 'CORPORATE',
            limit: 250,
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
            idealFor: ['Operadores grandes', 'Empresas consolidadas'],
            icon: <Building2 className="h-6 w-6" />,
            highlight: false
        },
        {
            name: 'CORPORATE PLUS',
            limit: 1000,
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
            idealFor: ['Operadores de gran escala', 'Consorcios inmobiliarios'],
            icon: <Zap className="h-6 w-6" />,
            highlight: false
        },
        {
            name: 'CORE PRUEBA',
            limit: 5,
            price: '$10',
            period: 'MXN / mes',
            color: 'cyan',
            description: 'Prueba todas las funcionalidades básicas de la plataforma.',
            features: [
                'Máximo 5 unidades',
                'Todo lo anterior',
                'Soporte 24/7 Alta Prioridad',
                'Infraestructura Dedicada',
                'Reportes Corporativos'
            ],
            idealFor: ['Operadores de gran escala', 'Consorcios inmobiliarios'],
            icon: <Zap className="h-6 w-6" />,
            highlight: false
        }
    ]

    const getColorClasses = (color: string) => {
        const colors: Record<string, any> = {
            indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', button: 'hover:!bg-indigo-600', ring: 'ring-indigo-500', shadow: 'shadow-indigo-500/20' },
            emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', button: 'hover:!bg-emerald-600', ring: 'ring-emerald-500', shadow: 'shadow-emerald-500/20' },
            purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', button: 'hover:!bg-purple-600', ring: 'ring-purple-500', shadow: 'shadow-purple-500/20' },
            rose: { text: 'text-rose-400', bg: 'bg-rose-500/10', button: 'hover:!bg-rose-600', ring: 'ring-rose-500', shadow: 'shadow-rose-500/20' },
            amber: { text: 'text-amber-500', bg: 'bg-amber-500/10', button: 'hover:!bg-amber-600', ring: 'ring-amber-500', shadow: 'shadow-amber-500/20' },
            cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', button: 'hover:!bg-cyan-600', ring: 'ring-cyan-500', shadow: 'shadow-cyan-500/20' }
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
                    Escalabilidad profesional para tu administración.
                </p>

                {isExpired && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 max-w-xl mx-auto flex items-center gap-4"
                    >
                        <AlertCircle className="text-rose-500 h-6 w-6 flex-shrink-0" />
                        <div className="text-left">
                            <p className="text-rose-200 font-bold text-sm">Tu cuenta está temporalmente bloqueada</p>
                            <p className="text-rose-200/60 text-xs">Tu suscripción ha vencido. Selecciona un plan para reactivar tu acceso inmediatamente.</p>
                        </div>
                    </motion.div>
                )}

                {orgStatus && (
                    <div className="mt-4 text-xs text-zinc-500 font-medium">
                        Uso actual: <span className="text-white font-bold">{orgStatus.unitUsage}</span> unidades creadas.
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-8 justify-center items-stretch">
                {plans.map((plan, index) => {
                    const c = getColorClasses(plan.color)
                    const isTooSmall = orgStatus && orgStatus.unitUsage > plan.limit
                    const isPreviousPlan = orgStatus && orgStatus.previousPlanName?.toUpperCase() === plan.name.toUpperCase()
                    const isRecommended = plan.highlight || isPreviousPlan

                    return (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="w-full sm:w-[320px] lg:w-[280px]"
                        >
                            <Card className={`relative overflow-hidden bg-zinc-900 border-zinc-800 h-full flex flex-col transition-all duration-500 ${isRecommended ? `ring-2 ${c.ring} ${c.shadow}` : 'hover:border-zinc-700'}`}>
                                {isPreviousPlan && (
                                    <div className="absolute top-0 right-0 z-20">
                                        <div className="bg-indigo-600 text-white text-[9px] uppercase font-black px-4 py-2 rounded-bl-xl shadow-lg tracking-widest flex items-center gap-2">
                                            <ShieldCheck size={12} />
                                            TU PLAN ANTERIOR
                                        </div>
                                    </div>
                                )}
                                
                                <CardHeader className="pb-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`p-3 rounded-2xl ${c.bg} ${c.text}`}>
                                            {plan.icon}
                                        </div>
                                        <Badge className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-widest ${isRecommended ? 'bg-indigo-600 text-white border-none' : 'bg-zinc-800 text-zinc-400'}`}>
                                            {isPreviousPlan ? 'Renovación' : (plan.badge || 'Plan')}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-xl text-white font-black tracking-tight mb-2 uppercase">{plan.name}</CardTitle>
                                    <CardDescription className="text-zinc-400 text-[11px] h-10 line-clamp-2">
                                        {plan.description}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="flex-1 flex flex-col gap-6 pt-0 px-8">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-white">{plan.price}</span>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{plan.period}</span>
                                    </div>

                                    <ul className="space-y-3">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-start gap-3 text-xs text-zinc-400">
                                                <Check className="h-4 w-4 text-zinc-600 mt-0.5" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-auto pt-8 pb-4">
                                        {isTooSmall ? (
                                            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-center">
                                                <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mb-1">Capacidad Insuficiente</p>
                                                <p className="text-[9px] text-zinc-500 leading-tight">Tienes {orgStatus.unitUsage} unidades. Este plan solo soporta {plan.limit}.</p>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleSubscribe(plan.name)}
                                                disabled={!!loadingPlan}
                                                className={`w-full font-black py-4 rounded-xl text-[10px] transition-all tracking-widest uppercase border-none text-white ${isRecommended ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 shadow-lg' : 'bg-zinc-800 hover:bg-zinc-700'} disabled:opacity-50`}
                                            >
                                                {loadingPlan === plan.name ? 'Procesando...' : `Seleccionar ${plan.name}`}
                                            </button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}

export default function PlansPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-zinc-500">Cargando planes...</div>}>
            <PlansContent />
        </Suspense>
    )
}

