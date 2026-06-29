'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import {
    Activity, ShieldAlert, ClipboardList, AlertTriangle,
    CheckCircle2, Users, Clock, LayoutList, Kanban,
    Plus, RefreshCw, X, Search,
    MapPin, User, Calendar,
    MoreVertical, Copy, Trash2, Play, Check, ArrowRight,
    Building2, Maximize2, ChevronDown
} from 'lucide-react'
import { PremiumCard } from '@/components/ui/PremiumCard'
import type { TeamTask, OperationsKPIs, TaskArea, TaskPriority, TaskStatus } from '@/types/team-tasks'
import { TASK_AREA_LABELS as AREA_LABELS, TASK_AREA_ICONS } from '@/types/team-tasks'
import {
    getTeamTasksAction,
    getOperationsKPIsAction,
    createTaskAction,
    updateTaskAction,
    startTaskAction,
    completeTaskAction,
    deleteTaskAction,
    duplicateTaskAction,
    addTaskCommentAction,
    toggleChecklistItemAction,
    addChecklistItemAction,
} from '@/app/actions/team-tasks-actions'
import { addIncidentCommentAction, getIncidentCommentsAction } from '@/app/actions/incident-comments-actions'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; dot: string }> = {
    pending:     { label: 'Pendiente',   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',    dot: 'bg-amber-400' },
    in_progress: { label: 'En proceso',  color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30',      dot: 'bg-blue-400' },
    completed:   { label: 'Completada',  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400' },
    cancelled:   { label: 'Cancelada',   color: 'text-zinc-500',    bg: 'bg-zinc-800/50 border-zinc-700/30',      dot: 'bg-zinc-500' },
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; glow: string }> = {
    low:    { label: 'Baja',     color: 'text-zinc-400',   glow: 'zinc' },
    medium: { label: 'Media',    color: 'text-amber-400',  glow: 'amber' },
    high:   { label: 'Alta',     color: 'text-orange-400', glow: 'amber' },
    urgent: { label: 'Urgente',  color: 'text-rose-400',   glow: 'rose' },
}

const INCIDENT_PRIORITY_CONFIG: Record<string, { label: string; color: string; glow: string }> = {
    urgent:   { label: '🚨 Urgente', color: 'text-rose-400',   glow: 'rose' },
    critical: { label: '🚨 Crítica', color: 'text-rose-400',   glow: 'rose' },
    high:     { label: '🟠 Alta',    color: 'text-orange-400', glow: 'amber' },
    medium:   { label: '🟡 Media',   color: 'text-amber-400',  glow: 'amber' },
    low:      { label: '⚪ Baja',    color: 'text-zinc-400',   glow: 'zinc' },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedIncident {
    id: string
    title: string
    description: string
    priority: string
    status: string
    location: string
    guard: string
    condominium?: string
    condominium_id?: string
    created_at: string
    images?: string[]
    isNew?: boolean
}

type ActiveTab = 'incidencias' | 'tareas'
type TaskView = 'list' | 'kanban'

interface UserContext {
    userId: string
    orgId: string
    userName: string
    properties: Array<{ id: string; name: string }>
    teamMembers: Array<{ id: string; full_name: string; role: string; email: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseIncident(t: any): ParsedIncident {
    const guardMatch = t.description?.match(/\[OFICIAL: (.*?)\]/)
    const locMatch = t.description?.match(/\[UBICACIÓN: (.*?)\]/)
    const cleanDesc = t.description?.replace(/\[OFICIAL: .*?\] \[UBICACIÓN: .*?\]\n\n/, '') || t.description
    return {
        id: t.id,
        title: t.title,
        description: cleanDesc,
        priority: t.priority || 'low',
        status: t.status,
        location: t.location || (locMatch ? locMatch[1] : 'No especificada'),
        guard: t.assigned_to_name || t.reported_by_name || (guardMatch ? guardMatch[1] : 'Oficial'),
        condominium: t.condominiums?.name,
        condominium_id: t.condominium_id,
        created_at: t.created_at,
        images: t.images || [],
        isNew: false,
    }
}

function fmtDate(d?: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
}
function fmtTime(d?: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}
function fmtDateTime(d?: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function isOverdue(task: TeamTask) {
    if (!task.due_date) return false
    if (task.status === 'completed' || task.status === 'cancelled') return false
    return task.due_date < new Date().toISOString().split('T')[0]
}

// ─── KPI Bar ──────────────────────────────────────────────────────────────────

function KPIBar({ kpis, loading }: { kpis: OperationsKPIs | null; loading: boolean }) {
    const cards = [
        { label: 'Incidencias activas', value: kpis?.active_incidents ?? 0, icon: ShieldAlert, color: 'text-blue-400', bg: 'bg-blue-500/10', glow: 'blue' },
        { label: 'Incidencias críticas', value: kpis?.critical_incidents ?? 0, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10', glow: 'rose' },
        { label: 'Tareas pendientes', value: kpis?.pending_tasks ?? 0, icon: ClipboardList, color: 'text-amber-400', bg: 'bg-amber-500/10', glow: 'amber' },
        { label: 'Tareas vencidas', value: kpis?.overdue_tasks ?? 0, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10', glow: 'amber' },
        { label: 'Completadas hoy', value: kpis?.completed_today ?? 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', glow: 'emerald' },
        { label: 'Personal trabajando', value: kpis?.staff_working ?? 0, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10', glow: 'indigo' },
    ]
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {cards.map((c, i) => (
                <PremiumCard key={c.label} glowColor={c.glow} delay={i * 0.05} hover={false} className="!p-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 truncate">{c.label}</p>
                            <h3 className={`text-3xl font-black tracking-tighter mt-1 ${c.color}`}>
                                {loading ? <span className="inline-block w-6 h-6 bg-white/10 rounded animate-pulse" /> : c.value}
                            </h3>
                        </div>
                        <div className={`p-2 rounded-xl ${c.bg} shrink-0`}>
                            <c.icon size={18} className={c.color} />
                        </div>
                    </div>
                </PremiumCard>
            ))}
        </div>
    )
}

// ─── Custom Premium Dropdown ──────────────────────────────────────────────────

interface DropdownOption<T> {
    value: T
    label: string
    icon?: string | React.ReactNode
}

interface CustomDropdownProps<T> {
    options: DropdownOption<T>[]
    value: T
    onChange: (val: T) => void
    placeholder?: string
    className?: string
}

function CustomDropdown<T extends string>({
    options,
    value,
    onChange,
    placeholder = 'Seleccionar...',
    className = '',
}: CustomDropdownProps<T>) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleOutsideClick)
        return () => document.removeEventListener('mousedown', handleOutsideClick)
    }, [])

    const selectedOption = options.find(opt => opt.value === value)

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.08] active:bg-white/[0.12] rounded-xl text-xs text-zinc-300 font-medium transition-all cursor-pointer focus:outline-none focus:border-indigo-500/50"
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.icon && (
                        <span className="shrink-0">{selectedOption.icon}</span>
                    )}
                    <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                </div>
                <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-zinc-300' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute left-0 mt-1.5 z-[100] w-full min-w-[200px] max-h-60 overflow-y-auto bg-[#0d0d12]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl py-1 focus:outline-none scrollbar-thin"
                    >
                        {options.map((option, idx) => {
                            const isSelected = option.value === value
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value)
                                        setIsOpen(false)
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/[0.06] ${
                                        isSelected 
                                            ? 'text-indigo-400 bg-indigo-500/10 font-bold' 
                                            : 'text-zinc-300 hover:text-white'
                                    }`}
                                >
                                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                                    <span className="truncate">{option.label}</span>
                                    {isSelected && <Check size={12} className="ml-auto text-indigo-400 shrink-0" />}
                                </button>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── Premium Date Picker ──────────────────────────────────────────────────

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES = ['L','M','M','J','V','S','D']

function DatePickerField({
    value,
    onChange,
    placeholder = 'Seleccionar fecha',
    withTime = false,
}: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
    withTime?: boolean
}) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const now = new Date()

    const parseDate = (v: string) => {
        if (!v) return null
        const d = new Date(v.includes('T') ? v : v + 'T12:00:00')
        return isNaN(d.getTime()) ? null : d
    }

    const selectedDate = parseDate(value)
    const [viewYear, setViewYear] = useState(() => selectedDate?.getFullYear() || now.getFullYear())
    const [viewMonth, setViewMonth] = useState(() => selectedDate?.getMonth() ?? now.getMonth())
    const [timeHH, setTimeHH] = useState(() => {
        if (!value || !withTime) return '08'
        return value.split('T')[1]?.slice(0,2) || '08'
    })
    const [timeMM, setTimeMM] = useState(() => {
        if (!value || !withTime) return '00'
        return value.split('T')[1]?.slice(3,5) || '00'
    })

    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
        }
        document.addEventListener('mousedown', handleOutside)
        return () => document.removeEventListener('mousedown', handleOutside)
    }, [])

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const firstDayRaw = new Date(viewYear, viewMonth, 1).getDay()
    const firstDay = firstDayRaw === 0 ? 6 : firstDayRaw - 1

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
        else setViewMonth(m => m - 1)
    }
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
        else setViewMonth(m => m + 1)
    }

    const emit = (year: number, month: number, day: number, hh: string, mm: string) => {
        const yyyy = year
        const mo = String(month + 1).padStart(2, '0')
        const dd = String(day).padStart(2, '0')
        if (withTime) {
            onChange(`${yyyy}-${mo}-${dd}T${hh}:${mm}`)
        } else {
            onChange(`${yyyy}-${mo}-${dd}`)
        }
    }

    const handleSelectDay = (day: number) => {
        emit(viewYear, viewMonth, day, timeHH, timeMM)
        if (!withTime) setIsOpen(false)
    }

    const handleTimeChange = (hh: string, mm: string) => {
        if (!selectedDate) return
        emit(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hh, mm)
    }

    const formatDisplay = () => {
        if (!selectedDate) return null
        const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
        const dateStr = selectedDate.toLocaleDateString('es-MX', opts)
        if (withTime) return `${dateStr} — ${timeHH}:${timeMM}`
        return dateStr
    }

    const todayY = now.getFullYear()
    const todayM = now.getMonth()
    const todayD = now.getDate()

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] hover:border-indigo-500/40 hover:bg-white/[0.07] rounded-xl text-sm transition-all focus:outline-none focus:border-indigo-500/50 group cursor-pointer"
            >
                <Calendar size={15} className={`shrink-0 transition-colors ${isOpen ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-indigo-400'}`} />
                <span className={`flex-1 text-left text-sm ${value ? 'text-zinc-200 font-medium' : 'text-zinc-600'}`}>
                    {formatDisplay() || placeholder}
                </span>
                {value && (
                    <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); onChange('') }}
                        className="text-zinc-600 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                        <X size={12} />
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute left-0 mt-2 z-[200] w-72 bg-[#0c0c12] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-4"
                    >
                        {/* Month navigation */}
                        <div className="flex items-center justify-between mb-4">
                            <button type="button" onClick={prevMonth}
                                className="p-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all">
                                <ChevronDown size={14} className="rotate-90" />
                            </button>
                            <span className="text-sm font-black text-white tracking-tight">
                                {MONTHS_ES[viewMonth]} {viewYear}
                            </span>
                            <button type="button" onClick={nextMonth}
                                className="p-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all">
                                <ChevronDown size={14} className="-rotate-90" />
                            </button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 mb-1">
                            {DAYS_ES.map((d, i) => (
                                <div key={i} className="text-center text-[9px] font-black text-zinc-600 uppercase py-1 tracking-widest">{d}</div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="grid grid-cols-7 gap-0.5">
                            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1
                                const isToday = viewYear === todayY && viewMonth === todayM && day === todayD
                                const isSel = selectedDate &&
                                    viewYear === selectedDate.getFullYear() &&
                                    viewMonth === selectedDate.getMonth() &&
                                    day === selectedDate.getDate()
                                const isPast = new Date(viewYear, viewMonth, day) < new Date(todayY, todayM, todayD)

                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => handleSelectDay(day)}
                                        className={`
                                            relative aspect-square flex items-center justify-center text-xs rounded-lg transition-all
                                            ${isSel
                                                ? 'bg-indigo-500 text-white font-black shadow-lg shadow-indigo-500/40'
                                                : isToday
                                                ? 'bg-indigo-500/10 text-indigo-400 font-bold ring-1 ring-inset ring-indigo-500/40'
                                                : isPast
                                                ? 'text-zinc-700 hover:text-zinc-500 hover:bg-white/[0.04] cursor-default'
                                                : 'text-zinc-300 hover:bg-white/[0.08] hover:text-white font-medium'
                                            }
                                        `}
                                    >
                                        {day}
                                        {isToday && !isSel && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Time picker (if withTime) */}
                        {withTime && (
                            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-3">
                                <Clock size={14} className="text-zinc-500 shrink-0" />
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number" min="0" max="23"
                                        value={timeHH}
                                        onChange={e => {
                                            const hh = String(Math.min(23, Math.max(0, Number(e.target.value)))).padStart(2,'0')
                                            setTimeHH(hh)
                                            if (selectedDate) handleTimeChange(hh, timeMM)
                                        }}
                                        className="w-12 text-center bg-white/[0.06] border border-white/[0.08] rounded-lg py-1 text-sm text-zinc-200 font-bold focus:outline-none focus:border-indigo-500/50"
                                    />
                                    <span className="text-zinc-500 font-black">:</span>
                                    <input
                                        type="number" min="0" max="59"
                                        value={timeMM}
                                        onChange={e => {
                                            const mm = String(Math.min(59, Math.max(0, Number(e.target.value)))).padStart(2,'0')
                                            setTimeMM(mm)
                                            if (selectedDate) handleTimeChange(timeHH, mm)
                                        }}
                                        className="w-12 text-center bg-white/[0.06] border border-white/[0.08] rounded-lg py-1 text-sm text-zinc-200 font-bold focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>
                                <button type="button" onClick={() => setIsOpen(false)}
                                    className="ml-auto text-xs font-black text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-colors">
                                    OK
                                </button>
                            </div>
                        )}

                        {/* Today shortcut */}
                        {!withTime && (
                            <button
                                type="button"
                                onClick={() => {
                                    const d = new Date()
                                    onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
                                    setIsOpen(false)
                                }}
                                className="w-full mt-3 py-1.5 text-xs font-black text-indigo-400 hover:text-white hover:bg-indigo-500/20 rounded-xl transition-all border border-transparent hover:border-indigo-500/30"
                            >
                                Hoy
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── Incident Detail Panel ────────────────────────────────────────────────────

function IncidentDetailPanel({
    incident,
    onClose,
    onCreateTask,
    orgId,
    userId,
    userName,
}: {
    incident: ParsedIncident
    onClose: () => void
    onCreateTask: (incident: ParsedIncident) => void
    orgId: string
    userId: string
    userName: string
}) {
    const [comments, setComments] = useState<any[]>([])
    const [newComment, setNewComment] = useState('')
    const [sendingComment, setSendingComment] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const cfg = INCIDENT_PRIORITY_CONFIG[incident.priority] || INCIDENT_PRIORITY_CONFIG.low

    useEffect(() => {
        getIncidentCommentsAction(incident.id).then(r => {
            if (r.success) setComments(r.comments || [])
        })
    }, [incident.id])

    const sendComment = async () => {
        if (!newComment.trim()) return
        setSendingComment(true)
        const r = await addIncidentCommentAction(incident.id, orgId, { id: userId, name: userName }, newComment.trim())
        if (r.success && r.comment) {
            setComments(prev => [...prev, r.comment!])
            setNewComment('')
        } else toast.error('Error al enviar comentario')
        setSendingComment(false)
    }

    const statusLabel: Record<string, string> = {
        open: 'Abierta', in_progress: 'En atención', resolved: 'Resuelta', closed: 'Cerrada', pending: 'Pendiente',
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="flex flex-col h-full bg-[#0d0d12]/95 border-l border-white/[0.06] overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 border-b border-white/[0.06] shrink-0">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>
                            {cfg.label}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-600 uppercase">
                            {statusLabel[incident.status] || incident.status}
                        </span>
                    </div>
                    <h3 className="text-base font-black text-white uppercase italic leading-tight truncate">
                        {incident.title}
                    </h3>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors shrink-0">
                    <X size={16} />
                </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { icon: MapPin, label: 'Ubicación', value: incident.location },
                        { icon: User, label: 'Reportado por', value: incident.guard },
                        { icon: Building2, label: 'Propiedad', value: incident.condominium || '—' },
                        { icon: Clock, label: 'Fecha', value: fmtDateTime(incident.created_at) },
                    ].map(m => (
                        <div key={m.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                            <div className="flex items-center gap-1.5 mb-1">
                                <m.icon size={10} className="text-zinc-600" />
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{m.label}</span>
                            </div>
                            <p className="text-xs font-bold text-zinc-300 truncate">{m.value}</p>
                        </div>
                    ))}
                </div>

                {/* Description */}
                <div>
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Descripción</p>
                    <p className="text-sm text-zinc-400 leading-relaxed">{incident.description}</p>
                </div>

                {/* Evidence */}
                {incident.images && incident.images.length > 0 && (
                    <div>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Evidencias ({incident.images.length})</p>
                        <div className="grid grid-cols-3 gap-2">
                            {incident.images.map((img, idx) => (
                                <motion.div key={idx} whileHover={{ scale: 1.05 }} onClick={() => setSelectedImage(img)}
                                    className="aspect-square rounded-xl overflow-hidden cursor-zoom-in border border-white/10 relative group">
                                    <img src={img} alt={`ev-${idx}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Maximize2 size={16} className="text-white" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Comments */}
                <div>
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3">
                        Comentarios internos ({comments.length})
                    </p>
                    <div className="space-y-2 mb-3">
                        {comments.length === 0 ? (
                            <p className="text-xs text-zinc-600 italic">Sin comentarios aún.</p>
                        ) : comments.map((c: any) => (
                            <div key={c.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-black text-indigo-400">{c.author_name}</span>
                                    <span className="text-[9px] text-zinc-600">{fmtDateTime(c.created_at)}</span>
                                </div>
                                <p className="text-xs text-zinc-300">{c.body}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() }}}
                            placeholder="Escribe un comentario..."
                            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                        <button onClick={sendComment} disabled={sendingComment || !newComment.trim()}
                            className="px-3 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors">
                            {sendingComment ? '...' : 'Enviar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer: Create Task button */}
            <div className="p-4 border-t border-white/[0.06] shrink-0">
                <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => onCreateTask(incident)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={14} />
                    Crear Tarea desde Incidencia
                    <ArrowRight size={14} />
                </motion.button>
            </div>

            {/* Image Lightbox */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setSelectedImage(null)}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm p-8">
                        <button onClick={() => setSelectedImage(null)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-rose-500 text-white rounded-xl transition-colors">
                            <X size={20} />
                        </button>
                        <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} src={selectedImage}
                            alt="Vista ampliada" onClick={e => e.stopPropagation()}
                            className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-2xl" />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ─── Task Row (List View) ─────────────────────────────────────────────────────

function TaskRow({
    task,
    onClick,
    onStart,
    onComplete,
    onDuplicate,
    onDelete,
}: {
    task: TeamTask
    onClick: () => void
    onStart: () => void
    onComplete: () => void
    onDuplicate: () => void
    onDelete: () => void
}) {
    const [menuOpen, setMenuOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const sc = STATUS_CONFIG[task.status]
    const pc = PRIORITY_CONFIG[task.priority]
    const overdue = isOverdue(task)

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onClick}
            className={`group flex items-center gap-4 px-4 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border cursor-pointer transition-all duration-200 ${
                overdue ? 'border-orange-500/30 hover:border-orange-500/50' : 'border-white/[0.05] hover:border-white/[0.1]'
            }`}
        >
            {/* Priority Dot */}
            <div className={`w-2 h-2 rounded-full shrink-0 ${pc.color.replace('text-', 'bg-')}`} />

            {/* Area icon */}
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-sm shrink-0">
                {TASK_AREA_ICONS[task.area as TaskArea] || '📌'}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${overdue ? 'text-orange-300' : 'text-zinc-200'}`}>{task.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase">{AREA_LABELS[task.area as TaskArea] || task.area}</span>
                    {task.assigned_name && (
                        <span className="text-[9px] text-zinc-600">· {task.assigned_name}</span>
                    )}
                    {task.property_name && (
                        <span className="text-[9px] text-zinc-700">· {task.property_name}</span>
                    )}
                </div>
            </div>

            {/* Due date */}
            {task.due_date && (
                <span className={`text-[9px] font-black uppercase shrink-0 hidden md:block ${overdue ? 'text-orange-400' : 'text-zinc-600'}`}>
                    {overdue ? '⚠️ ' : ''}{fmtDate(task.due_date)}
                </span>
            )}

            {/* Status Badge */}
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border shrink-0 ${sc.bg} ${sc.color}`}>
                {sc.label}
            </span>

            {/* Actions Menu */}
            <div ref={ref} className="relative shrink-0" onClick={e => e.stopPropagation()}>
                <button
                    onClick={() => setMenuOpen(v => !v)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
                >
                    <MoreVertical size={14} />
                </button>
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-8 z-30 min-w-[160px] bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                        >
                            {task.status === 'pending' && (
                                <button onClick={() => { setMenuOpen(false); onStart() }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors">
                                    <Play size={12} /> Iniciar tarea
                                </button>
                            )}
                            {task.status === 'in_progress' && (
                                <button onClick={() => { setMenuOpen(false); onComplete() }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                                    <Check size={12} /> Completar
                                </button>
                            )}
                            <button onClick={() => { setMenuOpen(false); onDuplicate() }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors">
                                <Copy size={12} /> Duplicar tarea
                            </button>
                            <div className="h-px bg-white/[0.06] my-1" />
                            <button onClick={() => { setMenuOpen(false); onDelete() }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors">
                                <Trash2 size={12} /> Eliminar
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({ task, onClick }: { task: TeamTask; onClick: () => void }) {
    const pc = PRIORITY_CONFIG[task.priority]
    const overdue = isOverdue(task)
    return (
        <motion.div
            whileHover={{ y: -3, scale: 1.02 }}
            onClick={onClick}
            className={`p-3 rounded-xl bg-[#0d0d12] border cursor-pointer transition-all duration-200 ${
                overdue ? 'border-orange-500/40' : 'border-white/[0.06] hover:border-white/[0.12]'
            }`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-black uppercase ${pc.color}`}>{pc.label}</span>
                <span className="text-sm">{TASK_AREA_ICONS[task.area as TaskArea] || '📌'}</span>
            </div>
            <p className={`text-xs font-bold leading-snug mb-2 ${overdue ? 'text-orange-300' : 'text-zinc-200'}`}>{task.title}</p>
            {task.assigned_name && (
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-indigo-500/30 flex items-center justify-center">
                        <User size={8} className="text-indigo-400" />
                    </div>
                    <span className="text-[9px] text-zinc-500 truncate">{task.assigned_name}</span>
                </div>
            )}
            {task.due_date && (
                <div className={`mt-2 flex items-center gap-1 text-[9px] font-bold ${overdue ? 'text-orange-400' : 'text-zinc-600'}`}>
                    <Calendar size={9} />
                    {overdue ? '⚠ ' : ''}{fmtDate(task.due_date)}
                </div>
            )}
        </motion.div>
    )
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────

function TaskDetailPanel({
    task,
    onClose,
    onRefresh,
    orgId,
    userId,
    userName,
}: {
    task: TeamTask
    onClose: () => void
    onRefresh: () => void
    orgId: string
    userId: string
    userName: string
}) {
    const [newComment, setNewComment] = useState('')
    const [sendingComment, setSendingComment] = useState(false)
    const [newChecklistItem, setNewChecklistItem] = useState('')
    const [addingChecklist, setAddingChecklist] = useState(false)
    const [checklistItems, setChecklistItems] = useState(task.checklist_items || [])
    const [comments, setComments] = useState(task.comments || [])
    const sc = STATUS_CONFIG[task.status]
    const pc = PRIORITY_CONFIG[task.priority]

    const sendComment = async () => {
        if (!newComment.trim()) return
        setSendingComment(true)
        const r = await addTaskCommentAction(task.id, orgId, { id: userId, name: userName }, newComment.trim())
        if (r.success && r.comment) {
            setComments(prev => [r.comment!, ...prev])
            setNewComment('')
        } else toast.error('Error al enviar comentario')
        setSendingComment(false)
    }

    const toggleItem = async (itemId: string, current: boolean) => {
        setChecklistItems(prev => prev.map(ci => ci.id === itemId ? { ...ci, is_completed: !current } : ci))
        await toggleChecklistItemAction(itemId, !current, { id: userId, name: userName })
    }

    const addChecklistItem = async () => {
        if (!newChecklistItem.trim()) return
        setAddingChecklist(true)
        const r = await addChecklistItemAction(task.id, orgId, newChecklistItem.trim())
        if (r.success && r.item) {
            setChecklistItems(prev => [...prev, r.item!])
            setNewChecklistItem('')
        } else toast.error('Error al agregar ítem')
        setAddingChecklist(false)
    }

    const handleStatusChange = async (newStatus: TaskStatus) => {
        if (newStatus === 'in_progress') {
            await startTaskAction(task.id, orgId, { id: userId, name: userName })
        } else if (newStatus === 'completed') {
            await completeTaskAction(task.id, orgId, { id: userId, name: userName })
        } else {
            await updateTaskAction(task.id, orgId, { status: newStatus }, { id: userId, name: userName })
        }
        toast.success('Estado actualizado')
        onRefresh()
    }

    const completed = checklistItems.filter(ci => ci.is_completed).length
    const total = checklistItems.length

    return (
        <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="flex flex-col h-full bg-[#0d0d12]/95 border-l border-white/[0.06] overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 border-b border-white/[0.06] shrink-0">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{TASK_AREA_ICONS[task.area as TaskArea] || '📌'}</span>
                        <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">{AREA_LABELS[task.area as TaskArea]}</span>
                    </div>
                    <h3 className="text-base font-black text-white uppercase italic leading-tight">{task.title}</h3>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors shrink-0">
                    <X size={16} />
                </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Status quick-change */}
                <div>
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Estado</p>
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(s => (
                            <button key={s} onClick={() => handleStatusChange(s)}
                                className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
                                    task.status === s
                                        ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}`
                                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-600 hover:text-zinc-300 hover:border-white/10'
                                }`}>
                                {STATUS_CONFIG[s].label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'Prioridad', value: pc.label, color: pc.color },
                        { label: 'Propiedad', value: task.property_name || '—', color: 'text-zinc-300' },
                        { label: 'Asignado a', value: task.assigned_name || 'Sin asignar', color: 'text-zinc-300' },
                        { label: 'Vence', value: task.due_date ? fmtDate(task.due_date) : '—', color: isOverdue(task) ? 'text-orange-400' : 'text-zinc-300' },
                        { label: 'Inicio', value: task.started_at ? fmtDateTime(task.started_at) : '—', color: 'text-zinc-300' },
                        { label: 'Programación', value: task.scheduled_at ? fmtDateTime(task.scheduled_at) : 'Inmediata', color: 'text-zinc-300' },
                    ].map(m => (
                        <div key={m.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{m.label}</p>
                            <p className={`text-xs font-bold ${m.color}`}>{m.value}</p>
                        </div>
                    ))}
                </div>

                {/* Description */}
                {task.description && (
                    <div>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Descripción</p>
                        <p className="text-sm text-zinc-400 leading-relaxed">{task.description}</p>
                    </div>
                )}

                {/* Checklist */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                            Checklist {total > 0 && `(${completed}/${total})`}
                        </p>
                        {total > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(completed / total) * 100}%` }} />
                                </div>
                                <span className="text-[9px] text-zinc-500">{Math.round((completed / total) * 100)}%</span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-1.5 mb-3">
                        {checklistItems.map(ci => (
                            <div key={ci.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                                <button onClick={() => toggleItem(ci.id, ci.is_completed)}
                                    className={`mt-0.5 w-4 h-4 rounded border transition-all shrink-0 flex items-center justify-center ${
                                        ci.is_completed
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'border-white/20 hover:border-indigo-500'
                                    }`}>
                                    {ci.is_completed && <Check size={10} />}
                                </button>
                                <span className={`text-xs leading-snug ${ci.is_completed ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
                                    {ci.label}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={newChecklistItem}
                            onChange={e => setNewChecklistItem(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addChecklistItem() }}
                            placeholder="Agregar ítem..."
                            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                        <button onClick={addChecklistItem} disabled={addingChecklist || !newChecklistItem.trim()}
                            className="px-3 py-2 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 text-zinc-300 rounded-xl text-xs font-bold transition-colors">
                            {addingChecklist ? '...' : '+'}
                        </button>
                    </div>
                </div>

                {/* Evidence images */}
                {task.images && task.images.length > 0 && (
                    <div>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">
                            Evidencias ({task.images.length})
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {task.images.map((img, idx) => (
                                <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-white/10">
                                    <img src={img} alt={`ev-${idx}`} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Comments */}
                <div>
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3">
                        Comentarios ({comments.length})
                    </p>
                    <div className="space-y-2 mb-3">
                        {comments.length === 0 ? (
                            <p className="text-xs text-zinc-600 italic">Sin comentarios aún.</p>
                        ) : comments.map((c: any) => (
                            <div key={c.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-black text-indigo-400">{c.author_name}</span>
                                    <span className="text-[9px] text-zinc-600">{fmtDateTime(c.created_at)}</span>
                                </div>
                                <p className="text-xs text-zinc-300">{c.body}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() }}}
                            placeholder="Escribe un comentario..."
                            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                        <button onClick={sendComment} disabled={sendingComment || !newComment.trim()}
                            className="px-3 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors">
                            {sendingComment ? '...' : 'Enviar'}
                        </button>
                    </div>
                </div>

                {/* History */}
                {task.history && task.history.length > 0 && (
                    <div>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Historial</p>
                        <div className="space-y-1.5">
                            {task.history.map((h: any) => (
                                <div key={h.id} className="flex items-start gap-2 text-[10px]">
                                    <div className="w-1 h-1 rounded-full bg-indigo-500/60 mt-1.5 shrink-0" />
                                    <span className="text-zinc-500">
                                        <span className="text-zinc-400 font-bold">{h.user_name}</span>
                                        {' '}{h.details || h.action}{' '}
                                        <span className="text-zinc-700">— {fmtDateTime(h.created_at)}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({
    onClose,
    onCreated,
    orgId,
    userId,
    userName,
    properties,
    teamMembers,
    prefill,
}: {
    onClose: () => void
    onCreated: () => void
    orgId: string
    userId: string
    userName: string
    properties: Array<{ id: string; name: string }>
    teamMembers: Array<{ id: string; full_name: string; role: string; email: string }>
    prefill?: Partial<{
        property_id: string; title: string; description: string;
        priority: TaskPriority; source_incident_id: string; images: string[]
    }>
}) {
    const areas = Object.keys(AREA_LABELS) as TaskArea[]
    const [form, setForm] = useState({
        title: prefill?.title || '',
        description: prefill?.description || '',
        property_id: prefill?.property_id || (properties[0]?.id || ''),
        area: 'maintenance' as TaskArea,
        priority: (prefill?.priority || 'medium') as TaskPriority,
        assigned_to: '',
        assigned_name: '',
        due_date: '',
        scheduled_at: '',
        checklist_input: '',
        checklist_items: [] as string[],
        recurrence_type: '',
        recurrence_interval: '1',
    })
    const [saving, setSaving] = useState(false)

    const setField = (k: keyof typeof form, v: any) => setForm(prev => ({ ...prev, [k]: v }))

    const addChecklistItem = () => {
        if (!form.checklist_input.trim()) return
        setField('checklist_items', [...form.checklist_items, form.checklist_input.trim()])
        setField('checklist_input', '')
    }

    const handleSubmit = async () => {
        if (!form.title.trim() || !form.property_id) {
            toast.error('Título y propiedad son obligatorios')
            return
        }
        setSaving(true)
        const dto: any = {
            organization_id: orgId,
            property_id: form.property_id,
            area: form.area,
            task_type: form.area,
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            priority: form.priority,
            assigned_to: form.assigned_to || undefined,
            assigned_name: form.assigned_name || undefined,
            due_date: form.due_date || undefined,
            scheduled_at: form.scheduled_at || undefined,
            checklist_items: form.checklist_items.length > 0 ? form.checklist_items : undefined,
            recurrence_rule: form.recurrence_type ? { type: form.recurrence_type, interval: Number(form.recurrence_interval) } : undefined,
            source_incident_id: prefill?.source_incident_id || undefined,
            images: prefill?.images || [],
        }
        const r = await createTaskAction(dto, { id: userId, name: userName })
        if (r.success) {
            toast.success('Tarea creada exitosamente')
            onCreated()
            onClose()
        } else {
            toast.error(`Error: ${r.error}`)
        }
        setSaving(false)
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0d0d12] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/[0.06] shrink-0">
                    <div>
                        <h2 className="text-base font-black text-white uppercase italic">
                            {prefill?.source_incident_id ? '📋 Tarea desde Incidencia' : '➕ Nueva Tarea'}
                        </h2>
                        {prefill?.source_incident_id && (
                            <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">
                                Datos precargados desde la incidencia
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Título *</label>
                        <input
                            value={form.title} onChange={e => setField('title', e.target.value)}
                            placeholder="Ej: Reparar bomba de alberca..."
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                    </div>

                    {/* Property + Area + Priority */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Propiedad *</label>
                            <CustomDropdown
                                options={properties.map(p => ({
                                    value: p.id,
                                    label: p.name,
                                    icon: <Building2 size={12} className="text-zinc-500" />,
                                }))}
                                value={form.property_id}
                                onChange={val => setField('property_id', val)}
                                placeholder="Seleccionar propiedad"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Área</label>
                            <CustomDropdown
                                options={areas.map(a => ({
                                    value: a,
                                    label: AREA_LABELS[a],
                                    icon: TASK_AREA_ICONS[a],
                                }))}
                                value={form.area}
                                onChange={val => setField('area', val as TaskArea)}
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Prioridad</label>
                            <CustomDropdown
                                options={[
                                    { value: 'low', label: 'Baja', icon: '⚪' },
                                    { value: 'medium', label: 'Media', icon: '🟡' },
                                    { value: 'high', label: 'Alta', icon: '🟠' },
                                    { value: 'urgent', label: 'Urgente', icon: '🚨' },
                                ]}
                                value={form.priority}
                                onChange={val => setField('priority', val as TaskPriority)}
                            />
                        </div>
                    </div>

                    {/* Assigned to */}
                    <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Asignar a empleado</label>
                        <CustomDropdown
                            options={[
                                { value: '', label: 'Sin asignar', icon: <User size={12} className="text-zinc-500" /> },
                                ...teamMembers.map(m => ({
                                    value: m.id,
                                    label: `${m.full_name} — ${m.role}`,
                                    icon: <User size={12} className="text-indigo-400" />,
                                }))
                            ]}
                            value={form.assigned_to}
                            onChange={val => {
                                const member = teamMembers.find(m => m.id === val)
                                setField('assigned_to', val)
                                setField('assigned_name', member?.full_name || '')
                            }}
                            placeholder="Asignar empleado"
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Fecha límite</label>
                            <DatePickerField
                                value={form.due_date}
                                onChange={val => setField('due_date', val)}
                                placeholder="Sin fecha límite"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Programar para</label>
                            <DatePickerField
                                value={form.scheduled_at}
                                onChange={val => setField('scheduled_at', val)}
                                placeholder="Inmediata"
                                withTime
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Descripción</label>
                        <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={3}
                            placeholder="Instrucciones detalladas para el empleado..."
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none" />
                    </div>

                    {/* Checklist */}
                    <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Checklist</label>
                        {form.checklist_items.length > 0 && (
                            <div className="space-y-1 mb-2">
                                {form.checklist_items.map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-400 px-2">
                                        <div className="w-1 h-1 rounded-full bg-indigo-500/60 shrink-0" />
                                        <span className="flex-1">{item}</span>
                                        <button onClick={() => setField('checklist_items', form.checklist_items.filter((_, j) => j !== i))}
                                            className="text-zinc-700 hover:text-rose-400 transition-colors">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input
                                value={form.checklist_input} onChange={e => setField('checklist_input', e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem() }}}
                                placeholder="Agregar ítem al checklist..."
                                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                            />
                            <button onClick={addChecklistItem} className="px-3 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 rounded-xl text-sm font-bold transition-colors">+</button>
                        </div>
                    </div>

                    {/* Recurrence */}
                    <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Recurrencia</label>
                        <div className="grid grid-cols-2 gap-3">
                            <CustomDropdown
                                options={[
                                    { value: '', label: 'Sin recurrencia' },
                                    { value: 'daily', label: 'Diario' },
                                    { value: 'weekly', label: 'Semanal' },
                                    { value: 'monthly', label: 'Mensual' },
                                    { value: 'yearly', label: 'Anual' },
                                    { value: 'custom', label: 'Cada X días' },
                                ]}
                                value={form.recurrence_type}
                                onChange={val => setField('recurrence_type', val)}
                                placeholder="Sin recurrencia"
                            />
                            {form.recurrence_type === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <input type="number" min="1" value={form.recurrence_interval} onChange={e => setField('recurrence_interval', e.target.value)}
                                        className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 transition-colors" />
                                    <span className="text-xs text-zinc-500">días</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 p-5 border-t border-white/[0.06] shrink-0">
                    <button onClick={onClose} className="px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all">
                        Cancelar
                    </button>
                    <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={handleSubmit} disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                    >
                        {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                        {saving ? 'Creando...' : 'Crear Tarea'}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ControlOperativoClient() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('incidencias')
    const [taskView, setTaskView] = useState<TaskView>('list')

    // Data
    const [kpis, setKpis] = useState<OperationsKPIs | null>(null)
    const [incidents, setIncidents] = useState<ParsedIncident[]>([])
    const [tasks, setTasks] = useState<TeamTask[]>([])

    // Loading
    const [kpisLoading, setKpisLoading] = useState(true)
    const [incidentsLoading, setIncidentsLoading] = useState(true)
    const [tasksLoading, setTasksLoading] = useState(true)

    // User context
    const [ctx, setCtx] = useState<UserContext | null>(null)

    // UI State
    const [selectedIncident, setSelectedIncident] = useState<ParsedIncident | null>(null)
    const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [createTaskPrefill, setCreateTaskPrefill] = useState<any>(null)

    // Filters
    const [taskFilters, setTaskFilters] = useState({ status: '', area: '', property_id: '', search: '' })
    const [incidentSearch, setIncidentSearch] = useState('')

    // New incident toast
    const [newIncidentToast, setNewIncidentToast] = useState<ParsedIncident | null>(null)
    const toastTimer = useRef<any>(null)

    // ── Load user context ──
    useEffect(() => {
        const load = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const [orgUserResult, propertiesResult] = await Promise.all([
                supabase.from('organization_users').select('organization_id').eq('user_id', user.id).maybeSingle(),
                supabase.from('condominiums').select('id, name').eq('status', 'active'),
            ])

            const orgId = orgUserResult.data?.organization_id
            if (!orgId) return

            // Fetch properties filtered by org and fetch team members via backend API to bypass client-side RLS
            const [orgPropsResult, teamResponse] = await Promise.all([
                supabase.from('condominiums').select('id, name').eq('organization_id', orgId).eq('status', 'active'),
                fetch('/api/organizations/team')
            ])

            const orgProps = orgPropsResult.data
            let teamMembers: any[] = []
            try {
                if (teamResponse.ok) {
                    const teamData = await teamResponse.json()
                    if (Array.isArray(teamData)) {
                        teamMembers = teamData.map((m: any) => ({
                            id: m.user_id,
                            full_name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || 'Sin nombre',
                            email: m.email || '',
                            role: m.role || 'staff',
                        }))
                    }
                }
            } catch (err) {
                console.error('Error fetching team from API:', err)
            }

            const profileResult = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
            const userName = profileResult.data?.full_name || user.email?.split('@')[0] || 'Usuario'

            setCtx({
                userId: user.id,
                orgId,
                userName,
                properties: orgProps || [],
                teamMembers,
            })

        }
        load()
    }, [])

    // ── Load data when ctx is ready ──
    const loadKPIs = useCallback(async () => {
        if (!ctx) return
        setKpisLoading(true)
        const r = await getOperationsKPIsAction(ctx.orgId)
        if (r.success) setKpis(r.kpis ?? null)
        setKpisLoading(false)
    }, [ctx])

    const loadIncidents = useCallback(async () => {
        if (!ctx) return
        setIncidentsLoading(true)
        const supabase = createClient()
        const { data } = await supabase
            .from('tickets')
            .select('*, condominiums(name)')
            .eq('organization_id', ctx.orgId)
            .in('status', ['open', 'in_progress', 'pending'])
            .order('created_at', { ascending: false })
            .limit(50)
        setIncidents((data || []).map(parseIncident))
        setIncidentsLoading(false)
    }, [ctx])

    const loadTasks = useCallback(async () => {
        if (!ctx) return
        setTasksLoading(true)
        const r = await getTeamTasksAction(ctx.orgId, {
            property_id: taskFilters.property_id || undefined,
            area: taskFilters.area || undefined,
            status: taskFilters.status || undefined,
        })
        if (r.success) setTasks(r.tasks || [])
        setTasksLoading(false)
    }, [ctx, taskFilters])

    useEffect(() => { loadKPIs(); loadIncidents(); loadTasks() }, [loadKPIs, loadIncidents, loadTasks])

    // ── Realtime subscription ──
    useEffect(() => {
        if (!ctx) return
        const supabase = createClient()
        const channel = supabase
            .channel(`ops-v2-${ctx.orgId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets', filter: `organization_id=eq.${ctx.orgId}` },
                (payload: any) => {
                    const inc = { ...parseIncident(payload.new), isNew: true }
                    setIncidents(prev => [inc, ...prev])
                    setNewIncidentToast(inc)
                    if (toastTimer.current) clearTimeout(toastTimer.current)
                    toastTimer.current = setTimeout(() => setNewIncidentToast(null), 6000)
                    try { new Audio('/notification.mp3').play().catch(() => {}) } catch {}
                }
            )
            .subscribe()
        return () => { channel.unsubscribe() }
    }, [ctx])

    // ── Handlers ──
    const handleCreateTaskFromIncident = (incident: ParsedIncident) => {
        setCreateTaskPrefill({
            title: `Atender: ${incident.title}`,
            description: incident.description,
            property_id: incident.condominium_id,
            priority: (incident.priority === 'urgent' || incident.priority === 'critical') ? 'urgent'
                : incident.priority === 'high' ? 'high' : 'medium',
            source_incident_id: incident.id,
            images: incident.images || [],
        })
        setShowCreateModal(true)
    }

    const handleStartTask = async (taskId: string) => {
        if (!ctx) return
        await startTaskAction(taskId, ctx.orgId, { id: ctx.userId, name: ctx.userName })
        toast.success('Tarea iniciada')
        loadTasks(); loadKPIs()
    }
    const handleCompleteTask = async (taskId: string) => {
        if (!ctx) return
        await completeTaskAction(taskId, ctx.orgId, { id: ctx.userId, name: ctx.userName })
        toast.success('Tarea completada')
        loadTasks(); loadKPIs()
    }
    const handleDeleteTask = async (taskId: string) => {
        if (!ctx) return
        await deleteTaskAction(taskId, ctx.orgId)
        toast.success('Tarea eliminada')
        loadTasks(); loadKPIs()
    }
    const handleDuplicateTask = async (task: TeamTask) => {
        if (!ctx) return
        await duplicateTaskAction(task.id, ctx.orgId, {}, { id: ctx.userId, name: ctx.userName })
        toast.success('Tarea duplicada')
        loadTasks()
    }

    // ── Filtered tasks ──
    const filteredTasks = tasks.filter(t => {
        if (taskFilters.search) {
            const q = taskFilters.search.toLowerCase()
            if (!t.title.toLowerCase().includes(q) && !(t.assigned_name || '').toLowerCase().includes(q)) return false
        }
        return true
    })

    const kanbanColumns: Record<TaskStatus, TeamTask[]> = {
        pending: filteredTasks.filter(t => t.status === 'pending'),
        in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
        completed: filteredTasks.filter(t => t.status === 'completed'),
        cancelled: filteredTasks.filter(t => t.status === 'cancelled'),
    }

    const filteredIncidents = incidents.filter(i => {
        if (!incidentSearch) return true
        const q = incidentSearch.toLowerCase()
        return i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.location.toLowerCase().includes(q)
    })

    const hasSidePanel = selectedIncident || selectedTask

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans">
            <div className="p-6 space-y-6">
                {/* ─ Page Header ─ */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Control Operativo</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Centro de operaciones en tiempo real</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { loadKPIs(); loadIncidents(); loadTasks() }}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all">
                            <RefreshCw size={12} />
                            Actualizar
                        </button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => { setCreateTaskPrefill(null); setShowCreateModal(true) }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20">
                            <Plus size={14} />
                            Nueva Tarea
                        </motion.button>
                    </div>
                </motion.div>

                {/* ─ KPI Bar ─ */}
                <KPIBar kpis={kpis} loading={kpisLoading} />

                {/* ─ Tabs ─ */}
                <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl w-fit">
                    {([
                        { key: 'incidencias', label: 'Incidencias', icon: ShieldAlert, count: incidents.filter(i => i.isNew).length },
                        { key: 'tareas', label: 'Tareas del Equipo', icon: ClipboardList, count: 0 },
                    ] as const).map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                                activeTab === tab.key
                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'
                            }`}>
                            <tab.icon size={14} />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[8px] font-black text-white flex items-center justify-center animate-pulse">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ─ Content Area ─ */}
                <div className={`flex gap-5 transition-all duration-300 ${hasSidePanel ? 'items-start' : ''}`}>
                    {/* Main Panel */}
                    <div className={`flex-1 min-w-0 transition-all duration-300 ${hasSidePanel ? 'max-w-[calc(100%-380px)]' : 'w-full'}`}>
                        <AnimatePresence mode="wait">
                            {/* ══════════ INCIDENCIAS TAB ══════════ */}
                            {activeTab === 'incidencias' && (
                                <motion.div key="inc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                    {/* Search */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1 max-w-sm">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                                            <input value={incidentSearch} onChange={e => setIncidentSearch(e.target.value)}
                                                placeholder="Buscar incidencia..."
                                                className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 transition-colors" />
                                        </div>
                                        <span className="text-[9px] text-zinc-600 font-bold uppercase">{filteredIncidents.length} activas</span>
                                    </div>

                                    {/* Incident List */}
                                    {incidentsLoading ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Cargando...</p>
                                        </div>
                                    ) : filteredIncidents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                                            <ShieldAlert size={32} className="text-zinc-800" />
                                            <p className="text-sm font-bold text-zinc-600">Sin incidencias activas</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredIncidents.map((inc, i) => {
                                                const cfg = INCIDENT_PRIORITY_CONFIG[inc.priority] || INCIDENT_PRIORITY_CONFIG.low
                                                return (
                                                    <motion.div key={inc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                                        onClick={() => { setSelectedTask(null); setSelectedIncident(selectedIncident?.id === inc.id ? null : inc) }}
                                                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                                                            inc.isNew ? 'border-rose-500/40 bg-rose-500/5' :
                                                            selectedIncident?.id === inc.id ? 'border-indigo-500/50 bg-indigo-500/5' :
                                                            'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                                                        }`}>
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                                                                    {inc.isNew && <span className="px-2 py-0.5 bg-rose-500 text-[9px] font-black text-white rounded uppercase animate-pulse">Nueva</span>}
                                                                    <span className="text-[9px] text-zinc-600 uppercase">{inc.status}</span>
                                                                </div>
                                                                <h4 className="text-sm font-black text-white uppercase italic leading-tight truncate">{inc.title}</h4>
                                                                <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{inc.description}</p>
                                                            </div>
                                                            <div className="shrink-0 text-right">
                                                                <div className="flex items-center gap-1 justify-end text-[9px] text-zinc-600 mb-1">
                                                                    <MapPin size={9} /> {inc.location}
                                                                </div>
                                                                <div className="text-[9px] text-zinc-700">{fmtDateTime(inc.created_at)}</div>
                                                                {inc.condominium && <div className="text-[9px] text-zinc-700 mt-0.5">{inc.condominium}</div>}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ══════════ TAREAS TAB ══════════ */}
                            {activeTab === 'tareas' && (
                                <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                    {/* Toolbar */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        {/* Search */}
                                        <div className="relative">
                                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                                            <input value={taskFilters.search} onChange={e => setTaskFilters(prev => ({ ...prev, search: e.target.value }))}
                                                placeholder="Buscar tarea..."
                                                className="pl-8 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 transition-colors w-44" />
                                        </div>
                                        {/* Status filter */}
                                        <CustomDropdown
                                            options={[
                                                { value: '', label: 'Todos los estados' },
                                                { value: 'pending', label: 'Pendiente', icon: <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> },
                                                { value: 'in_progress', label: 'En proceso', icon: <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> },
                                                { value: 'completed', label: 'Completada', icon: <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> },
                                                { value: 'cancelled', label: 'Cancelada', icon: <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> },
                                            ]}
                                            value={taskFilters.status}
                                            onChange={val => setTaskFilters(prev => ({ ...prev, status: val }))}
                                            className="w-44"
                                        />
                                        {/* Area filter */}
                                        <CustomDropdown
                                            options={[
                                                { value: '', label: 'Todas las áreas' },
                                                ...(Object.keys(AREA_LABELS) as TaskArea[]).map(a => ({
                                                    value: a,
                                                    label: AREA_LABELS[a],
                                                    icon: TASK_AREA_ICONS[a],
                                                }))
                                            ]}
                                            value={taskFilters.area}
                                            onChange={val => setTaskFilters(prev => ({ ...prev, area: val as TaskArea | '' }))}
                                            className="w-44"
                                        />
                                        {/* Property filter */}
                                        {ctx && ctx.properties.length > 1 && (
                                            <CustomDropdown
                                                options={[
                                                    { value: '', label: 'Todas las propiedades' },
                                                    ...ctx.properties.map(p => ({
                                                        value: p.id,
                                                        label: p.name,
                                                        icon: <Building2 size={12} className="text-zinc-500" />,
                                                    }))
                                                ]}
                                                value={taskFilters.property_id}
                                                onChange={val => setTaskFilters(prev => ({ ...prev, property_id: val }))}
                                                className="w-48"
                                            />
                                        )}
                                        <span className="text-[9px] text-zinc-600 font-bold uppercase ml-auto">{filteredTasks.length} tareas</span>
                                        {/* View toggle */}
                                        <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                                            <button onClick={() => setTaskView('list')}
                                                className={`p-1.5 rounded-lg transition-all ${taskView === 'list' ? 'bg-indigo-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                                <LayoutList size={14} />
                                            </button>
                                            <button onClick={() => setTaskView('kanban')}
                                                className={`p-1.5 rounded-lg transition-all ${taskView === 'kanban' ? 'bg-indigo-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                                <Kanban size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Loading */}
                                    {tasksLoading ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                        </div>
                                    ) : filteredTasks.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                                            <ClipboardList size={32} className="text-zinc-800" />
                                            <p className="text-sm font-bold text-zinc-600">Sin tareas</p>
                                            <button onClick={() => { setCreateTaskPrefill(null); setShowCreateModal(true) }}
                                                className="mt-2 flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 rounded-xl text-xs font-bold transition-all">
                                                <Plus size={12} /> Crear primera tarea
                                            </button>
                                        </div>
                                    ) : taskView === 'list' ? (
                                        /* ── LIST VIEW ── */
                                        <div className="space-y-2">
                                            {filteredTasks.map(task => (
                                                <TaskRow key={task.id} task={task}
                                                    onClick={() => { setSelectedIncident(null); setSelectedTask(selectedTask?.id === task.id ? null : task) }}
                                                    onStart={() => handleStartTask(task.id)}
                                                    onComplete={() => handleCompleteTask(task.id)}
                                                    onDuplicate={() => handleDuplicateTask(task)}
                                                    onDelete={() => handleDeleteTask(task.id)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        /* ── KANBAN VIEW ── */
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto">
                                            {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(status => (
                                                <div key={status} className="min-w-[200px]">
                                                    <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl border ${STATUS_CONFIG[status].bg}`}>
                                                        <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].dot}`} />
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${STATUS_CONFIG[status].color}`}>
                                                            {STATUS_CONFIG[status].label}
                                                        </span>
                                                        <span className="ml-auto text-[9px] text-zinc-600 font-bold">{kanbanColumns[status].length}</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {kanbanColumns[status].map(task => (
                                                            <KanbanCard key={task.id} task={task}
                                                                onClick={() => { setSelectedIncident(null); setSelectedTask(selectedTask?.id === task.id ? null : task) }} />
                                                        ))}
                                                        {kanbanColumns[status].length === 0 && (
                                                            <div className="py-6 text-center text-[9px] text-zinc-700 border border-dashed border-white/[0.05] rounded-xl">Sin tareas</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ─ Side Panel ─ */}
                    <AnimatePresence>
                        {hasSidePanel && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 360 }}
                                exit={{ opacity: 0, width: 0 }}
                                className="shrink-0 rounded-2xl overflow-hidden border border-white/[0.06] h-[calc(100vh-280px)] sticky top-6"
                                style={{ minWidth: 360 }}
                            >
                                <AnimatePresence mode="wait">
                                    {selectedIncident && ctx && (
                                        <IncidentDetailPanel
                                            key={selectedIncident.id}
                                            incident={selectedIncident}
                                            onClose={() => setSelectedIncident(null)}
                                            onCreateTask={handleCreateTaskFromIncident}
                                            orgId={ctx.orgId}
                                            userId={ctx.userId}
                                            userName={ctx.userName}
                                        />
                                    )}
                                    {selectedTask && ctx && (
                                        <TaskDetailPanel
                                            key={selectedTask.id}
                                            task={selectedTask}
                                            onClose={() => setSelectedTask(null)}
                                            onRefresh={() => { loadTasks(); loadKPIs() }}
                                            orgId={ctx.orgId}
                                            userId={ctx.userId}
                                            userName={ctx.userName}
                                        />
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ─ Create Task Modal ─ */}
            <AnimatePresence>
                {showCreateModal && ctx && (
                    <CreateTaskModal
                        onClose={() => setShowCreateModal(false)}
                        onCreated={() => { loadTasks(); loadKPIs() }}
                        orgId={ctx.orgId}
                        userId={ctx.userId}
                        userName={ctx.userName}
                        properties={ctx.properties}
                        teamMembers={ctx.teamMembers}
                        prefill={createTaskPrefill}
                    />
                )}
            </AnimatePresence>

            {/* ─ New Incident Toast ─ */}
            <AnimatePresence>
                {newIncidentToast && (
                    <motion.div
                        initial={{ opacity: 0, x: 100, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed bottom-10 right-10 z-50 w-[380px]"
                    >
                        <PremiumCard glowColor="rose" className="!p-5 shadow-2xl shadow-rose-950/40 border-rose-500/30">
                            <div className="flex gap-3">
                                <div className="p-2.5 rounded-xl bg-rose-500 text-white shrink-0 shadow-lg shadow-rose-500/20">
                                    <ShieldAlert size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest animate-pulse">Nueva Incidencia</p>
                                        <button onClick={() => setNewIncidentToast(null)} className="text-zinc-600 hover:text-white transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <h4 className="text-sm font-black text-white uppercase italic truncate">{newIncidentToast.title}</h4>
                                    <p className="text-[9px] text-zinc-500 mt-0.5">{newIncidentToast.location} · {newIncidentToast.condominium}</p>
                                </div>
                            </div>
                        </PremiumCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
