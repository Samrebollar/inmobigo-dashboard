'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
    ClipboardList, Play, Check, Loader2, ChevronDown, Camera, Send,
    Building2, Calendar, CheckCircle2, RefreshCw, AlertTriangle, X,
} from 'lucide-react'
import type { TeamTask, TaskChecklistItem, TaskComment, TaskArea } from '@/types/team-tasks'
import { TASK_AREA_ICONS } from '@/types/team-tasks'
import {
    getMyTasksAction,
    getTeamTaskByIdAction,
    startTaskAction,
    completeTaskAction,
    toggleChecklistItemAction,
    addTaskCommentAction,
    addTaskEvidenceAction,
} from '@/app/actions/team-tasks-actions'

const PRIORITY: Record<string, { label: string; cls: string }> = {
    urgent: { label: 'Urgente', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
    high: { label: 'Alta', cls: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
    medium: { label: 'Media', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    low: { label: 'Baja', cls: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
}

const todayStr = () => new Date().toLocaleDateString('en-CA')

function dueLabel(task: TeamTask) {
    if (!task.due_date) return { text: 'Sin fecha límite', overdue: false }
    const today = todayStr()
    if (task.status !== 'completed' && task.due_date < today) {
        const days = Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${task.due_date}T12:00:00`).getTime()) / 86400000)
        return { text: `Vencida hace ${days} día${days === 1 ? '' : 's'}`, overdue: true }
    }
    if (task.due_date === today) return { text: 'Vence hoy', overdue: false }
    const d = new Date(`${task.due_date}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
    return { text: `Vence ${d}`, overdue: false }
}

/** Reduce la foto antes de subirla (las del celular pesan varios MB). */
async function compressImage(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo procesar la foto'))), 'image/jpeg', 0.8)
    )
}

interface Ctx { orgId: string; userId: string; userName: string }
interface Details { checklist: TaskChecklistItem[]; comments: TaskComment[] }

export function MisTareasClient() {
    const [tasks, setTasks] = useState<TeamTask[]>([])
    const [ctx, setCtx] = useState<Ctx | null>(null)
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState<string | null>(null)
    const [details, setDetails] = useState<Record<string, Details>>({})
    const [busy, setBusy] = useState<string | null>(null)
    const [comment, setComment] = useState('')
    // Confirmación al completar con pasos del checklist sin marcar
    const [confirmTask, setConfirmTask] = useState<{ task: TeamTask; pendingSteps: number } | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const load = useCallback(async () => {
        const r = await getMyTasksAction()
        if (r.success && 'organizationId' in r) {
            setTasks(r.tasks)
            setCtx({ orgId: r.organizationId as string, userId: r.userId as string, userName: r.userName as string })
        } else {
            toast.error(r.error || 'No se pudieron cargar tus tareas')
        }
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const loadDetails = async (taskId: string) => {
        const r = await getTeamTaskByIdAction(taskId)
        if (r.success && r.task) {
            setDetails(prev => ({ ...prev, [taskId]: { checklist: r.task!.checklist_items || [], comments: r.task!.comments || [] } }))
        }
    }

    const toggleExpand = (taskId: string) => {
        setComment('')
        if (expanded === taskId) return setExpanded(null)
        setExpanded(taskId)
        loadDetails(taskId)
    }

    const me = ctx ? { id: ctx.userId, name: ctx.userName } : null

    const handleStart = async (task: TeamTask) => {
        if (!ctx || !me) return
        setBusy(task.id)
        const r = await startTaskAction(task.id, ctx.orgId, me)
        setBusy(null)
        if (!r.success) return toast.error(r.error || 'No se pudo iniciar')
        toast.success('¡Tarea iniciada!')
        load()
    }

    const handleComplete = async (task: TeamTask, force = false) => {
        if (!ctx || !me) return
        const pendingSteps = (details[task.id]?.checklist || []).filter(i => !i.is_completed).length
        if (pendingSteps > 0 && !force) {
            setConfirmTask({ task, pendingSteps })
            return
        }
        setConfirmTask(null)
        setBusy(task.id)
        const r = await completeTaskAction(task.id, ctx.orgId, me)
        setBusy(null)
        if (!r.success) return toast.error(r.error || 'No se pudo completar')
        toast.success('¡Tarea completada! ✅')
        setExpanded(null)
        load()
    }

    const handleToggle = async (taskId: string, item: TaskChecklistItem) => {
        if (!me) return
        setDetails(prev => ({
            ...prev,
            [taskId]: { ...prev[taskId], checklist: prev[taskId].checklist.map(i => i.id === item.id ? { ...i, is_completed: !item.is_completed } : i) },
        }))
        const r = await toggleChecklistItemAction(item.id, !item.is_completed, me)
        if (!r.success) {
            toast.error('No se pudo guardar el paso')
            loadDetails(taskId)
        }
    }

    const handleComment = async (taskId: string) => {
        const body = comment.trim()
        if (!body || !ctx || !me) return
        setBusy(taskId)
        const r = await addTaskCommentAction(taskId, ctx.orgId, me, body)
        setBusy(null)
        if (!r.success) return toast.error(r.error || 'No se pudo enviar')
        setComment('')
        loadDetails(taskId)
    }

    const handlePhoto = async (taskId: string, file?: File | null) => {
        if (!file) return
        setBusy(taskId)
        try {
            const blob = await compressImage(file)
            const fd = new FormData()
            fd.append('task_id', taskId)
            fd.append('file', new File([blob], 'evidencia.jpg', { type: 'image/jpeg' }))
            if (comment.trim()) fd.append('note', comment.trim())
            const r = await addTaskEvidenceAction(fd)
            if (!r.success) throw new Error(r.error)
            setComment('')
            toast.success('Foto enviada a la administración 📷')
            loadDetails(taskId)
        } catch (err: any) {
            toast.error(err?.message || 'No se pudo subir la foto')
        } finally {
            setBusy(null)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    const inProgress = tasks.filter(t => t.status === 'in_progress')
    const pending = tasks.filter(t => t.status === 'pending')
    const done = tasks.filter(t => t.status === 'completed')

    const renderTask = (task: TeamTask) => {
        const p = PRIORITY[task.priority] || PRIORITY.medium
        const due = dueLabel(task)
        const isOpen = expanded === task.id
        const d = details[task.id]
        const stepsDone = d?.checklist.filter(i => i.is_completed).length || 0

        return (
            <div key={task.id} className={`rounded-2xl border bg-zinc-900/60 transition-colors ${due.overdue ? 'border-orange-500/40' : 'border-zinc-800'}`}>
                <button onClick={() => toggleExpand(task.id)} className="w-full text-left p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg shrink-0">
                        {TASK_AREA_ICONS[task.area as TaskArea] || '📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${p.cls}`}>{p.label}</span>
                            <span className={`text-[11px] font-semibold flex items-center gap-1 ${due.overdue ? 'text-orange-400' : 'text-zinc-500'}`}>
                                <Calendar size={11} /> {due.text}
                            </span>
                        </div>
                        <p className={`font-bold leading-snug ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-white'}`}>{task.title}</p>
                        {task.property_name && (
                            <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1"><Building2 size={11} /> {task.property_name}</p>
                        )}
                    </div>
                    <ChevronDown size={18} className={`text-zinc-500 shrink-0 mt-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="px-4 pb-4 space-y-4 border-t border-zinc-800 pt-4">
                        {task.description && <p className="text-sm text-zinc-300 whitespace-pre-wrap">{task.description}</p>}

                        {task.images && task.images.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {task.images.map((img, i) => (
                                    <a key={i} href={img} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden border border-zinc-800">
                                        <img src={img} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                                    </a>
                                ))}
                            </div>
                        )}

                        {!d ? (
                            <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-zinc-500" /></div>
                        ) : (
                            <>
                                {d.checklist.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold text-zinc-400 mb-2">Pasos · {stepsDone}/{d.checklist.length}</p>
                                        <div className="space-y-1.5">
                                            {d.checklist.map(item => (
                                                <label key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.is_completed}
                                                        disabled={task.status === 'completed'}
                                                        onChange={() => handleToggle(task.id, item)}
                                                        className="h-4 w-4 accent-emerald-500"
                                                    />
                                                    <span className={`text-sm ${item.is_completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {d.comments.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-zinc-400">Comentarios</p>
                                        {d.comments.map(c => (
                                            <div key={c.id} className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800">
                                                <p className="text-[11px] font-bold text-indigo-300">{c.author_name}</p>
                                                <p className="text-sm text-zinc-300">{c.body}</p>
                                                {c.attachments && c.attachments.length > 0 && (
                                                    <div className="flex gap-2 mt-2">
                                                        {c.attachments.map((url, i) => (
                                                            <a key={i} href={url} target="_blank" rel="noreferrer" className="w-20 h-20 rounded-lg overflow-hidden border border-zinc-800">
                                                                <img src={url} alt="evidencia" className="w-full h-full object-cover" />
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {task.status !== 'completed' && (
                                    <div className="flex gap-2">
                                        <input
                                            value={comment}
                                            onChange={e => setComment(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleComment(task.id) } }}
                                            placeholder="Escribe un comentario para la administración..."
                                            className="flex-1 min-w-0 bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                                        />
                                        <button
                                            onClick={() => fileRef.current?.click()}
                                            disabled={busy === task.id}
                                            title="Tomar o subir foto"
                                            className="h-11 w-11 shrink-0 rounded-xl border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 flex items-center justify-center disabled:opacity-40"
                                        >
                                            <Camera size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleComment(task.id)}
                                            disabled={busy === task.id || !comment.trim()}
                                            className="h-11 w-11 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center disabled:opacity-40"
                                        >
                                            <Send size={16} />
                                        </button>
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={e => handlePhoto(task.id, e.target.files?.[0])}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {task.status === 'pending' && (
                            <button
                                onClick={() => handleStart(task)}
                                disabled={busy === task.id}
                                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {busy === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play size={16} />} Iniciar tarea
                            </button>
                        )}
                        {task.status === 'in_progress' && (
                            <button
                                onClick={() => handleComplete(task)}
                                disabled={busy === task.id}
                                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {busy === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check size={16} />} Marcar como completada
                            </button>
                        )}
                    </div>
                )}
            </div>
        )
    }

    // Función de render (no componente): así el cuadro de comentario no se
    // vuelve a montar —y pierde el foco— con cada tecla
    const renderSection = (title: string, items: TeamTask[], empty?: string) => (
        <section key={title} className="space-y-3">
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">{title} · {items.length}</h2>
            {items.length === 0 ? (
                empty ? <p className="text-sm text-zinc-600">{empty}</p> : null
            ) : items.map(renderTask)}
        </section>
    )

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <ClipboardList size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Mis Tareas</h1>
                        <p className="text-sm text-zinc-500">Lo que te asignó la administración.</p>
                    </div>
                </div>
                <button onClick={() => { setLoading(true); load() }} className="p-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white" title="Actualizar">
                    <RefreshCw size={16} />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
            ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <CheckCircle2 size={40} className="text-emerald-500/60" />
                    <p className="font-bold text-zinc-300">No tienes tareas pendientes</p>
                    <p className="text-sm text-zinc-600">Cuando la administración te asigne una, aparecerá aquí y te llegará un WhatsApp.</p>
                </div>
            ) : (
                <>
                    {inProgress.length > 0 && renderSection('En proceso', inProgress)}
                    {renderSection('Por hacer', pending, 'Nada por hacer 🎉')}
                    {done.length > 0 && renderSection('Completadas (últimos 7 días)', done)}
                </>
            )}

            <AnimatePresence>
                {confirmTask && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-7 shadow-2xl"
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                                    <AlertTriangle size={22} />
                                </div>
                                <button onClick={() => setConfirmTask(null)} className="p-2 text-zinc-500 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>
                            <h3 className="mb-2 text-lg font-black text-white">
                                {confirmTask.pendingSteps === 1 ? 'Te falta 1 paso del checklist' : `Te faltan ${confirmTask.pendingSteps} pasos del checklist`}
                            </h3>
                            <p className="mb-6 text-sm leading-relaxed text-zinc-400">
                                ¿Quieres marcar <span className="font-semibold text-zinc-200">&quot;{confirmTask.task.title}&quot;</span> como completada de todos modos? La administración verá los pasos que quedaron sin marcar.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmTask(null)}
                                    className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
                                >
                                    Revisar pasos
                                </button>
                                <button
                                    onClick={() => handleComplete(confirmTask.task, true)}
                                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 flex items-center justify-center gap-2"
                                >
                                    <Check className="h-4 w-4" /> Completar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
