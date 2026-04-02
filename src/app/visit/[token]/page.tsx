import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { 
    CheckCircle2, Clock, MapPin, User, KeyRound, AlertCircle, XCircle,
    Calendar, FileText, ShieldCheck, ShieldAlert
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export const metadata = {
    title: 'Validación de Acceso | InmobiGo',
    description: 'Portal de Seguridad de InmobiGo'
}

export default async function VisitPage({ params }: { params: { token: string } }) {
    const token = params.token
    if (!token) redirect('/')

    const supabase = createAdminClient()
    
    // Buscar la visita segura por su token cifrado y evadir RLS con el cliente Admin
    const { data: pass, error } = await supabase
        .from('visitor_passes')
        .select(`
            *,
            units(unit_number),
            profiles(full_name),
            organizations(name)
        `)
        .eq('qr_token', token)
        .single()

    // 1. Manejo de error o No encontrado
    if (error || !pass) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-sans">
                <Card className="bg-zinc-900 border-zinc-800 max-w-sm w-full mx-auto shadow-2xl overflow-hidden rounded-[2rem]">
                    <div className="bg-red-500/10 p-8 flex flex-col items-center border-b border-red-500/20">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-500/30">
                            <XCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white mb-2">Pase No Encontrado</h1>
                        <p className="text-zinc-400 text-center text-sm">Este código no existe en nuestra base de datos o está corrupto.</p>
                    </div>
                </Card>
            </div>
        )
    }

    // Comprobamos si el pase de la fecha sigue siendo válido hoy (logica básica de display)
    const today = format(new Date(), 'yyyy-MM-dd')
    const isToday = pass.visit_date === today
    const isPast = new Date(pass.visit_date) < new Date(today)
    
    // Si la fecha ya pasó o lo habían emitido y nunca usaron, visualmente es Expirado
    const displayStatus = (pass.status === 'pending' && isPast) ? 'expired' : pass.status

    // 2. Manejo de estados de advertencia (Expirado, Cancelado o Usado)
    if (displayStatus !== 'pending' || !isToday) {
        let titleLine = 'Pase Utilizado'
        let description = 'Este pase ya fue validado anteriormente en la caseta y no puede reutilizarse.'
        let colorClass = 'text-amber-500'
        let bgClass = 'bg-amber-500/10'
        let borderClass = 'border-amber-500/20'
        let Icon = AlertCircle

        if (displayStatus === 'expired' || (displayStatus === 'pending' && !isToday)) {
            titleLine = displayStatus === 'pending' ? 'Pase de Otro Día' : 'Pase Expirado'
            description = displayStatus === 'pending' 
                ? `Este pase está programado para el día ${format(parseISO(pass.visit_date), 'dd/MM/yy')}. No es válido hoy.`
                : 'La vigencia de este pase ha terminado.'
            colorClass = 'text-zinc-500'
            bgClass = 'bg-zinc-500/10'
            borderClass = 'border-zinc-500/20'
            Icon = Clock
        }

        if (displayStatus === 'cancelled') {
            titleLine = 'Pase Revocado'
            description = 'El residente revocó el acceso para este visitante.'
            colorClass = 'text-red-500'
            bgClass = 'bg-red-500/10'
            borderClass = 'border-red-500/20'
            Icon = ShieldAlert
        }

        return (
             <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-sans relative">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 ${bgClass} blur-[120px] rounded-full pointer-events-none`} />
                <Card className="bg-zinc-900/80 backdrop-blur-xl border-zinc-800 max-w-sm w-full mx-auto shadow-2xl relative z-10 overflow-hidden rounded-[2rem]">
                    <div className={`${bgClass} p-8 flex flex-col items-center border-b ${borderClass}`}>
                        <div className={`w-20 h-20 ${bgClass} rounded-full flex items-center justify-center mb-6 ring-4 ${borderClass}`}>
                            <Icon className={`w-10 h-10 ${colorClass}`} />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white mb-2">{titleLine}</h1>
                        <p className="text-zinc-400 text-center text-sm font-medium">{description}</p>
                    </div>
                     <CardContent className="p-6 space-y-6 bg-black/40">
                         <div className="space-y-4">
                            <div className="flex items-center gap-4 border-b border-zinc-800/80 pb-4">
                                <div className="p-3 bg-zinc-800 rounded-xl"><User className="w-5 h-5 text-zinc-300" /></div>
                                <div><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Visitante</p><p className="font-bold text-white uppercase">{pass.visitor_name}</p></div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-zinc-800 rounded-xl"><MapPin className="w-5 h-5 text-indigo-400" /></div>
                                <div><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Destino</p><p className="font-bold text-white uppercase">Unidad {pass.units?.unit_number || 'S/D'}</p></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // 3. Flujo Verdadero: Pase Pendiente y Vigente Hoy
    return (
        <div className="min-h-screen bg-black flex justify-center p-4 md:p-6 text-white font-sans relative">
            <div className={`absolute top-0 inset-x-0 h-[500px] bg-emerald-500/20 blur-[130px] rounded-full pointer-events-none`} />
            <div className="max-w-md w-full relative z-10 space-y-6">
                
                <div className="text-center space-y-2 mb-4 pt-6">
                    <div className="inline-flex items-center gap-2 justify-center py-2 px-6 bg-zinc-900 rounded-full border border-zinc-800 shadow-2xl">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-emerald-400">{pass.organizations?.name || 'Sistema de Seguridad'}</span>
                    </div>
                </div>

                <Card className="bg-zinc-900/60 backdrop-blur-2xl border border-emerald-500/30 overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)] rounded-[2.5rem]">
                    <div className="bg-gradient-to-b from-emerald-500/20 to-zinc-900/40 p-8 pb-10 flex flex-col items-center relative">
                        <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
                        
                        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)] border-4 border-emerald-950 relative">
                            <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-30 rounded-full animate-pulse" />
                            <CheckCircle2 className="w-12 h-12 text-white relative z-10" />
                        </div>
                        
                        <h1 className="text-3xl font-black tracking-tight text-white mb-2 text-center leading-tight">Acceso<br />Vigente</h1>
                        <p className="text-emerald-400 font-bold text-xs tracking-widest uppercase mt-2 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">Autorizado - un solo uso</p>
                    </div>

                    <CardContent className="p-6 pt-0 space-y-6">
                        <div className="p-6 bg-black/60 rounded-3xl border border-zinc-800/80 space-y-6 shadow-inner">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-zinc-800/80 rounded-xl"><User className="w-5 h-5 text-zinc-300" /></div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Nombre de Visita</p>
                                    <p className="text-xl font-bold text-white uppercase">{pass.visitor_name}</p>
                                </div>
                            </div>
                            
                            <div className="h-px bg-zinc-800/60 w-full" />

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-zinc-800/80 rounded-xl"><MapPin className="w-5 h-5 text-indigo-400" /></div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Destino: Unidad</p>
                                    <p className="text-xl font-black text-white tracking-tight">{pass.units?.unit_number || 'S/D'}</p>
                                    <p className="text-xs font-bold text-zinc-400 mt-1.5">Autoriza: <span className="text-indigo-300">{pass.profiles?.full_name || 'Residente'}</span></p>
                                </div>
                            </div>
                            
                            <div className="h-px bg-zinc-800/60 w-full" />

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-zinc-800/80 rounded-xl"><Clock className="w-5 h-5 text-zinc-400" /></div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Horario Programado</p>
                                    <p className="text-sm font-bold text-white uppercase">{format(parseISO(pass.visit_date), "EEEE d 'de' MMMM", { locale: es })}</p>
                                    <p className="text-xs font-medium text-emerald-400 mt-1">Llegada esperada: {pass.start_time.substring(0,5)} hs</p>
                                </div>
                            </div>

                            {pass.notes && (
                                <>
                                    <div className="h-px bg-zinc-800/60 w-full" />
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-zinc-800/80 rounded-xl"><FileText className="w-5 h-5 text-zinc-400" /></div>
                                        <div>
                                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Notas al Guardia</p>
                                            <p className="text-sm font-medium text-zinc-300 leading-relaxed">{pass.notes}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {/* Interactive Form for the Guard */}
                        {/* We use a Client Component here to handle the click visually, or a server action */}
                        <form action={async () => {
                            'use server'
                            const adminClient = createAdminClient()
                            await adminClient.from('visitor_passes').update({ status: 'used' }).eq('id', pass.id)
                            redirect(`/visit/${token}`)
                        }}>
                            <button type="submit" className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all">
                                Autorizar Entrada Oficial
                            </button>
                        </form>
                        
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
