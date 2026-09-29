'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import {
    Activity, ClipboardList,
    CheckCircle2, Users, Clock, LayoutList, Kanban,
    Plus, RefreshCw, X, Search,
    User, Calendar,
    MoreVertical, Copy, Trash2, Play, Check,
    Building2, ChevronDown
} from 'lucide-react'
import type { TeamTask, TaskArea, TaskPriority, TaskStatus } from '@/types/team-tasks'
import { TASK_AREA_LABELS as AREA_LABELS, TASK_AREA_ICONS } from '@/types/team-tasks'
import {
    getTeamTasksAction,
    getTeamTaskByIdAction,
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

const ROLE_LABELS: Record<string, string> = {
    security: 'Seguridad',
    admin_condominio: 'Auxiliar de condominio',
    admin_propiedad: 'Administrador de propiedad',
    owner: 'Administrador',
    admin: 'Administrador',
    manager: 'Gerente',
    accountant: 'Contador',
    staff: 'Personal',
    viewer: 'Observador',
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

type TaskView = 'persona' | 'list' | 'kanban'

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
    // Las fechas límite vienen como 'YYYY-MM-DD'; sin hora se leerían en UTC y
    // en México se mostrarían un día antes
    return new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
}
function fmtDateTime(d?: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function isOverdue(task: TeamTask) {
    if (!task.due_date) return false
    if (task.status === 'completed' || task.status === 'cancelled') return false
    return task.due_date < new Date().toLocaleDateString('en-CA')
}

function recurrenceLabel(rule?: string | null): string | null {
    if (!rule) return null
    try {
        const r = JSON.parse(rule)
        const interval = Number(r.interval) || 1
        const labels: Record<string, [string, string]> = {
            daily: ['Diario', 'días'],
            weekly: ['Semanal', 'semanas'],
            monthly: ['Mensual', 'meses'],
            yearly: ['Anual', 'años'],
            custom: ['', 'días'],
        }
        const cfg = labels[r.type]
        if (!cfg) return null
        return interval > 1 || r.type === 'custom' ? `Cada ${interval} ${cfg[1]}` : cfg[0]
    } catch {
        return null
    }
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
                    {task.recurrence_rule && (
                        <span className="text-[9px] text-indigo-400/80" title="Se regenera automáticamente al completarse">
                            · 🔁 {recurrenceLabel(task.recurrence_rule)}
                        </span>
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
                <div className="flex items-center gap-1">
                    {task.recurrence_rule && (
                        <span className="text-[10px]" title={`Recurrente: ${recurrenceLabel(task.recurrence_rule)}`}>🔁</span>
                    )}
                    <span className="text-sm">{TASK_AREA_ICONS[task.area as TaskArea] || '📌'}</span>
                </div>
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
                        { label: 'Recurrencia', value: task.recurrence_rule ? `🔁 ${recurrenceLabel(task.recurrence_rule)}` : 'Sin recurrencia', color: task.recurrence_rule ? 'text-indigo-400' : 'text-zinc-300' },
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
                                {c.attachments?.length > 0 && (
                                    <div className="flex gap-2 mt-2">
                                        {c.attachments.map((url: string, i: number) => (
                                            <a key={i} href={url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                                                <img src={url} alt="evidencia" className="w-full h-full object-cover" />
                                            </a>
                                        ))}
                                    </div>
                                )}
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
                                    label: `${m.full_name} — ${ROLE_LABELS[m.role] || m.role}`,
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
    // Vista por persona por defecto: de un vistazo, cuánto tiene pendiente cada quien
    const [taskView, setTaskView] = useState<TaskView>('persona')

    // Data
    const [tasks, setTasks] = useState<TeamTask[]>([])
    const [tasksLoading, setTasksLoading] = useState(true)

    // User context
    const [ctx, setCtx] = useState<UserContext | null>(null)

    // UI State
    const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [createTaskPrefill, setCreateTaskPrefill] = useState<any>(null)

    // Filters (se aplican en el navegador para que los indicadores de arriba
    // siempre reflejen el total del equipo)
    const [taskFilters, setTaskFilters] = useState({ status: '', area: '', property_id: '', search: '' })

    // ── Load user context ──
    useEffect(() => {
        const load = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const orgUserResult = await supabase
                .from('organization_users').select('organization_id').eq('user_id', user.id).maybeSingle()

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
                        teamMembers = teamData
                            // El administrador no se asigna tareas a sí mismo
                            .filter((m: any) => m.user_id !== user.id)
                            .map((m: any) => ({
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

            // "Asignar como tarea" desde Mantenimiento: /dashboard/control-operativo?incidencia=<id>
            const incidentId = new URLSearchParams(window.location.search).get('incidencia')
            if (incidentId) {
                window.history.replaceState(null, '', window.location.pathname)
                const { data: ticket } = await supabase
                    .from('tickets').select('*').eq('id', incidentId).eq('organization_id', orgId).maybeSingle()
                if (ticket) {
                    const incident = parseIncident(ticket)
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
            }
        }
        load()
    }, [])

    const loadTasks = useCallback(async () => {
        if (!ctx) return
        setTasksLoading(true)
        const r = await getTeamTasksAction(ctx.orgId)
        if (r.success) setTasks(r.tasks || [])
        else toast.error(r.error || 'No se pudieron cargar las tareas')
        setTasksLoading(false)
    }, [ctx])

    useEffect(() => { loadTasks() }, [loadTasks])

    // ── Handlers ──
    const handleStartTask = async (taskId: string) => {
        if (!ctx) return
        await startTaskAction(taskId, ctx.orgId, { id: ctx.userId, name: ctx.userName })
        toast.success('Tarea iniciada')
        loadTasks()
    }
    const handleCompleteTask = async (taskId: string) => {
        if (!ctx) return
        await completeTaskAction(taskId, ctx.orgId, { id: ctx.userId, name: ctx.userName })
        toast.success('Tarea completada')
        loadTasks()
    }
    const handleDeleteTask = async (taskId: string) => {
        if (!ctx) return
        await deleteTaskAction(taskId, ctx.orgId)
        toast.success('Tarea eliminada')
        if (selectedTask?.id === taskId) setSelectedTask(null)
        loadTasks()
    }
    const handleDuplicateTask = async (task: TeamTask) => {
        if (!ctx) return
        await duplicateTaskAction(task.id, ctx.orgId, {}, { id: ctx.userId, name: ctx.userName })
        toast.success('Tarea duplicada')
        loadTasks()
    }

    // ── Indicadores (siempre sobre todas las tareas) ──
    const todayStr = new Date().toLocaleDateString('en-CA')
    const kpis = {
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        overdue: tasks.filter(t => isOverdue(t)).length,
        completed_today: tasks.filter(t => t.status === 'completed' && t.completed_at
            && new Date(t.completed_at).toLocaleDateString('en-CA') === todayStr).length,
    }

    // ── Filtered tasks ──
    const filteredTasks = tasks.filter(t => {
        if (taskFilters.status && t.status !== taskFilters.status) return false
        if (taskFilters.area && t.area !== taskFilters.area) return false
        if (taskFilters.property_id && t.property_id !== taskFilters.property_id) return false
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

    // ── Vista por persona: tareas abiertas agrupadas por responsable ──
    const openTasks = filteredTasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
    const people = [
        ...(ctx?.teamMembers || []).map(m => ({ id: m.id, name: m.full_name, role: m.role })),
        // Responsables que ya no están en el equipo pero conservan tareas
        ...Array.from(new Set(openTasks.map(t => t.assigned_to).filter((id): id is string => !!id)))
            .filter(id => !(ctx?.teamMembers || []).some(m => m.id === id))
            .map(id => ({ id, name: openTasks.find(t => t.assigned_to === id)?.assigned_name || 'Sin nombre', role: '' })),
    ].map(p => {
        const own = openTasks.filter(t => t.assigned_to === p.id)
        return { ...p, tasks: own, overdue: own.filter(t => isOverdue(t)).length }
    }).sort((a, b) => b.tasks.length - a.tasks.length)
    const unassigned = openTasks.filter(t => !t.assigned_to)

    const openCreate = () => { setCreateTaskPrefill(null); setShowCreateModal(true) }
    // La lista no trae checklist, comentarios ni historial: se cargan al abrir la tarea
    const selectTask = async (task: TeamTask) => {
        if (selectedTask?.id === task.id) return setSelectedTask(null)
        setSelectedTask(task)
        const r = await getTeamTaskByIdAction(task.id)
        if (r.success && r.task) setSelectedTask(prev => prev?.id === task.id ? r.task! : prev)
    }
    const renderRow = (task: TeamTask) => (
        <TaskRow key={task.id} task={task}
            onClick={() => selectTask(task)}
            onStart={() => handleStartTask(task.id)}
            onComplete={() => handleCompleteTask(task.id)}
            onDuplicate={() => handleDuplicateTask(task)}
            onDelete={() => handleDeleteTask(task.id)}
        />
    )

    const KPIS = [
        { label: 'Pendientes', value: kpis.pending, icon: ClipboardList, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: 'En proceso', value: kpis.in_progress, icon: Play, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Vencidas', value: kpis.overdue, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        { label: 'Completadas hoy', value: kpis.completed_today, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    ]

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
                            <h1 className="text-3xl font-black tracking-tight text-white">Control Operativo</h1>
                            <p className="text-sm text-zinc-500 mt-0.5">Asigna tareas a tu equipo y sigue su avance. Cada quien las ve en <span className="text-zinc-300 font-semibold">Mis Tareas</span> de su panel.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={loadTasks}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all">
                            <RefreshCw size={12} />
                            Actualizar
                        </button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={openCreate}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20">
                            <Plus size={14} />
                            Nueva Tarea
                        </motion.button>
                    </div>
                </motion.div>

                {/* ─ Indicadores ─ */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {KPIS.map(k => (
                        <div key={k.label} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                            <div>
                                <p className={`text-2xl font-black ${k.color}`}>{tasksLoading ? '—' : k.value}</p>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{k.label}</p>
                            </div>
                            <div className={`p-2.5 rounded-xl ${k.bg}`}>
                                <k.icon size={18} className={k.color} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* ─ Content Area ─ */}
                <div className={`flex gap-5 transition-all duration-300 ${selectedTask ? 'items-start' : ''}`}>
                    <div className={`flex-1 min-w-0 transition-all duration-300 ${selectedTask ? 'max-w-[calc(100%-380px)]' : 'w-full'}`}>
                        <div className="space-y-4">
                            {/* Toolbar */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                                    {([
                                        { key: 'persona', label: 'Por persona', icon: Users },
                                        { key: 'list', label: 'Lista', icon: LayoutList },
                                        { key: 'kanban', label: 'Por estado', icon: Kanban },
                                    ] as const).map(v => (
                                        <button key={v.key} onClick={() => setTaskView(v.key)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${taskView === v.key ? 'bg-indigo-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                            <v.icon size={13} /> {v.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                                    <input value={taskFilters.search} onChange={e => setTaskFilters(prev => ({ ...prev, search: e.target.value }))}
                                        placeholder="Buscar tarea o persona..."
                                        className="pl-8 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 transition-colors w-52" />
                                </div>
                                {taskView === 'list' && (
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
                                )}
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
                            </div>

                            {tasksLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                </div>
                            ) : tasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                                    <ClipboardList size={32} className="text-zinc-700" />
                                    <p className="text-sm font-bold text-zinc-400">Todavía no hay tareas para tu equipo</p>
                                    <p className="text-xs text-zinc-600 max-w-sm">Crea una tarea, asígnala a alguien de tu equipo y le llegará a su panel en <span className="text-zinc-400">Mis Tareas</span> con aviso por WhatsApp.</p>
                                    <button onClick={openCreate}
                                        className="mt-2 flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 rounded-xl text-xs font-bold transition-all">
                                        <Plus size={12} /> Crear primera tarea
                                    </button>
                                </div>
                            ) : taskView === 'persona' ? (
                                /* ── VISTA POR PERSONA ── */
                                <div className="space-y-4">
                                    {people.map(p => (
                                        <div key={p.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-9 h-9 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-300 font-black text-sm">
                                                    {(p.name || '?').trim().charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{p.name}</p>
                                                    {p.role && <p className="text-[10px] text-zinc-500">{ROLE_LABELS[p.role] || p.role}</p>}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold">
                                                    <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400">{p.tasks.length} abiertas</span>
                                                    {p.overdue > 0 && <span className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400">{p.overdue} vencidas</span>}
                                                </div>
                                            </div>
                                            {p.tasks.length === 0 ? (
                                                <p className="text-xs text-zinc-600 pl-12">Sin tareas pendientes ✅</p>
                                            ) : (
                                                <div className="space-y-2">{p.tasks.map(renderRow)}</div>
                                            )}
                                        </div>
                                    ))}
                                    {unassigned.length > 0 && (
                                        <div className="rounded-2xl border border-dashed border-white/[0.1] p-4">
                                            <p className="text-sm font-bold text-zinc-300 mb-3">Sin asignar <span className="text-zinc-600 font-normal">· {unassigned.length}</span></p>
                                            <div className="space-y-2">{unassigned.map(renderRow)}</div>
                                        </div>
                                    )}
                                    <p className="text-[11px] text-zinc-600">Aquí solo aparecen las tareas abiertas. Las completadas están en la vista de Lista o Por estado.</p>
                                </div>
                            ) : filteredTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-2">
                                    <ClipboardList size={28} className="text-zinc-700" />
                                    <p className="text-sm font-bold text-zinc-500">No hay tareas con estos filtros</p>
                                </div>
                            ) : taskView === 'list' ? (
                                <div className="space-y-2">{filteredTasks.map(renderRow)}</div>
                            ) : (
                                /* ── POR ESTADO ── */
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {(['pending', 'in_progress', 'completed'] as TaskStatus[]).map(status => (
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
                                                    <KanbanCard key={task.id} task={task} onClick={() => selectTask(task)} />
                                                ))}
                                                {kanbanColumns[status].length === 0 && (
                                                    <div className="py-6 text-center text-[9px] text-zinc-700 border border-dashed border-white/[0.05] rounded-xl">Sin tareas</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─ Side Panel ─ */}
                    <AnimatePresence>
                        {selectedTask && ctx && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 360 }}
                                exit={{ opacity: 0, width: 0 }}
                                className="shrink-0 rounded-2xl overflow-hidden border border-white/[0.06] h-[calc(100vh-280px)] sticky top-6"
                                style={{ minWidth: 360 }}
                            >
                                <TaskDetailPanel
                                    key={`${selectedTask.id}-${selectedTask.comments ? 'full' : 'base'}`}
                                    task={selectedTask}
                                    onClose={() => setSelectedTask(null)}
                                    onRefresh={() => { loadTasks(); setSelectedTask(null) }}
                                    orgId={ctx.orgId}
                                    userId={ctx.userId}
                                    userName={ctx.userName}
                                />
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
                        onCreated={loadTasks}
                        orgId={ctx.orgId}
                        userId={ctx.userId}
                        userName={ctx.userName}
                        properties={ctx.properties}
                        teamMembers={ctx.teamMembers}
                        prefill={createTaskPrefill}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
