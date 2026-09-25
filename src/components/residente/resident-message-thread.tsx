'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { getResidentMessageThreadAction, sendResidentMessageAction } from '@/app/actions/resident-messages-actions'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

interface ThreadMessage {
    id: string
    sender_role: 'resident' | 'admin'
    sender_name: string | null
    sender_avatar_url?: string | null
    body: string
    created_at: string
    read_at: string | null
}

function formatMessageTime(iso: string) {
    const date = new Date(iso)
    if (isToday(date)) return format(date, 'HH:mm')
    if (isYesterday(date)) return `Ayer ${format(date, 'HH:mm')}`
    return format(date, "d MMM, HH:mm", { locale: es })
}

const AVATAR_COLORS = [
    'bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
    'bg-sky-500', 'bg-violet-500', 'bg-teal-500', 'bg-fuchsia-500',
]

function getInitials(name?: string | null) {
    const trimmed = (name || '').trim()
    if (!trimmed) return '?'
    const parts = trimmed.split(/\s+/)
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

function getAvatarColor(name?: string | null) {
    const str = name || ''
    let hash = 0
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({ url, name, size = 26 }: { url?: string | null, name?: string | null, size?: number }) {
    return (
        <div
            className={`rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-white/5 ${url ? 'bg-zinc-800' : getAvatarColor(name)}`}
            style={{ width: size, height: size }}
        >
            {url ? (
                <img src={url} alt={name || 'Avatar'} className="h-full w-full object-cover" />
            ) : (
                <span className="font-bold text-white" style={{ fontSize: size * 0.4 }}>{getInitials(name)}</span>
            )}
        </div>
    )
}

export function ResidentMessageThread({ adminName }: { adminName: string }) {
    const supabase = createClient()
    const [messages, setMessages] = useState<ThreadMessage[]>([])
    const [residentId, setResidentId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [draft, setDraft] = useState('')
    const [sending, setSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let isMounted = true

        async function load() {
            const res = await getResidentMessageThreadAction()
            if (!isMounted) return
            if (res.success) {
                setMessages(res.data as ThreadMessage[])
                setResidentId(res.residentId || null)
            }
            setLoading(false)
        }
        load()

        return () => { isMounted = false }
    }, [])

    useEffect(() => {
        if (!residentId) return

        const channel = supabase
            .channel(`resident-messages-${residentId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'resident_messages', filter: `resident_id=eq.${residentId}` },
                (payload) => {
                    const incoming = payload.new as ThreadMessage
                    setMessages(prev => prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming])
                }
            )
            .subscribe()

        // Respaldo silencioso por si el evento de Realtime no llega: refresca
        // el hilo cada 4s mientras la pantalla está abierta, para que la
        // respuesta del admin no dependa solo del INSERT en vivo.
        const interval = setInterval(async () => {
            const res = await getResidentMessageThreadAction()
            // Se reemplaza siempre (no solo cuando cambia el conteo): un
            // mensaje del admin que llegó por Realtime entra sin foto de
            // perfil (el payload crudo de Postgres no trae ese campo, se
            // calcula aparte en el server action), así que este refresco
            // también sirve para completarla.
            if (res.success) setMessages(res.data as ThreadMessage[])
        }, 4000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(interval)
        }
    }, [residentId, supabase])

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages.length])

    const handleSend = async () => {
        const body = draft.trim()
        if (!body || sending) return

        setSending(true)
        setDraft('')
        try {
            const res = await sendResidentMessageAction(body)
            if (!res.success) {
                toast.error(res.error || 'No se pudo enviar el mensaje')
                setDraft(body)
                return
            }
            if (res.data) {
                setMessages(prev => prev.some(m => m.id === res.data.id) ? prev : [...prev, res.data as ThreadMessage])
            }
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-1 pb-4">
                <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                    <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-white font-bold leading-tight">Escríbele a {adminName}</p>
                    <p className="text-xs text-zinc-500">Tu mensaje llega directo a la administración.</p>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 min-h-[280px] max-h-[420px] overflow-y-auto space-y-3 px-1 py-2"
            >
                {loading ? (
                    <div className="flex items-center justify-center h-full text-zinc-600">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-zinc-600 py-10">
                        <MessageCircle className="h-8 w-8 opacity-40" />
                        <p className="text-sm">Todavía no hay mensajes. Escribe el primero.</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map((m) => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex items-end gap-2 ${m.sender_role === 'resident' ? 'justify-end' : 'justify-start'}`}
                            >
                                {m.sender_role === 'admin' && (
                                    <Avatar url={m.sender_avatar_url} name={m.sender_name} />
                                )}
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                                        m.sender_role === 'resident'
                                            ? 'bg-indigo-600 text-white rounded-br-sm'
                                            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                                    }`}
                                >
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                                    <p className={`text-[10px] mt-1 ${m.sender_role === 'resident' ? 'text-indigo-200/70' : 'text-zinc-500'}`}>
                                        {formatMessageTime(m.created_at)}
                                    </p>
                                </div>
                                {m.sender_role === 'resident' && (
                                    <Avatar url={m.sender_avatar_url} name={m.sender_name} />
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            <div className="flex items-end gap-2 pt-3 border-t border-zinc-800/50 mt-2">
                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                        }
                    }}
                    placeholder="Escribe tu mensaje..."
                    rows={1}
                    disabled={loading || !residentId}
                    className="flex-1 resize-none bg-zinc-950/60 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
                />
                <button
                    onClick={handleSend}
                    disabled={loading || sending || !draft.trim() || !residentId}
                    className="h-11 w-11 shrink-0 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white flex items-center justify-center transition-all active:scale-95"
                    title="Enviar mensaje"
                >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
            </div>
        </div>
    )
}
