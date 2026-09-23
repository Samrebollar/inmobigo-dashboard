'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Loader2, Search, Home, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import {
    getAdminMessageThreadsAction,
    getAdminThreadMessagesAction,
    sendAdminMessageAction,
} from '@/app/actions/resident-messages-actions'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

interface ThreadSummary {
    residentId: string
    residentName: string
    unitNumber: string | null
    residentAvatarUrl?: string | null
    lastMessage: string
    lastMessageAt: string
    lastSenderRole: 'resident' | 'admin'
    unreadCount: number
}

interface ThreadMessage {
    id: string
    resident_id: string
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

function Avatar({ url, name, size = 32 }: { url?: string | null, name?: string | null, size?: number }) {
    return (
        <div
            className="rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-white/5"
            style={{ width: size, height: size }}
        >
            {url ? (
                <img src={url} alt={name || 'Avatar'} className="h-full w-full object-cover" />
            ) : (
                <User className="text-zinc-500" size={size * 0.55} />
            )}
        </div>
    )
}

export function MensajesAdminClient({ organizationId, adminUserId }: { organizationId: string, adminUserId: string }) {
    const supabase = createClient()
    const [threads, setThreads] = useState<ThreadSummary[]>([])
    const [loadingThreads, setLoadingThreads] = useState(true)
    const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null)
    const [messages, setMessages] = useState<ThreadMessage[]>([])
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [draft, setDraft] = useState('')
    const [sending, setSending] = useState(false)
    const [search, setSearch] = useState('')
    const scrollRef = useRef<HTMLDivElement>(null)

    const loadThreads = async () => {
        const res = await getAdminMessageThreadsAction()
        if (res.success) {
            const sorted = [...(res.data as ThreadSummary[])].sort(
                (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
            )
            setThreads(sorted)
        }
        setLoadingThreads(false)
    }

    const loadMessages = async (residentId: string, { silent = false }: { silent?: boolean } = {}) => {
        if (!silent) setLoadingMessages(true)
        const res = await getAdminThreadMessagesAction(residentId)
        if (res.success) {
            setMessages(prev => {
                const fresh = res.data as ThreadMessage[]
                // Evita parpadeos: si no cambió nada, no reemplaza el arreglo.
                if (prev.length === fresh.length && prev.every((m, i) => m.id === fresh[i]?.id)) return prev
                return fresh
            })
            setThreads(prev => prev.map(t => t.residentId === residentId ? { ...t, unreadCount: 0 } : t))
        }
        if (!silent) setLoadingMessages(false)
    }

    useEffect(() => {
        loadThreads()
        // Respaldo por si el evento de Realtime no llega (ver nota más abajo):
        // refresca la bandeja cada 8s para que un mensaje nuevo de un residente
        // sin hilo previo aparezca sin necesidad de recargar la página a mano.
        const interval = setInterval(loadThreads, 8000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (!selectedResidentId) return
        loadMessages(selectedResidentId)

        // Respaldo del mismo tipo para la conversación abierta: Supabase
        // Realtime a veces no entrega el evento de INSERT (visto en producción
        // — el admin tenía que recargar la página para ver un mensaje nuevo
        // del residente), así que además de la suscripción de abajo se
        // refresca en silencio cada 4s mientras el hilo está abierto.
        const interval = setInterval(() => loadMessages(selectedResidentId, { silent: true }), 4000)
        return () => clearInterval(interval)
    }, [selectedResidentId])

    useEffect(() => {
        const channel = supabase
            .channel(`admin-messages-${organizationId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'resident_messages', filter: `organization_id=eq.${organizationId}` },
                (payload) => {
                    const incoming = payload.new as ThreadMessage

                    setMessages(prev => {
                        if (incoming.resident_id !== selectedResidentId) return prev
                        return prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]
                    })

                    let residentIsNew = false
                    const isOpenThread = incoming.resident_id === selectedResidentId

                    setThreads(prev => {
                        const existing = prev.find(t => t.residentId === incoming.resident_id)
                        if (!existing) {
                            residentIsNew = true
                            return prev
                        }
                        const updated = prev.map(t => t.residentId === incoming.resident_id ? {
                            ...t,
                            lastMessage: incoming.body,
                            lastMessageAt: incoming.created_at,
                            lastSenderRole: incoming.sender_role,
                            unreadCount: incoming.sender_role === 'resident' && !isOpenThread ? t.unreadCount + 1 : t.unreadCount,
                        } : t)
                        return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
                    })

                    // Residente sin hilo previo: recargar para traer su nombre/unidad
                    if (residentIsNew) loadThreads()
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [organizationId, selectedResidentId, supabase])

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages.length])

    const filteredThreads = useMemo(() => {
        if (!search.trim()) return threads
        const q = search.toLowerCase()
        return threads.filter(t => t.residentName.toLowerCase().includes(q) || t.unitNumber?.toLowerCase().includes(q))
    }, [threads, search])

    const selectedThread = threads.find(t => t.residentId === selectedResidentId) || null

    const handleSend = async () => {
        const body = draft.trim()
        if (!body || !selectedResidentId || sending) return

        setSending(true)
        setDraft('')
        try {
            const res = await sendAdminMessageAction(selectedResidentId, body)
            if (!res.success) {
                toast.error(res.error || 'No se pudo enviar el mensaje')
                setDraft(body)
                return
            }
            if (res.data) {
                setMessages(prev => prev.some(m => m.id === res.data.id) ? prev : [...prev, res.data as ThreadMessage])
                setThreads(prev => {
                    const updated = prev.map(t => t.residentId === selectedResidentId ? {
                        ...t, lastMessage: body, lastMessageAt: res.data.created_at, lastSenderRole: 'admin' as const,
                    } : t)
                    return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
                })
            }
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                    <MessageCircle size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Mensajes</h2>
                    <p className="text-xs text-zinc-500 font-medium">Conversaciones directas con tus residentes.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-5 h-[calc(100vh-220px)] min-h-[500px]">
                {/* Lista de hilos */}
                <div className="bg-zinc-900/40 border-2 border-indigo-500/30 rounded-2xl flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-zinc-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar residente..."
                                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loadingThreads ? (
                            <div className="flex items-center justify-center h-32 text-zinc-600">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        ) : filteredThreads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-center gap-2 text-zinc-600 px-4">
                                <MessageCircle className="h-8 w-8 opacity-40" />
                                <p className="text-sm">Todavía no hay mensajes de residentes.</p>
                            </div>
                        ) : (
                            filteredThreads.map(thread => (
                                <button
                                    key={thread.residentId}
                                    onClick={() => setSelectedResidentId(thread.residentId)}
                                    className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors flex gap-3 ${
                                        selectedResidentId === thread.residentId ? 'bg-indigo-500/10' : ''
                                    }`}
                                >
                                    <Avatar url={thread.residentAvatarUrl} name={thread.residentName} size={36} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-bold text-white truncate">{thread.residentName}</p>
                                            {thread.unreadCount > 0 && (
                                                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                                                    {thread.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
                                            {thread.unitNumber && (
                                                <span className="flex items-center gap-1"><Home size={10} /> {thread.unitNumber}</span>
                                            )}
                                            <span className="ml-auto shrink-0">{formatMessageTime(thread.lastMessageAt)}</span>
                                        </div>
                                        <p className="text-xs text-zinc-500 truncate mt-1">
                                            {thread.lastSenderRole === 'admin' ? 'Tú: ' : ''}{thread.lastMessage}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Hilo activo */}
                <div className="bg-zinc-900/40 border-2 border-emerald-500/30 rounded-2xl flex flex-col overflow-hidden">
                    {!selectedResidentId ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-600">
                            <MessageCircle className="h-10 w-10 opacity-30" />
                            <p className="text-sm">Selecciona una conversación</p>
                        </div>
                    ) : (
                        <>
                            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
                                <Avatar url={selectedThread?.residentAvatarUrl} name={selectedThread?.residentName} size={36} />
                                <div>
                                    <p className="font-bold text-white leading-tight">{selectedThread?.residentName}</p>
                                    {selectedThread?.unitNumber && (
                                        <span className="text-xs text-zinc-500 flex items-center gap-1"><Home size={11} /> {selectedThread.unitNumber}</span>
                                    )}
                                </div>
                            </div>

                            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                {loadingMessages ? (
                                    <div className="flex items-center justify-center h-full text-zinc-600">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    </div>
                                ) : (
                                    <AnimatePresence initial={false}>
                                        {messages.map(m => (
                                            <motion.div
                                                key={m.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex items-end gap-2 ${m.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {m.sender_role === 'resident' && (
                                                    <Avatar url={m.sender_avatar_url} name={m.sender_name} size={26} />
                                                )}
                                                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                                                    m.sender_role === 'admin'
                                                        ? 'bg-indigo-600 text-white rounded-br-sm'
                                                        : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                                                }`}>
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                                                    <p className={`text-[10px] mt-1 ${m.sender_role === 'admin' ? 'text-indigo-200/70' : 'text-zinc-500'}`}>
                                                        {formatMessageTime(m.created_at)}
                                                    </p>
                                                </div>
                                                {m.sender_role === 'admin' && (
                                                    <Avatar url={m.sender_avatar_url} name={m.sender_name} size={26} />
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>

                            <div className="flex items-end gap-2 p-4 border-t border-zinc-800">
                                <textarea
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            handleSend()
                                        }
                                    }}
                                    placeholder="Responder..."
                                    rows={1}
                                    className="flex-1 resize-none bg-zinc-950/60 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={sending || !draft.trim()}
                                    className="h-11 w-11 shrink-0 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white flex items-center justify-center transition-all active:scale-95"
                                    title="Enviar mensaje"
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
