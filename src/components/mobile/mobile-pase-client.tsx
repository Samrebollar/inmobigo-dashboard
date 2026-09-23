'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { Bell, MapPin, Share2, XCircle, QrCode, UserPlus } from 'lucide-react'

interface VisitorPass {
    id: string
    visitor_name: string
    visit_date: string
    start_time: string
    end_time: string
    status: string
    qr_token: string
}

export default function MobilePaseClient({
    pass,
    condoName,
    unitNumber,
}: {
    pass: VisitorPass | null
    condoName: string
    unitNumber: string
}) {
    const router = useRouter()
    const [current, setCurrent] = useState(pass)
    const [isCancelling, setIsCancelling] = useState(false)

    const handleCompartir = async () => {
        if (!current) return
        const text = `Pase de visita InmobiGo\nVisitante: ${current.visitor_name}\nFecha: ${format(new Date(current.visit_date), "d 'de' MMMM, yyyy", { locale: es })}\nHorario: ${current.start_time.slice(0, 5)} - ${current.end_time.slice(0, 5)}\nUbicación: ${condoName} - Unidad ${unitNumber}`

        if (navigator.share) {
            try {
                await navigator.share({ title: 'Pase de visita InmobiGo', text })
            } catch {
                // El usuario canceló el share sheet — no es un error.
            }
        } else {
            await navigator.clipboard.writeText(text)
            toast.success('Datos del pase copiados al portapapeles.')
        }
    }

    const handleCancelar = async () => {
        if (!current) return
        setIsCancelling(true)
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('visitor_passes')
                .update({ status: 'cancelled' })
                .eq('id', current.id)
            if (error) throw error
            toast.success('Pase cancelado.')
            setCurrent(null)
        } catch {
            toast.error('No se pudo cancelar el pase.')
        } finally {
            setIsCancelling(false)
        }
    }

    return (
        <div className="mx-auto max-w-[480px]">
            <header className="sticky top-0 z-30 flex items-center justify-between bg-[rgba(248,249,250,0.9)] px-5 py-4 backdrop-blur-[6px]">
                <h1 className="text-[20px] font-semibold leading-[28px] text-[#004AC6]">Pase de Visita</h1>
                <Link href="/mobile/avisos" className="flex h-10 w-10 items-center justify-center rounded-full">
                    <Bell size={18} className="text-[#191C1D]" />
                </Link>
            </header>

            <main className="flex flex-col items-center px-5 pb-12 pt-6">
                {current ? (
                    <>
                        <div className="w-full overflow-hidden rounded-[24px] border border-[#c3c6d7] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.03)]">
                            <div className="flex flex-col items-center p-6">
                                <div
                                    className="rounded-xl p-0.5"
                                    style={{ backgroundImage: 'linear-gradient(135deg, #2563eb 0%, #004ac6 100%)' }}
                                >
                                    <div className="rounded-[10px] bg-white p-4">
                                        <div className="flex h-[192px] w-[192px] items-center justify-center border-2 border-[#edeeef]">
                                            <QRCode
                                                value={`https://acceso.inmobigo.mx/${current.qr_token}`}
                                                size={168}
                                                fgColor="#191C1D"
                                                bgColor="#ffffff"
                                                level="H"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-1 rounded-full bg-[rgba(37,99,235,0.1)] px-3 py-1">
                                    <span className="h-2 w-2 rounded-full bg-[#004AC6]" />
                                    <span className="text-[12px] font-semibold tracking-[0.24px] text-[#004AC6]">
                                        {current.status === 'pending' ? 'Pase Válido' : 'Registrado'}
                                    </span>
                                </div>
                            </div>

                            <div className="border-t border-[rgba(195,198,215,0.3)] bg-[#f3f4f5] px-6 pb-8 pt-[33px]">
                                <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-[#434655]">
                                    Nombre del visitante
                                </p>
                                <p className="text-[20px] font-semibold leading-[28px] text-[#191C1D]">
                                    {current.visitor_name}
                                </p>

                                <div className="mt-6 flex items-start justify-between">
                                    <div>
                                        <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-[#434655]">Fecha</p>
                                        <p className="text-[16px] font-semibold text-[#191C1D]">
                                            {format(new Date(current.visit_date), 'd MMM, yyyy', { locale: es })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-[#434655]">
                                            Hora estimada
                                        </p>
                                        <p className="text-[16px] font-semibold text-[#191C1D]">
                                            {current.start_time.slice(0, 5)} - {current.end_time.slice(0, 5)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-[17px] border-t border-[rgba(195,198,215,0.2)] pt-[17px]">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-[#434655]">Ubicación</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <MapPin size={14} className="shrink-0 text-[#191C1D]" />
                                        <p className="text-[14px] text-[#191C1D]">
                                            Unidad {unitNumber} - {condoName}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex w-full flex-col gap-4">
                            <button
                                onClick={handleCompartir}
                                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#004AC6] text-[16px] font-semibold text-white shadow-[0px_1px_1px_rgba(0,0,0,0.05)]"
                            >
                                <Share2 size={18} />
                                Compartir
                            </button>
                            {current.status === 'pending' && (
                                <button
                                    onClick={handleCancelar}
                                    disabled={isCancelling}
                                    className="flex h-14 w-full items-center justify-center gap-2 text-[16px] font-semibold text-[#ba1a1a] disabled:opacity-50"
                                >
                                    <XCircle size={18} />
                                    {isCancelling ? 'Cancelando...' : 'Cancelar Pase'}
                                </button>
                            )}
                        </div>

                        <p className="mt-6 px-4 text-center text-[14px] leading-[20px] text-[#434655]">
                            Este código QR es de un solo uso y expira automáticamente al finalizar el rango de horario.
                        </p>
                    </>
                ) : (
                    <div className="flex w-full flex-col items-center gap-4 rounded-[24px] border border-[#c3c6d7] bg-white p-10 text-center shadow-[0px_4px_20px_rgba(0,0,0,0.03)]">
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(0,74,198,0.05)]">
                            <QrCode size={28} className="text-[#004AC6]" />
                        </span>
                        <p className="text-[16px] font-semibold text-[#191C1D]">No tienes un pase activo</p>
                        <p className="text-[13px] text-[#434655]">Genera un pase para que tu visita pueda ingresar al condominio.</p>
                        <button
                            onClick={() => router.push('/residente/servicios')}
                            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#004AC6] text-[14px] font-semibold text-white"
                        >
                            <UserPlus size={16} />
                            Generar pase de visita
                        </button>
                    </div>
                )}
            </main>
        </div>
    )
}
