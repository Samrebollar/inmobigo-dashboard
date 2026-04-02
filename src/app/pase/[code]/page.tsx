import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Clock, MapPin, User, KeyRound, AlertCircle, XCircle } from 'lucide-react'
import { format, differenceInHours } from 'date-fns'
import { es } from 'date-fns/locale'

export const metadata = {
    title: 'Validación de Acceso | InmobiGo',
    description: 'Portal de Seguridad de InmobiGo'
}

export default async function PasePage({ params }: { params: { code: string } }) {
    const code = params.code
    if (!code) redirect('/')

    const supabase = createAdminClient()
    
    // Fetch visit data and bypass RLS with admin client
    const { data: visit, error } = await supabase
        .from('visits')
        .select(`
            *,
            units(unit_number),
            profiles(full_name)
        `)
        .eq('qr_code', code)
        .single()

    const isValid = visit && visit.status === 'pending'
    
    // Check expiration (24h rule)
    const isExpired = visit && differenceInHours(new Date(), new Date(visit.created_at)) >= 24

    if (error || !visit) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-sans">
                <Card className="bg-zinc-900 border-zinc-800 max-w-sm w-full mx-auto shadow-2xl overflow-hidden rounded-[2rem]">
                    <div className="bg-red-500/10 p-8 flex flex-col items-center border-b border-red-500/20">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-500/30">
                            <XCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white mb-2">Pase No Encontrado</h1>
                        <p className="text-zinc-400 text-center text-sm">Este código QR es inválido o no existe en nuestra base de datos.</p>
                    </div>
                    <CardContent className="p-6">
                        <Link href="/" className="w-full flex justify-center py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl transition-all">
                            Ir al portal web
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (isExpired || visit.status !== 'pending') {
        const titleLine = isExpired ? 'Pase Expirado' : 'Pase Utilizado'
        const colorClass = isExpired ? 'text-amber-500' : 'text-zinc-500'
        const bgClass = isExpired ? 'bg-amber-500/10' : 'bg-zinc-500/10'
        const borderClass = isExpired ? 'border-amber-500/20' : 'border-zinc-500/20'
        const Icon = isExpired ? Clock : AlertCircle

        return (
             <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-sans relative">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 ${bgClass} blur-[120px] rounded-full pointer-events-none`} />
                <Card className="bg-zinc-900/80 backdrop-blur-xl border-zinc-800 max-w-sm w-full mx-auto shadow-2xl relative z-10 overflow-hidden rounded-[2rem]">
                    <div className={`${bgClass} p-8 flex flex-col items-center border-b ${borderClass}`}>
                        <div className={`w-20 h-20 ${bgClass} rounded-full flex items-center justify-center mb-6 ring-4 ${borderClass}`}>
                            <Icon className={`w-10 h-10 ${colorClass}`} />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white mb-2">{titleLine}</h1>
                        <p className="text-zinc-400 text-center text-sm">
                            {isExpired ? 'Este pase se generó hace más de 24 horas y ha caducado.' : 'Este pase ya fue validado anteriormente y es de un solo uso.'}
                        </p>
                    </div>
                     <CardContent className="p-6 space-y-6">
                         <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-800/80 rounded-lg"><User className="w-4 h-4 text-zinc-400" /></div>
                                <div><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Visitante</p><p className="font-semibold text-white">{visit.visitor_name}</p></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 md:p-6 text-white font-sans relative">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 blur-[130px] rounded-full pointer-events-none`} />
            <div className="max-w-md w-full relative z-10 space-y-6">
                
                <div className="text-center space-y-2 mb-8">
                    <div className="inline-flex items-center gap-2 justify-center py-1.5 px-4 bg-zinc-900 rounded-full border border-zinc-800 mb-4 shadow-xl">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Pase Oficial</span>
                    </div>
                </div>

                <Card className="bg-zinc-900/60 backdrop-blur-2xl border-zinc-800 overflow-hidden shadow-2xl shadow-emerald-900/20 rounded-[2.5rem]">
                    <div className="bg-emerald-500/10 p-8 pb-10 flex flex-col items-center relative">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
                        
                        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)] border-4 border-emerald-950 relative">
                            <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-30 rounded-full animate-pulse" />
                            <CheckCircle2 className="w-12 h-12 text-white relative z-10" />
                        </div>
                        
                        <h1 className="text-3xl font-black tracking-tight text-white mb-2 text-center leading-tight">Acceso<br />Autorizado</h1>
                    </div>

                    <CardContent className="p-8 pt-0 space-y-6">
                        <div className="p-6 bg-black/40 rounded-3xl border border-zinc-800/80 space-y-6 shadow-inner">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-zinc-800/80 rounded-xl"><User className="w-5 h-5 text-zinc-300" /></div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Nombre de Visita / Empresa</p>
                                    <p className="text-lg font-bold text-white capitalize">{visit.visitor_name}</p>
                                </div>
                            </div>
                            
                            <div className="h-px bg-zinc-800/60 w-full" />

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-zinc-800/80 rounded-xl"><MapPin className="w-5 h-5 text-indigo-400" /></div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Destino: Unidad</p>
                                    <p className="text-lg font-bold text-white tracking-tight">{visit.units?.unit_number || 'S/D'}</p>
                                    <p className="text-xs font-bold text-zinc-400 mt-1">Autoriza: <span className="text-zinc-300">{visit.profiles?.full_name || 'Residente'}</span></p>
                                </div>
                            </div>
                            
                            <div className="h-px bg-zinc-800/60 w-full" />

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-zinc-800/80 rounded-xl"><Clock className="w-5 h-5 text-zinc-400" /></div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Generación y Vigencia</p>
                                    <p className="text-sm font-bold text-white capitalize">{format(new Date(visit.created_at), "EEEE d, MMM - HH:mm", { locale: es })}</p>
                                    <p className="text-xs font-medium text-amber-500/80 mt-1">Pase de un solo uso válido por 24h.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="pt-4 pb-2 text-center flex flex-col items-center gap-2">
                            <p className="text-xs font-black uppercase tracking-widest text-zinc-600 flex items-center justify-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" /> Sistema Seguro
                            </p>
                            <p className="text-[10px] font-medium text-zinc-700">Powered by InmobiGo</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
