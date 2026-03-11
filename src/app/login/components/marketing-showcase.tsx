'use client'

import { TrendingUp, Users, Star, ShieldCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

// Counter Component for "CountUp" effect
// Simplified Counter Component
function Counter({ value, prefix = "", suffix = "" }: { value: number, prefix?: string, suffix?: string }) {
    return (
        <span>
            <span>{prefix}</span><span>{value}</span><span>{suffix}</span>
        </span>
    )
}

const TESTIMONIALS = [
    {
        quote: "La implementación fue inmediata. Automatizamos la cobranza y en solo 2 meses recuperamos el 30% de la cartera vencida histórica.",
        author: "Carlos Méndez",
        role: "Administrador General",
        company: "Torres Del Valle",
        verified: true
    },
    {
        quote: "Gracias a la App, nuestros residentes pagan desde su celular. Eliminamos las excusas y aumentamos la recaudación un 40%.",
        author: "Sofía Ramírez",
        role: "Presidenta de Comité",
        company: "Residencial Altavista",
        verified: true
    },
    {
        quote: "El sistema de recordatorios automáticos redujo nuestra carga administrativa a la mitad. La cobranza ahora funciona en piloto automático.",
        author: "Roberto Gomez",
        role: "Gerente de Operaciones",
        company: "Grupo Inmobiliaria Norte",
        verified: true
    }
]

export function MarketingShowcase({ variant = 'login' }: { variant?: 'login' | 'register' }) {
    const [current, setCurrent] = useState(0)
    const [isHovered, setIsHovered] = useState(false)

    useEffect(() => {
        if (isHovered) return
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % TESTIMONIALS.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [isHovered])

    return (
        <div className={cn(
            "relative h-full w-full flex flex-col justify-center items-center p-12 lg:p-24 overflow-hidden",
            variant === 'register' ? "bg-zinc-950" : "bg-slate-950"
        )}>

            {/* Premium SaaS Background */}
            <div className="absolute inset-0 z-0">
                {/* Radial Gradient Base */}
                <div className={cn(
                    "absolute inset-0",
                    variant === 'register'
                        ? "bg-[radial-gradient(120%_120%_at_50%_10%,#18181b_30%,#09090b_60%,#000000_100%)]"
                        : "bg-[radial-gradient(120%_120%_at_50%_10%,#1E293B_30%,#111827_60%,#0F172A_100%)]"
                )}></div>

                {/* Glow Effects */}
                <div className={cn(
                    "absolute top-[-10%] right-[-10%] h-[600px] w-[600px] blur-[130px] rounded-full mix-blend-screen pointer-events-none",
                    variant === 'register' ? "bg-emerald-500/5" : "bg-blue-500/10"
                )}></div>
                <div className={cn(
                    "absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] blur-[130px] rounded-full mix-blend-screen pointer-events-none",
                    variant === 'register' ? "bg-teal-500/5" : "bg-indigo-500/10"
                )}></div>

                {/* Subtle Grain Texture */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div>

                {/* Tech Decor Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

                {/* Professional SaaS Light Beam */}
                <div className={cn(
                    "absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent to-transparent rotate-[15deg] blur-sm pointer-events-none",
                    variant === 'register' ? "via-emerald-500/10" : "via-indigo-500/20"
                )}></div>
                <div className={cn(
                    "absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent to-transparent rotate-[-15deg] blur-sm pointer-events-none",
                    variant === 'register' ? "via-teal-500/10" : "via-blue-500/20"
                )}></div>
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-[500px] flex flex-col items-center gap-8 translate-y-20 opacity-80 hover:opacity-100 transition-all duration-700">

                {/* Floating Stats Row - Even narrower for better proportion */}
                <div className="flex items-center gap-2 w-full max-w-[260px]">
                    {/* Stat 1: Rendimiento (Growth) */}
                    <div className="flex-1 relative group transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-500/0 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        {/* SaaS Layered Card */}
                        <div className="relative h-full backdrop-blur-2xl bg-white/[0.02] border border-white/10 rounded-xl p-2 shadow-2xl overflow-hidden group/card transition-all duration-500 hover:bg-white/[0.04] hover:border-emerald-500/30">
                            {/* Inner Glow Anchor */}
                            <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/10 blur-[25px] rounded-full -mr-6 -mt-6 opacity-50 group-hover/card:opacity-100 transition-opacity" />

                            <div className="relative flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-inner group-hover/card:scale-110 transition-transform duration-500">
                                    <TrendingUp size={12} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-400/50 mb-0.5 truncate"><span>Rendimiento</span></span>
                                    <div className="text-base font-black text-white tracking-tight flex items-baseline gap-1">
                                        <Counter value={24} prefix="+" suffix="%" />
                                    </div>
                                </div>
                            </div>

                            {/* Refined Progress Indicator */}
                            <div className="mt-2 relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500/40 via-emerald-400/80 to-emerald-500 transition-all duration-1000 relative"
                                    style={{ width: '75%' }}
                                >
                                    <div className="absolute inset-0 bg-[length:20px_20px] bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] animate-shimmer" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stat 2: Delinquency (Reduction) */}
                    <div className="flex-1 relative group transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-500/0 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        {/* SaaS Layered Card */}
                        <div className="relative h-full backdrop-blur-2xl bg-white/[0.02] border border-white/10 rounded-xl p-2 shadow-2xl overflow-hidden group/card transition-all duration-500 hover:bg-white/[0.04] hover:border-blue-500/30">
                            {/* Inner Glow Anchor */}
                            <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/10 blur-[25px] rounded-full -mr-6 -mt-6 opacity-50 group-hover/card:opacity-100 transition-opacity" />

                            <div className="relative flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-inner group-hover/card:scale-110 transition-transform duration-500">
                                    <TrendingUp size={12} className="rotate-180" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-blue-400/50 mb-0.5 truncate"><span>Morosidad</span></span>
                                    <div className="text-base font-black text-white tracking-tight flex items-baseline gap-1">
                                        <Counter value={40} prefix="-" suffix="%" />
                                    </div>
                                </div>
                            </div>

                            {/* Refined Progress Indicator */}
                            <div className="mt-2 relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500/40 via-blue-400/80 to-blue-500 transition-all duration-1000 relative"
                                    style={{ width: '60%' }}
                                >
                                    <div className="absolute inset-0 bg-[length:20px_20px] bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] animate-shimmer" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Testimonial Card */}
                <div
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="relative group w-full transition-all duration-500 hover:-translate-y-1"
                >
                    {/* SaaS Glow Shadow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 rounded-3xl -z-10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="backdrop-blur-xl bg-[#0F172A]/80 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-500 group-hover:bg-[#0F172A]/90 group-hover:border-indigo-500/30">

                        {/* Interactive Border Gradient */}
                        <div className="absolute inset-0 rounded-3xl p-[1px] bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-50 pointer-events-none"></div>

                        {/* Quote Icon */}
                        <div className="absolute top-6 left-6 opacity-30">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-white/20">
                                <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" />
                            </svg>
                        </div>

                        {/* Verified Badge */}
                        <div className="absolute top-6 right-6">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400 backdrop-blur-md">
                                <ShieldCheck size={12} />
                                <span><span>Cliente Verificado</span></span>
                            </div>
                        </div>

                        <div className="relative z-10 pt-8 mt-2">
                            <div className="flex gap-1 mb-4 justify-center sm:justify-start">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Star key={i} size={16} className="fill-amber-400 text-amber-400 drop-shadow-md" />
                                ))}
                            </div>

                            <div className="relative min-h-[100px] sm:min-h-[80px]">
                                <div className="transition-opacity duration-500">
                                    <p className="text-xl font-medium leading-relaxed text-zinc-100 text-center sm:text-left">
                                        <span>"{TESTIMONIALS[current].quote}"</span>
                                    </p>
                                </div>
                            </div>

                            <div className="h-px w-full bg-white/10 my-6" />

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 ring-4 ring-black/20 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                        {TESTIMONIALS[current].author.charAt(0)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white text-sm">
                                            <span>{TESTIMONIALS[current].author}</span>
                                        </span>
                                        <span className="text-xs text-zinc-400">
                                            <span>{TESTIMONIALS[current].role}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Carousel Dots */}
                                <div className="flex gap-1.5">
                                    {TESTIMONIALS.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrent(idx)}
                                            className={cn(
                                                "h-1.5 rounded-full transition-all duration-300",
                                                idx === current ? "w-6 bg-blue-500" : "w-1.5 bg-white/20 hover:bg-white/40"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
