import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Clock, User, QrCode, AlertTriangle, ShieldCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export const metadata = {
    title: 'Registro de Acceso | InmobiGo',
    description: 'Sistema Profesional de Accesos Válido en Caseta'
}

export default async function AccesoVisitaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!id) redirect('/')

    const supabase = createAdminClient()
    
    // Buscar la visita en la nueva tabla 'visitas'
    const { data: visita, error } = await supabase
        .from('visitas')
        .select(`*`)
        .eq('id', id)
        .single()

    // 1. VALIDACIÓN: Si no existe el ID -> "QR inválido"
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

    // Calculo y validación de "Expirado" (Si la fecha ya pasó)
    const today = format(new Date(), 'yyyy-MM-dd')
    const isPast = new Date(visita.fecha) < new Date(today)
    
    const displayStatus = (visita.estado === 'pendiente' && isPast) ? 'expirado' : visita.estado

    // 2. VALIDACIONES DE ESTADOS DE ERROR
    if (displayStatus !== 'pendiente') {
        const isUsed = displayStatus === 'usado' || visita.qr_usado
        const title = isUsed ? 'QR ya utilizado' : 'QR Expirado'
        const color = isUsed ? 'text-amber-500' : 'text-red-500'
        const bg = isUsed ? 'bg-amber-500/10' : 'bg-red-500/10'
        
        return (
             <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-sans relative">
                <Card className="bg-zinc-900/90 border-zinc-800 max-w-sm w-full mx-auto shadow-2xl relative z-10 overflow-hidden rounded-3xl">
                    <div className={`${bg} p-8 flex flex-col items-center border-b border-zinc-800/50`}>
                        <div className={`w-20 h-20 ${bg} rounded-full flex items-center justify-center mb-4 ring-4 ring-black/10`}>
                            {isUsed ? <Clock className={`w-10 h-10 ${color}`} /> : <AlertTriangle className={`w-10 h-10 ${color}`} />}
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white mb-1 text-center">{title}</h1>
                        <p className="text-zinc-400 text-center text-sm font-medium">
                            {isUsed ? 'Este pase solo es de un uso y ya fue validado en caseta.' : 'La fecha autorizada de este pase ha pasado.'}
                        </p>
                    </div>
                     <CardContent className="p-6 bg-black/40 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-zinc-800 rounded-xl"><User className="w-5 h-5 text-zinc-300" /></div>
                            <div><p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Visitante</p>
                            <p className="font-bold text-white tracking-wide">{visita.nombre_visitante}</p></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // 3. FLUJO POSITIVO: ESTADO PENDIENTE
    return (
        <div className="min-h-screen bg-zinc-950 flex justify-center p-4 text-white font-sans relative">
            <div className={`absolute top-0 inset-x-0 h-[400px] bg-emerald-500/20 blur-[130px] rounded-full pointer-events-none`} />
            
            <div className="max-w-md w-full relative z-10 space-y-6 pt-4">
                
                {/* Header App Móvil */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 py-1.5 px-4 bg-zinc-900 rounded-full border border-zinc-800 shadow-xl">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Caseta de Seguridad</span>
                    </div>
                </div>

                <Card className="bg-zinc-900 border-zinc-800 overflow-hidden shadow-2xl rounded-3xl">
                    {/* Indicador de Estado Visual */}
                    <div className="bg-gradient-to-b from-emerald-500/10 to-transparent p-6 pb-8 flex flex-col items-center">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] border-4 border-emerald-950">
                            <QrCode className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white text-center">Acceso Válido</h1>
                        <span className="mt-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-md border border-emerald-500/20">
                            Status: Pendiente
                        </span>
                    </div>

                    <CardContent className="p-6 pt-0 space-y-5">
                        <div className="p-5 bg-black/50 rounded-2xl border border-zinc-800/80 space-y-4">
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Nombre del Visitante</p>
                                <p className="text-lg font-bold text-white">{visita.nombre_visitante}</p>
                            </div>
                            <div className="h-px bg-zinc-800/60 w-full" />
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Autorizado Por</p>
                                <p className="text-sm font-medium text-zinc-300">{visita.nombre_residente} {visita.unit_number ? `(Ud. ${visita.unit_number})` : ''}</p>
                            </div>
                            <div className="h-px bg-zinc-800/60 w-full" />
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Fecha</p>
                                    <p className="text-sm font-bold text-white">{format(parseISO(visita.fecha), "d MMM yyyy", { locale: es })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Hora Llegada</p>
                                    <p className="text-sm font-bold text-white">{visita.hora.substring(0,5)} hrs</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Botón de Acceso */}
                        <form action={async () => {
                            'use server'
                            const adminClient = createAdminClient()
                            await adminClient.from('visitas').update({ 
                                estado: 'usado',
                                qr_usado: true,
                                fecha_uso: new Date().toISOString()
                            }).eq('id', visita.id)
                            redirect(`/${id}`)
                        }}>
                            <button type="submit" className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all">
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
