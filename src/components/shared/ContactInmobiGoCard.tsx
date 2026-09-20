'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { MessageSquare, Loader2, Send } from 'lucide-react'
import { contactInmobiGoAction } from '@/app/actions/contact-actions'
import { toast } from 'sonner'

export function ContactInmobiGoCard({
    organizationName,
    adminName,
    adminPhone
}: {
    organizationName?: string | null
    adminName: string
    adminPhone?: string | null
}) {
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)

    const handleSend = async () => {
        if (!message.trim()) {
            toast.error('Escribe un mensaje antes de enviarlo.')
            return
        }

        setSending(true)
        try {
            const result = await contactInmobiGoAction({
                organizationName,
                adminName,
                adminPhone: adminPhone || null,
                mensaje: message.trim(),
            })

            if (!result.success) throw new Error(result.error)

            setMessage('')
            toast.success('Mensaje enviado a InmobiGo por WhatsApp. Te responderán lo antes posible.')
        } catch (error: any) {
            console.error('Error contactando a InmobiGo:', error)
            toast.error(`No se pudo enviar el mensaje: ${error.message || 'Error de red'}`)
        } finally {
            setSending(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 hover:bg-zinc-900/80 hover:border-emerald-500/30 transition-all shadow-lg hover:shadow-emerald-500/5 relative overflow-hidden"
        >
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-2 relative z-10">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-400" /> Contactar a InmobiGo
                </h2>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    WhatsApp
                </div>
            </div>
            <p className="text-sm text-zinc-500 mb-4 relative z-10">
                Escribe tu duda o solicitud y la recibirá directamente nuestro equipo de soporte por WhatsApp.
            </p>
            <div className="space-y-3 relative z-10">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ej. Necesito ayuda para configurar la facturación de mi condominio..."
                    rows={4}
                    maxLength={1000}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 focus:outline-none transition-all resize-none"
                />
                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-600">{message.length}/1000</span>
                    <Button
                        onClick={handleSend}
                        disabled={sending || !message.trim()}
                        className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 gap-2"
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Enviar mensaje
                    </Button>
                </div>
            </div>
        </motion.div>
    )
}
