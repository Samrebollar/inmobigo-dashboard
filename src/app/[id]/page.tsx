import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Clock, User, QrCode, AlertTriangle, ShieldCheck, Gift } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export const metadata = {
    title: 'Registro de Acceso | InmobiGo',
    description: 'Sistema Profesional de Accesos Válido en Caseta'
}

export const dynamic = 'force-dynamic'

export default async function AccesoVisitaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: qr_token } = await params
    if (!qr_token) redirect('/')

    const supabase = createAdminClient()
    
    // Buscar la visita por qr_token en la tabla 'visitor_passes'
    const { data: visita, error } = await supabase
        .from('visitor_passes')
        .select(`*`)
        .eq('qr_token', qr_token)
        .single()

    // 1. VALIDACIÓN: Si no existe el token -> "QR inválido"
    if (error || !visita) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-sans">
                <Card className="bg-zinc-900 border-zinc-800 max-w-sm w-full mx-auto shadow-2xl overflow-hidden rounded-3xl">
                    <div className="bg-red-500/10 p-8 flex flex-col items-center border-b border-red-500/20">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-500/30">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white mb-2">QR Inválido</h1>
                        <p className="text-zinc-400 text-center text-sm">El acceso solicitado no existe en el sistema o el código fue alterado.</p>
                    </div>
                </Card>
            </div>
        )
    }

    // 2. VALIDACIÓN DE EXPIRACIÓN AUTOMÁTICA EN TIEMPO REAL
    const now = new Date()
    // Forzamos el offset de México (UTC-6) para evitar problemas con la hora del servidor (UTC)
    const visitDateTime = new Date(`${visita.visit_date}T${visita.end_time}-06:00`)
    
    let currentStatus = visita.status
    const isActuallyExpired = now > visitDateTime

    // Lógica Inteligente de Estado:
    if (isActuallyExpired && currentStatus === 'pending') {
        // Marcar como expirado solo si el tiempo real ya pasó
        await supabase
            .from('visitor_passes')
            .update({ status: 'expired' })
            .eq('id', visita.id)
        currentStatus = 'expired'
    } else if (!isActuallyExpired && currentStatus === 'expired') {
        // AUTO-RESTAURACIÓN: Si el sistema lo marcó como expirado por error (zona horaria del servidor),
        // lo restauramos a PENDING porque aún tiene tiempo válido.
        await supabase
            .from('visitor_passes')
            .update({ status: 'pending' })
            .eq('id', visita.id)
        currentStatus = 'pending'
    }

    // 3. VALIDACIONES DE ESTADOS DE ERROR
    if (currentStatus !== 'pending') {
        const isUsed = currentStatus === 'used'
        const isCancelled = currentStatus === 'cancelled'
        const isExpired = currentStatus === 'expired'
        
        let title = 'Acceso No Válido'
        let description = 'Este pase no puede ser utilizado.'
        let themeColor = 'text-red-500'
        let themeBg = 'bg-red-500/10'
        let Icon = AlertTriangle

        if (isUsed) {
            title = 'QR ya utilizado'
            description = 'Este pase ya fue validado en caseta anteriormente.'
            themeColor = 'text-amber-500'
            themeBg = 'bg-amber-500/10'
            Icon = Clock
        } else if (isCancelled) {
            title = 'Acceso Cancelado'
            description = 'Este pase ha sido anulado por el residente.'
            themeColor = 'text-zinc-500'
            themeBg = 'bg-zinc-500/10'
            Icon = ShieldCheck
        } else if (isExpired) {
            title = 'QR Expirado'
            description = 'El tiempo de validez de este pase ha terminado.'
            themeColor = 'text-red-500'
            themeBg = 'bg-red-500/10'
            Icon = AlertTriangle
        }
        
        return (
             <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-sans relative">
                <Card className="bg-zinc-900/90 border-zinc-800 max-w-sm w-full mx-auto shadow-2xl relative z-10 overflow-hidden rounded-3xl">
                    <div className={`${themeBg} p-8 flex flex-col items-center border-b border-zinc-800/50`}>
                        <div className={`w-20 h-20 ${themeBg} rounded-full flex items-center justify-center mb-4 ring-4 ring-black/10`}>
                            <Icon className={`w-10 h-10 ${themeColor}`} />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white mb-1 text-center">{title}</h1>
                        <p className="text-zinc-400 text-center text-sm font-medium">{description}</p>
                    </div>
                     <CardContent className="p-6 bg-black/40 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-zinc-800 rounded-xl"><User className="w-5 h-5 text-zinc-300" /></div>
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Visitante</p>
                                <p className="font-bold text-white tracking-wide">{visita.visitor_name}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // 4. FLUJO POSITIVO: ESTADO PENDIENTE
    const isEvent = visita.access_type === 'event'
    const isService = visita.access_type === 'service'
    
    let accessTitle = 'Acceso Válido'
    let themeColor = 'bg-emerald-600'
    let themeText = 'text-emerald-400'
    let themeBg = 'bg-emerald-500/20'
    let iconColor = <QrCode className="w-10 h-10 text-white" />
    let typeLabel = 'Visitante Invitado'

    if (isEvent) {
        accessTitle = 'Invitado a Evento'
        themeColor = 'bg-indigo-600'
        themeText = 'text-indigo-400'
        themeBg = 'bg-indigo-500/20'
        iconColor = <Gift className="w-10 h-10 text-white" />
        typeLabel = 'Evento Especial'
    } else if (isService) {
        accessTitle = 'Personal de Servicio'
        themeColor = 'bg-emerald-600'
        themeText = 'text-emerald-400'
        themeBg = 'bg-emerald-500/20'
        iconColor = <ShieldCheck className="w-10 h-10 text-white" />
        typeLabel = 'Servicio Técnico'
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex justify-center p-4 text-white font-sans relative">
            <div className={`absolute top-0 inset-x-0 h-[400px] ${themeBg} blur-[130px] rounded-full pointer-events-none`} />
            
            <div className="max-w-md w-full relative z-10 space-y-6 pt-4">
                
                {/* Header App Móvil */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 py-1.5 px-4 bg-zinc-900 rounded-full border border-zinc-800 shadow-xl">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Caseta de Seguridad</span>
                    </div>
                </div>

                <Card className="bg-zinc-900 border-zinc-800 overflow-hidden shadow-2xl rounded-3xl">
                    <div className={`bg-gradient-to-b from-${isEvent ? 'indigo' : 'emerald'}-500/10 to-transparent p-6 pb-8 flex flex-col items-center`}>
                        <div className={`w-20 h-20 ${themeColor} rounded-full flex items-center justify-center mb-4 shadow-xl border-4 border-black/20`}>
                            {iconColor}
                        </div>
                        <h1 className="text-2xl font-black text-white text-center tracking-tight">{accessTitle}</h1>
                        <span className={`mt-2 px-3 py-1 ${themeBg} ${themeText} text-[10px] font-bold uppercase tracking-[0.2em] rounded-md border border-white/10`}>
                            Status: PENDIENTE
                        </span>
                    </div>

                    <CardContent className="p-6 pt-0 space-y-5">
                        <div className="p-5 bg-black/50 rounded-2xl border border-zinc-800/80 space-y-4">
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Nombre del Visitante</p>
                                <p className="text-xl font-black text-white tracking-tight">{visita.visitor_name}</p>
                            </div>
                            
                            <div className="h-px bg-zinc-800/60 w-full" />
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Tipo de Acceso</p>
                                <p className={`text-lg font-black ${themeText}`}>{typeLabel.toUpperCase()}</p>
                            </div>

                            <div className="h-px bg-zinc-800/60 w-full" />
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Autorizado Por</p>
                                <p className="text-sm font-medium text-zinc-300">{visita.authorized_by_name} {visita.unit_name ? `(Ud. ${visita.unit_name})` : ''}</p>
                            </div>

                            <div className="h-px bg-zinc-800/60 w-full" />
                            <div className="flex justify-between items-center text-sm">
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Fecha</p>
                                    <p className="font-bold text-white">{format(parseISO(visita.visit_date), "d MMM yyyy", { locale: es })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Hora Válida</p>
                                    <p className="font-bold text-white">{visita.start_time.substring(0,5)} - {visita.end_time.substring(0,5)} hs</p>
                                </div>
                            </div>
                        </div>
                        
                        <form action={async () => {
                            'use server'
                            const adminClient = createAdminClient()
                            await adminClient
                                .from('visitor_passes')
                                .update({ 
                                    status: 'used',
                                    used_at: new Date().toISOString()
                                })
                                .eq('id', visita.id)
                            redirect(`/${qr_token}`)
                        }}>
                            <button type="submit" className={`w-full h-16 ${themeColor} hover:opacity-90 active:scale-[0.98] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all`}>
                                Registrar Entrada
                            </button>
                        </form>
                        <p className="text-center text-[10px] text-zinc-500 font-medium">Al registrar la entrada el código perderá vigencia.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
