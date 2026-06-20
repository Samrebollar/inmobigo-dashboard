'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    BookOpen, 
    Gift, 
    Award, 
    Share2, 
    Copy, 
    Check, 
    Clock, 
    Play, 
    DollarSign, 
    AlertCircle, 
    Calendar, 
    Trophy,
    Users,
    ChevronRight,
    PlayCircle,
    Info,
    MessageCircle,
    CheckCircle,
    Sparkles,
    UserCheck,
    Plus,
    X,
    Lock
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
    updateTrainingProgressAction, 
    createReferralAction, 
    simulateReferralStatusAction 
} from '@/app/actions/benefit-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Category {
    id: string
    name: string
    description: string
    icon: string
    sort_order: number
}

interface Training {
    id: string
    category_id: string
    title: string
    description: string
    thumbnail_url: string
    duration_minutes: number
    difficulty: string
    content_url: string
    is_featured: boolean
}

interface Progress {
    training_id: string
    progress: number
    completed: boolean
    completed_at?: string | null
}

interface ReferralCode {
    id: string
    code: string
    total_referrals: number
    total_rewards: number
}

interface Referral {
    id: string
    referred_name: string
    referred_email: string
    referred_phone?: string | null
    status: 'registered' | 'trial' | 'active_plan' | 'reward_pending' | 'reward_paid' | 'cancelled'
    reward_amount: number
    reward_paid: boolean
    reward_paid_at?: string | null
    created_at: string
}

interface TopReferrer {
    organization_id: string
    name: string
    count: number
    amount: number
}

interface DetailedStats {
    totalReferrals: number
    activePlans: number
    totalEarned: number
    totalPaid: number
    totalPending: number
    topReferrers: TopReferrer[]
}

interface BeneficiosClientProps {
    admin: any
    initialData: {
        categories: Category[]
        trainings: Training[]
        progress: Progress[]
        referralCode: ReferralCode
        referrals: Referral[]
    }
    detailedStats: DetailedStats
}

type TabType = 'training' | 'referrals'

export function BeneficiosClient({ admin, initialData, detailedStats }: BeneficiosClientProps) {
    const [activeTab, setActiveTab] = useState<TabType>('training')
    
    // Core Data States
    const [categories] = useState<Category[]>(initialData.categories)
    const [trainings] = useState<Training[]>(initialData.trainings)
    const [progressList, setProgressList] = useState<Progress[]>(initialData.progress)
    const [referralCode] = useState<ReferralCode>(initialData.referralCode)
    const [referrals, setReferrals] = useState<Referral[]>(initialData.referrals)
    
    // Filter State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
    
    // UI Modal States
    const [selectedTraining, setSelectedTraining] = useState<Training | null>(null)
    const [selectedLearnCard, setSelectedLearnCard] = useState<Training | null>(null)
    const [loadingProgressId, setLoadingProgressId] = useState<string | null>(null)
    const [showReferralModal, setShowReferralModal] = useState(false)
    const [submittingReferral, setSubmittingReferral] = useState(false)

    // Learning Objectives per training (matched by title keywords)
    const learningObjectivesMap: Record<string, string[]> = {
        'Fundamentos del Régimen de Propiedad en Condominio': [
            'Qué es el régimen de propiedad en condominio.',
            'Derechos y obligaciones de los propietarios.',
            'Facultades y responsabilidades del administrador.',
            'Qué puede y qué no puede hacer el comité.',
            'Cómo aplicar el reglamento interno.',
        ],
        'Cómo Realizar una Asamblea por Primera Vez': [
            'Cuándo debe convocarse una asamblea.',
            'Cómo elaborar la convocatoria.',
            'Qué información debe contener.',
            'Cómo verificar el quórum.',
            'Cómo realizar las votaciones.',
            'Cómo elaborar el acta de asamblea.',
            'Qué documentos deben conservarse.',
        ],
        'Constitución de una Asociación Civil para Condominios': [
            'Qué es una Asociación Civil.',
            'Cuándo conviene constituirla.',
            'Requisitos legales básicos.',
            'Elaboración del acta constitutiva.',
            'Obtención del RFC.',
            'Obligaciones fiscales y administrativas.',
            'Manejo de cuentas bancarias.',
        ],
    }
    
    // Form States
    const [refName, setRefName] = useState('')
    const [refEmail, setRefEmail] = useState('')
    const [refPhone, setRefPhone] = useState('')

    // Copy to clipboard helper
    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(referralCode.code)
            toast.success('¡Código copiado al portapapeles!')
        } catch (err) {
            toast.error('No se pudo copiar el código')
        }
    }

    // WhatsApp Share helper
    const handleShareWhatsApp = () => {
        const refLink = `https://app.inmobigo.mx/registro?ref=${referralCode.code}`
        const message = encodeURIComponent(
            `¡Hola! Te recomiendo InmobiGo para administrar tu condominio de forma profesional.\n\n` +
            `Regístrate con mi código y obtén beneficios exclusivos:\n` +
            `👉 ${refLink}\n\n` +
            `O usa mi código al registrarte: *${referralCode.code}*`
        )
        window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank')
    }

    // Fetch progress map for convenience
    const progressMap = React.useMemo(() => {
        return progressList.reduce((acc: Record<string, Progress>, pr) => {
            acc[pr.training_id] = pr
            return acc
        }, {})
    }, [progressList])

    // Filter trainings by category
    const filteredTrainings = trainings.filter(t => {
        if (selectedCategoryId === 'all') return true
        return t.category_id === selectedCategoryId
    })

    // Handle course completions
    const handleCompleteTraining = async (trainingId: string) => {
        if (!admin?.organization_id) return
        
        try {
            setLoadingProgressId(trainingId)
            const isCompleted = progressMap[trainingId]?.completed || false
            
            const payload = {
                training_id: trainingId,
                organization_id: admin.organization_id,
                progress: isCompleted ? 0 : 100,
                completed: !isCompleted
            }

            const result = await updateTrainingProgressAction(payload)
            if (!result.success) throw new Error(result.error)

            // Update state
            setProgressList(prev => {
                const existing = prev.find(p => p.training_id === trainingId)
                if (existing) {
                    return prev.map(p => p.training_id === trainingId ? { ...p, progress: payload.progress, completed: payload.completed } : p)
                } else {
                    return [...prev, { training_id: trainingId, progress: payload.progress, completed: payload.completed }]
                }
            })

            toast.success(payload.completed ? '🎉 ¡Capacitación completada con éxito!' : 'Progreso restablecido.')
            
            // Update selected training progress for modal
            if (selectedTraining && selectedTraining.id === trainingId) {
                // Keep modal open but let UI update
            }
        } catch (error: any) {
            console.error(error)
            toast.error('No se pudo actualizar el progreso: ' + error.message)
        } finally {
            setLoadingProgressId(null)
        }
    }

    // Register manual referral
    const handleRegisterReferral = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!refName || !refEmail) {
            toast.error('Por favor completa el nombre y correo electrónico')
            return
        }

        try {
            setSubmittingReferral(true)
            const result = await createReferralAction({
                organization_id: admin.organization_id,
                referral_code_id: referralCode.id,
                referrer_organization_id: admin.organization_id,
                referred_name: refName,
                referred_email: refEmail,
                referred_phone: refPhone
            })

            if (!result.success) throw new Error(result.error)

            toast.success('¡Referido registrado correctamente! Se ha enviado una invitación.')
            setReferrals([result.data, ...referrals])
            
            // Reset Form & Close Modal
            setRefName('')
            setRefEmail('')
            setRefPhone('')
            setShowReferralModal(false)
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Error al registrar referido')
        } finally {
            setSubmittingReferral(false)
        }
    }

    // Simulate referral conversion for demo/testing
    const handleSimulateStatus = async (referralId: string, status: 'trial' | 'active_plan' | 'reward_paid') => {
        try {
            const result = await simulateReferralStatusAction(referralId, status)
            if (!result.success) throw new Error(result.error)
            
            toast.success(`Simulación exitosa: Referido actualizado a "${status}"`)
            
            // Reload referrals locally
            setReferrals(prev => prev.map(r => r.id === referralId ? { 
                ...r, 
                status, 
                reward_paid: status === 'reward_paid',
                reward_paid_at: status === 'reward_paid' ? new Date().toISOString() : null
            } : r))
        } catch (error: any) {
            console.error(error)
            toast.error('Simulación fallida: ' + error.message)
        }
    }

    // Gamified progress Calculations
    const activeReferralsCount = referrals.filter(r => ['active_plan', 'reward_pending', 'reward_paid'].includes(r.status)).length
    const nextGoal = activeReferralsCount < 5 ? 5 : activeReferralsCount < 10 ? 10 : activeReferralsCount + 5
    const progressPercent = Math.min((activeReferralsCount / nextGoal) * 100, 100)
    const bonusAmount = nextGoal === 5 ? 2000 : nextGoal === 10 ? 5000 : 10000

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'registered':
                return <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">Registrado</Badge>
            case 'trial':
                return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/25">Prueba Activa</Badge>
            case 'active_plan':
                return <Badge className="bg-emerald-500/10 text-emerald-450 border-emerald-500/25">Plan Activo</Badge>
            case 'reward_pending':
                return <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/25">Premio Pendiente</Badge>
            case 'reward_paid':
                return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/25">Premio Pagado</Badge>
            case 'cancelled':
                return <Badge className="bg-rose-500/10 text-rose-450 border-rose-500/25">Cancelado</Badge>
            default:
                return <Badge className="bg-zinc-800 text-zinc-500">Desconocido</Badge>
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-white via-zinc-400 to-zinc-500 bg-clip-text text-transparent">
                    🎁 Beneficios para Administradores
                </h1>
                <p className="text-zinc-500 text-sm md:text-base max-w-2xl font-medium">
                    Aprende, crece profesionalmente y obtén recompensas exclusivas por ser parte de InmobiGo.
                </p>
            </div>

            {/* Horizontal Tabs */}
            <div className="flex justify-center">
                <div className="flex p-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl w-fit backdrop-blur-xl">
                    <button
                        onClick={() => setActiveTab('training')}
                        className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeTab === 'training' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        {activeTab === 'training' && (
                            <motion.div
                                layoutId="active-benefit-tab"
                                className="absolute inset-0 bg-zinc-800 rounded-xl shadow-inner"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <BookOpen size={18} className={`relative z-10 ${activeTab === 'training' ? 'text-indigo-400' : ''}`} />
                        <span className="relative z-10">📚 Capacitación</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('referrals')}
                        className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeTab === 'referrals' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        {activeTab === 'referrals' && (
                            <motion.div
                                layoutId="active-benefit-tab"
                                className="absolute inset-0 bg-zinc-800 rounded-xl shadow-inner"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <DollarSign size={18} className={`relative z-10 ${activeTab === 'referrals' ? 'text-emerald-400' : ''}`} />
                        <span className="relative z-10">💰 Recomienda y Gana</span>
                    </button>
                </div>
            </div>

            {/* Dynamic Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* TAB: CAPACITACION */}
                    {activeTab === 'training' && (
                        <div className="space-y-6">
                            <div className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-[2rem] backdrop-blur-md text-center">
                                <h2 className="text-2xl font-bold text-white mb-2">Centro de Capacitación InmobiGo</h2>
                                <p className="text-zinc-400 text-sm max-w-2xl mx-auto leading-relaxed">
                                    En InmobiGo creemos que una mejor administración comienza con el conocimiento. Aquí encontrarás capacitaciones diseñadas para ayudarte a administrar condominios de forma profesional, organizada y transparente.
                                </p>
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex flex-wrap gap-2 pb-2">
                                <button
                                    onClick={() => setSelectedCategoryId('all')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                        selectedCategoryId === 'all' 
                                            ? 'bg-zinc-800 text-white border-zinc-700 shadow-md' 
                                            : 'text-zinc-450 hover:text-white border-transparent hover:bg-zinc-900/40'
                                    }`}
                                >
                                    Todas
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                            selectedCategoryId === cat.id 
                                                ? 'bg-zinc-800 text-white border-zinc-700 shadow-md' 
                                                : 'text-zinc-450 hover:text-white border-transparent hover:bg-zinc-900/40'
                                        }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {/* Training Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredTrainings.map((tr, idx) => {
                                    const categoryName = categories.find(c => c.id === tr.category_id)?.name || 'General'
                                    const prog = progressMap[tr.id]?.progress || 0
                                    const isDone = progressMap[tr.id]?.completed || false
                                    
                                    return (
                                        <motion.div
                                            key={tr.id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <Card
                                                onClick={() => setSelectedLearnCard(tr)}
                                                className="bg-zinc-900/35 border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-gradient-to-br hover:from-zinc-900/50 hover:to-indigo-950/10 transition-all duration-500 group overflow-hidden h-full flex flex-col justify-between rounded-3xl hover:-translate-y-2 hover:shadow-[0_24px_48px_-12px_rgba(99,102,241,0.2)] cursor-pointer"
                                            >
                                                {/* Clean image — no overlays */}
                                                <div className="relative w-full h-48 rounded-t-2xl overflow-hidden bg-black/40">
                                                    <img 
                                                        src={tr.thumbnail_url} 
                                                        alt={tr.title} 
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                        onError={(e) => {
                                                            (e.target as any).src = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80'
                                                        }}
                                                    />
                                                    {/* Subtle gradient only at bottom for title legibility */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 via-transparent to-transparent" />
                                                    {/* Hover CTA overlay */}
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-indigo-950/40 backdrop-blur-[2px]">
                                                        <div className="flex items-center gap-2 bg-white/10 border border-white/20 px-5 py-2.5 rounded-full text-white text-sm font-bold backdrop-blur-md shadow-xl">
                                                            <BookOpen size={16} />
                                                            Ver temario
                                                        </div>
                                                    </div>
                                                </div>

                                                <CardContent className="p-6 pt-5 flex-1 flex flex-col justify-between space-y-4">
                                                    <div className="space-y-2">
                                                        <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                                                            {tr.title}
                                                        </h3>
                                                        <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">
                                                            {tr.description}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-4">
                                                        {/* Duration & Category */}
                                                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-t border-zinc-800/60 pt-3.5">
                                                            <span className="flex items-center gap-1.5 text-zinc-400"><Clock size={12} /> {tr.duration_minutes} MIN</span>
                                                            <span className="text-indigo-400/90 font-black tracking-wider truncate max-w-[160px] text-right">{categoryName}</span>
                                                        </div>

                                                        {/* Próximamente button (disabled) */}
                                                        <button
                                                            disabled
                                                            onClick={e => e.stopPropagation()}
                                                            className="w-full h-11 bg-zinc-900/60 border border-zinc-800 text-zinc-500 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed opacity-55"
                                                        >
                                                            ⏳ Próximamente
                                                        </button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB: REFERIDOS */}
                    {activeTab === 'referrals' && (
                        <div className="space-y-8">
                            <div className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-[2rem] backdrop-blur-md text-center">
                                <h2 className="text-2xl font-bold text-white mb-3">Recomienda InmobiGo y Gana Dinero</h2>
                                <p className="text-zinc-400 text-sm max-w-2xl mx-auto leading-relaxed">
                                    Invita a otros administradores a utilizar InmobiGo y recibe una recompensa de{' '}
                                    <span className="inline-flex items-center gap-1 font-black text-emerald-400 text-base tracking-tight">
                                        $1,000 MXN
                                    </span>
                                    {' '}por cada nuevo cliente que contrate y active un plan.
                                </p>
                            </div>

                            {/* 5 KPIs Panel */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="p-5 bg-zinc-900/35 border border-zinc-800 rounded-2xl flex flex-col justify-between">
                                    <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider">Referidos Totales</p>
                                    <p className="text-3xl font-black text-white mt-2">{detailedStats.totalReferrals}</p>
                                </div>
                                <div className="p-5 bg-zinc-900/35 border border-zinc-800 rounded-2xl flex flex-col justify-between">
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Planes Activos</p>
                                    <p className="text-3xl font-black text-white mt-2">{detailedStats.activePlans}</p>
                                </div>
                                <div className="p-5 bg-zinc-900/35 border border-zinc-800 rounded-2xl flex flex-col justify-between">
                                    <p className="text-[10px] text-emerald-450 font-bold uppercase tracking-wider">Ganancias Generadas</p>
                                    <p className="text-3xl font-black text-emerald-450 mt-2">${detailedStats.totalEarned.toLocaleString('es-MX')} MXN</p>
                                </div>
                                <div className="p-5 bg-zinc-900/35 border border-zinc-800 rounded-2xl flex flex-col justify-between">
                                    <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Pagos Recibidos</p>
                                    <p className="text-3xl font-black text-purple-400 mt-2">${detailedStats.totalPaid.toLocaleString('es-MX')} MXN</p>
                                </div>
                                <div className="p-5 bg-zinc-900/35 border border-zinc-800 rounded-2xl flex flex-col justify-between col-span-2 md:col-span-1">
                                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Pagos Pendientes</p>
                                    <p className="text-3xl font-black text-amber-400 mt-2">${detailedStats.totalPending.toLocaleString('es-MX')} MXN</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left/Main Sections (Code, Referrals) */}
                                <div className="lg:col-span-2 space-y-8">
                                    
                                    {/* SECTION: MI CODIGO */}
                                    <div className="relative group">
                                        <div className="absolute -inset-[1px] rounded-[2.2rem] bg-gradient-to-r from-emerald-500 to-indigo-600 opacity-15 blur-lg" />
                                        <div className="relative p-7 bg-zinc-950/80 border border-zinc-800/80 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="space-y-1.5 text-center md:text-left">
                                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center justify-center md:justify-start gap-1.5">
                                                    <Sparkles size={11} className="text-emerald-450" /> Mi código único
                                                </span>
                                                <h3 className="text-3xl font-black tracking-wider text-white font-mono uppercase bg-zinc-900/80 px-5 py-2.5 rounded-2xl border border-zinc-800">
                                                    {referralCode.code}
                                                </h3>
                                            </div>

                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    onClick={handleCopyCode}
                                                    className="h-12 px-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 shadow-md cursor-pointer"
                                                >
                                                    <Copy size={14} /> Copiar Código
                                                </button>
                                                <button
                                                    onClick={handleShareWhatsApp}
                                                    className="h-12 px-6 bg-[#25D366] hover:bg-[#20ba58] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-emerald-900/20 cursor-pointer"
                                                >
                                                    {/* Official WhatsApp icon */}
                                                    <svg viewBox="0 0 32 32" width="18" height="18" fill="white" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M16.003 3C9.374 3 4 8.373 4 15.003c0 2.15.576 4.17 1.58 5.915L4 29l8.287-1.553A11.95 11.95 0 0016.003 28C22.63 28 28 22.627 28 16.003 28 9.374 22.631 3 16.003 3zm0 21.857a9.842 9.842 0 01-5.02-1.374l-.36-.213-3.73.979.997-3.636-.235-.374A9.838 9.838 0 016.143 15c0-5.439 4.423-9.857 9.86-9.857 5.438 0 9.857 4.418 9.857 9.857 0 5.44-4.42 9.857-9.857 9.857zm5.405-7.377c-.296-.148-1.75-.864-2.022-.962-.271-.1-.469-.148-.667.148-.197.296-.766.963-.94 1.16-.172.198-.345.222-.641.074-.296-.148-1.25-.46-2.38-1.468-.88-.784-1.474-1.752-1.647-2.048-.172-.297-.018-.457.13-.605.133-.133.296-.346.444-.52.149-.172.198-.296.297-.493.099-.198.05-.371-.025-.52-.074-.148-.667-1.606-.913-2.2-.24-.578-.485-.499-.667-.509l-.568-.01c-.198 0-.52.074-.792.37s-1.04 1.016-1.04 2.477c0 1.461 1.065 2.874 1.213 3.072.149.197 2.096 3.202 5.08 4.49.71.307 1.264.49 1.696.627.712.226 1.361.194 1.874.118.571-.085 1.75-.716 1.996-1.407.247-.69.247-1.283.173-1.407-.074-.124-.272-.198-.568-.346z"/>
                                                    </svg>
                                                    Compartir WhatsApp
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION: MIS REFERIDOS */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                                <Users size={18} className="text-indigo-400" /> Mis Referidos
                                            </h3>
                                            <button
                                                onClick={() => setShowReferralModal(true)}
                                                className="h-10 px-4 bg-indigo-600/10 hover:bg-indigo-650 text-indigo-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider border border-indigo-500/20 hover:border-indigo-500 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                                            >
                                                <Plus size={14} /> Registrar Referido
                                            </button>
                                        </div>

                                        {/* Table of Referrals */}
                                        {referrals.length === 0 ? (
                                            <div className="p-16 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10 text-center flex flex-col items-center">
                                                <Users size={40} className="text-zinc-700 mb-3" />
                                                <p className="text-zinc-500 text-sm font-bold">Aún no has registrado referidos.</p>
                                                <p className="text-zinc-600 text-xs mt-1 max-w-xs">¡Comparte tu código con otros administradores para empezar a ganar!</p>
                                            </div>
                                        ) : (
                                            <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full border-collapse text-left">
                                                        <thead>
                                                            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                                <th className="p-4">Administrador</th>
                                                                <th className="p-4">Estado</th>
                                                                <th className="p-4">Fecha</th>
                                                                <th className="p-4">Recompensa</th>
                                                                <th className="p-4 text-center">Acciones Demo</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-800/60 text-xs">
                                                            {referrals.map((ref) => {
                                                                // Calculate reward column
                                                                const isEligible = ['active_plan', 'reward_pending', 'reward_paid'].includes(ref.status)
                                                                const rewardText = isEligible ? '$1,000.00' : '$0.00'
                                                                
                                                                return (
                                                                    <tr key={ref.id} className="hover:bg-zinc-900/10 transition-colors">
                                                                        <td className="p-4">
                                                                            <p className="font-bold text-white">{ref.referred_name}</p>
                                                                            <p className="text-[10px] text-zinc-500">{ref.referred_email}</p>
                                                                        </td>
                                                                        <td className="p-4">
                                                                            {getStatusBadge(ref.status)}
                                                                        </td>
                                                                        <td className="p-4 text-zinc-450 font-medium">
                                                                            {format(new Date(ref.created_at), 'd MMM, yyyy', { locale: es })}
                                                                        </td>
                                                                        <td className={`p-4 font-bold ${isEligible ? 'text-emerald-450' : 'text-zinc-500'}`}>
                                                                            {rewardText}
                                                                        </td>
                                                                        <td className="p-4 text-center">
                                                                            {/* Demo actions to update state and test */}
                                                                            <div className="flex items-center justify-center gap-1.5">
                                                                                {ref.status === 'registered' && (
                                                                                    <button 
                                                                                        onClick={() => handleSimulateStatus(ref.id, 'trial')}
                                                                                        className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-md text-[9px] font-black uppercase tracking-wider transition-all"
                                                                                        title="Simular conversión a periodo de prueba"
                                                                                    >
                                                                                        Activar Prueba
                                                                                    </button>
                                                                                )}
                                                                                {ref.status === 'trial' && (
                                                                                    <button 
                                                                                        onClick={() => handleSimulateStatus(ref.id, 'active_plan')}
                                                                                        className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 border border-emerald-500/20 rounded-md text-[9px] font-black uppercase tracking-wider transition-all"
                                                                                        title="Simular adquisición de plan de pago"
                                                                                    >
                                                                                        Contratar Plan
                                                                                    </button>
                                                                                )}
                                                                                {ref.status === 'active_plan' && (
                                                                                    <button 
                                                                                        onClick={() => handleSimulateStatus(ref.id, 'reward_paid')}
                                                                                        className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-md text-[9px] font-black uppercase tracking-wider transition-all"
                                                                                        title="Simular pago del bono"
                                                                                    >
                                                                                        Marcar Pagado
                                                                                    </button>
                                                                                )}
                                                                                {ref.status === 'reward_paid' && (
                                                                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle size={10} className="text-purple-400" /> Pagado</span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* SECTION: RANKING DE EMBAJADORES */}
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                            <Trophy size={18} className="text-amber-400" /> Ranking de Embajadores
                                        </h3>
                                        
                                        <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse text-left">
                                                    <thead>
                                                        <tr className="border-b border-zinc-800 bg-zinc-900/50 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                            <th className="p-4 w-16 text-center">Puesto</th>
                                                            <th className="p-4">Administrador</th>
                                                            <th className="p-4 text-center">Referidos Activos</th>
                                                            <th className="p-4 text-right">Premios Ganados</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-800/60 text-xs">
                                                        {detailedStats.topReferrers.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={4} className="p-8 text-center text-zinc-500 font-medium">
                                                                    No hay datos de embajadores disponibles aún.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            detailedStats.topReferrers.map((referrer, index) => {
                                                                const isCurrentUser = referrer.organization_id === admin.organization_id
                                                                const position = index + 1
                                                                
                                                                let medal = ''
                                                                if (position === 1) medal = '🥇'
                                                                else if (position === 2) medal = '🥈'
                                                                else if (position === 3) medal = '🥉'
                                                                else medal = `#${position}`

                                                                return (
                                                                    <tr 
                                                                        key={referrer.organization_id} 
                                                                        className={`transition-colors ${
                                                                            isCurrentUser 
                                                                                ? 'bg-indigo-500/10 hover:bg-indigo-500/15 border-l-2 border-indigo-550' 
                                                                                : 'hover:bg-zinc-900/10'
                                                                        }`}
                                                                    >
                                                                        <td className="p-4 text-center font-bold text-sm">
                                                                            {medal}
                                                                        </td>
                                                                        <td className="p-4">
                                                                            <span className={`font-bold ${isCurrentUser ? 'text-indigo-400' : 'text-white'}`}>
                                                                                {referrer.name} {isCurrentUser && '(Tú)'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-4 text-center font-bold text-white">
                                                                            {referrer.count}
                                                                        </td>
                                                                        <td className="p-4 text-right font-bold text-emerald-450">
                                                                            ${referrer.amount.toLocaleString('es-MX')} MXN
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right sidebar (KPI counters, how it works, next goal) */}
                                <div className="space-y-8">
                                    {/* KPI Stats Cards */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Recom. Activas</p>
                                            <p className="text-2xl font-black text-white mt-1">{activeReferralsCount}</p>
                                        </div>
                                        <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Ganancias Acum.</p>
                                            <p className="text-2xl font-black text-emerald-450 mt-1">
                                                ${(activeReferralsCount * 1000).toLocaleString('es-MX')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* SECTION: PRÓXIMA META */}
                                    <Card className="bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-purple-950/10 border-zinc-800 overflow-hidden relative group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl rounded-full" />
                                        <CardContent className="p-6 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-purple-500/10 text-purple-400 flex items-center justify-center rounded-xl">
                                                    <Trophy size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white tracking-tight">Próxima Meta</h4>
                                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Gamificación de metas</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-semibold text-zinc-300">
                                                    <span>Progreso ({activeReferralsCount} / {nextGoal})</span>
                                                    <span className="text-purple-400 font-bold">+{nextGoal} Activos</span>
                                                </div>
                                                
                                                {/* Progress Bar */}
                                                <div className="w-full h-2 bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-700 shadow-[0_0_10px_rgba(147,51,234,0.3)]"
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-zinc-500 leading-relaxed">
                                                    ¡Consigue {nextGoal - activeReferralsCount} más para desbloquear un **Bono extra de ${bonusAmount.toLocaleString('es-MX')} MXN**!
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* SECTION: ¿CÓMO FUNCIONA? */}
                                    <div className="p-6 bg-zinc-900/30 border border-zinc-800/80 rounded-[2rem] space-y-5">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                            <Info size={14} className="text-indigo-400" /> ¿Cómo funciona?
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="flex gap-3">
                                                <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">Comparte tu código</p>
                                                    <p className="text-[10px] text-zinc-500 mt-0.5">Envía tu código único a otros administradores por WhatsApp o correo.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">Se registran</p>
                                                    <p className="text-[10px] text-zinc-500 mt-0.5">El nuevo administrador se registra en InmobiGo ingresando tu código.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">Contratan un plan</p>
                                                    <p className="text-[10px] text-zinc-500 mt-0.5">Una vez que terminen su prueba y contraten cualquier plan de pago.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">4</div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">Recibe $1,000 MXN</p>
                                                    <p className="text-[10px] text-zinc-500 mt-0.5">El sistema liberará automáticamente tu recompensa a tu cuenta.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* MODAL: VER CAPACITACION */}
            <AnimatePresence>
                {selectedTraining && (() => {
                    const isDone = progressMap[selectedTraining.id]?.completed || false
                    const categoryName = categories.find(c => c.id === selectedTraining.category_id)?.name || 'General'

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedTraining(null)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            />
                            
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                transition={{ type: "spring", duration: 0.5 }}
                                className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto z-10 shadow-2xl flex flex-col"
                            >
                                <button
                                    onClick={() => setSelectedTraining(null)}
                                    className="absolute top-5 right-5 p-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full border border-zinc-800 transition-all z-20"
                                >
                                    <X size={18} />
                                </button>

                                {/* Video Iframe / Content */}
                                <div className="relative aspect-video w-full bg-black">
                                    <iframe
                                        src={selectedTraining.content_url}
                                        title={selectedTraining.title}
                                        className="absolute inset-0 w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>

                                <div className="p-8 space-y-6">
                                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                                        <div className="space-y-1">
                                            <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                                                {categoryName.replace('📚 ', '')}
                                            </Badge>
                                            <h3 className="text-2xl font-black text-white leading-tight mt-1">{selectedTraining.title}</h3>
                                        </div>

                                        <button
                                            disabled={loadingProgressId === selectedTraining.id}
                                            onClick={() => handleCompleteTraining(selectedTraining.id)}
                                            className={`h-12 px-6 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                                                isDone 
                                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                                                    : 'bg-zinc-800 hover:bg-indigo-600 text-zinc-200 hover:text-white border border-zinc-700'
                                            }`}
                                        >
                                            {isDone ? <CheckCircle size={16} /> : <Play size={14} />}
                                            {isDone ? 'Completado ✓' : 'Marcar Completado'}
                                        </button>
                                    </div>

                                    <div className="space-y-4 leading-relaxed">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-widest">Sobre este curso</h4>
                                        <p className="text-zinc-400 text-sm font-medium">{selectedTraining.description}</p>
                                    </div>

                                    {/* Video Completion Tip */}
                                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex gap-3 text-xs text-indigo-300">
                                        <Info size={16} className="shrink-0 mt-0.5 text-indigo-400" />
                                        <p>
                                            Una vez completado el estudio del material, haz clic en **Marcar Completado** arriba. Esto actualizará tu progreso de entrenamiento para tu organización e impactará tus certificaciones de administrador.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                })()}
            </AnimatePresence>

            {/* MODAL: REGISTRAR REFERIDO */}
            <AnimatePresence>
                {showReferralModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowReferralModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-md p-8 z-10 shadow-2xl space-y-6"
                        >
                            <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
                                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                    <Plus size={18} className="text-indigo-450" /> Registrar Referido
                                </h3>
                                <button
                                    onClick={() => setShowReferralModal(false)}
                                    className="p-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleRegisterReferral} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Nombre completo</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={refName}
                                        onChange={(e) => setRefName(e.target.value)}
                                        placeholder="Ej. Juan Pérez"
                                        className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Correo electrónico</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={refEmail}
                                        onChange={(e) => setRefEmail(e.target.value)}
                                        placeholder="Ej. juan@ejemplo.com"
                                        className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Teléfono (WhatsApp)</label>
                                    <input 
                                        type="text"
                                        value={refPhone}
                                        onChange={(e) => setRefPhone(e.target.value)}
                                        placeholder="Ej. +52 1 998 123 4567"
                                        className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={submittingReferral}
                                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                    >
                                        {submittingReferral ? 'Registrando...' : 'Registrar e Invitar'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: ¿QUÉ APRENDERÁS? */}
            <AnimatePresence>
                {selectedLearnCard && (() => {
                    const categoryName = categories.find(c => c.id === selectedLearnCard.category_id)?.name || 'General'
                    const objectives = learningObjectivesMap[selectedLearnCard.title] || []

                    return (
                        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedLearnCard(null)}
                                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                            />

                            {/* Modal Panel */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96, y: 24 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96, y: 24 }}
                                transition={{ type: 'spring', duration: 0.45, bounce: 0.18 }}
                                className="relative w-full max-w-lg z-10 rounded-[2rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] border border-zinc-800/80"
                            >
                                {/* Gradient background */}
                                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950" />
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

                                {/* Thumbnail strip */}
                                <div className="relative h-36 w-full overflow-hidden">
                                    <img
                                        src={selectedLearnCard.thumbnail_url}
                                        alt={selectedLearnCard.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80' }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/60 to-transparent" />
                                    {/* Category pill over image */}
                                    <div className="absolute bottom-4 left-5 text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/15 border border-indigo-500/25 px-3 py-1 rounded-full backdrop-blur-sm">
                                        {categoryName}
                                    </div>
                                    {/* Close button */}
                                    <button
                                        onClick={() => setSelectedLearnCard(null)}
                                        className="absolute top-4 right-4 p-2 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full border border-zinc-700/60 transition-all backdrop-blur-sm z-20"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="relative px-6 pb-7 pt-4 space-y-5">
                                    {/* Title + meta */}
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-white leading-snug tracking-tight">
                                            {selectedLearnCard.title}
                                        </h3>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                            <Clock size={11} /> {selectedLearnCard.duration_minutes} min
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-gradient-to-r from-indigo-500/30 via-zinc-800 to-transparent" />

                                    {/* Learning objectives */}
                                    <div className="space-y-3">
                                        <p className="text-xs font-black text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                                            <BookOpen size={13} className="text-indigo-400" />
                                            ¿Qué Aprenderás?
                                        </p>
                                        <ul className="space-y-2.5">
                                            {objectives.map((obj, i) => (
                                                <motion.li
                                                    key={i}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.08 + i * 0.055 }}
                                                    className="flex items-start gap-3 text-sm text-zinc-300 leading-snug"
                                                >
                                                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                                                        <Check size={11} className="text-indigo-400" strokeWidth={3} />
                                                    </span>
                                                    {obj}
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Footer CTA */}
                                    <div className="pt-1">
                                        <button
                                            disabled
                                            className="w-full h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 text-zinc-500 text-xs font-bold uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2 opacity-60"
                                        >
                                            ⏳ Contenido disponible próximamente
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                })()}
            </AnimatePresence>
        </div>
    )
}
