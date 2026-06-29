// Types for Control Operativo v2.0 — Tareas del Equipo

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskArea =
    | 'security'
    | 'admin'
    | 'maintenance'
    | 'cleaning'
    | 'gardening'
    | 'pool'
    | 'electrical'
    | 'plumbing'
    | 'provider'
    | 'other'

export const TASK_AREA_LABELS: Record<TaskArea, string> = {
    security: 'Seguridad',
    admin: 'Auxiliar Administrativo',
    maintenance: 'Mantenimiento',
    cleaning: 'Limpieza',
    gardening: 'Jardinería',
    pool: 'Alberca',
    electrical: 'Electricidad',
    plumbing: 'Plomería',
    provider: 'Proveedor',
    other: 'Otro',
}

export const TASK_AREA_ICONS: Record<TaskArea, string> = {
    security: '🛡️',
    admin: '📋',
    maintenance: '🔧',
    cleaning: '🧹',
    gardening: '🌿',
    pool: '🏊',
    electrical: '⚡',
    plumbing: '🚰',
    provider: '🏗️',
    other: '📌',
}

// ─── Recurrence ───────────────────────────────────────────────────────────────

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

export interface RecurrenceRule {
    type: RecurrenceType
    interval?: number          // Every N days/weeks/months
    days_of_week?: number[]    // 0=Sun, 1=Mon ... 6=Sat
    day_of_month?: number      // 1-31
    end_date?: string          // ISO date
    max_instances?: number
}

// ─── Main TeamTask ─────────────────────────────────────────────────────────────

export interface TeamTask {
    id: string
    organization_id: string
    property_id: string           // condominium_id — REQUIRED

    area: TaskArea
    assigned_to?: string          // auth.users.id
    assigned_name?: string        // Denormalized for display

    title: string
    description?: string
    task_type: TaskArea           // Matches area for filtering
    priority: TaskPriority
    status: TaskStatus

    estimated_minutes?: number
    started_at?: string
    completed_at?: string
    due_date?: string             // ISO date
    scheduled_at?: string         // ISO datetime

    attachments?: string[]
    images?: string[]

    recurrence_rule?: RecurrenceRule | null

    // Link back to originating incident
    source_incident_id?: string

    created_by?: string
    created_at: string
    updated_at: string

    // Populated by joins
    property_name?: string
    checklist_items?: TaskChecklistItem[]
    comments?: TaskComment[]
    history?: TaskHistory[]
    checklist_progress?: { total: number; completed: number }
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export interface TaskChecklistItem {
    id: string
    task_id: string
    organization_id: string
    label: string
    is_completed: boolean
    completed_by?: string
    completed_by_name?: string
    completed_at?: string
    created_at: string
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface TaskComment {
    id: string
    task_id: string
    organization_id: string
    author_id: string
    author_name: string
    body: string
    attachments?: string[]
    created_at: string
}

export interface IncidentComment {
    id: string
    ticket_id: string
    organization_id: string
    author_id: string
    author_name: string
    body: string
    attachments?: string[]
    is_internal: boolean
    created_at: string
}

// ─── History / Audit ──────────────────────────────────────────────────────────

export type TaskHistoryAction =
    | 'create'
    | 'update'
    | 'reassign'
    | 'start'
    | 'complete'
    | 'cancel'
    | 'checklist_mark'
    | 'comment'
    | 'evidence_upload'

export interface TaskHistory {
    id: string
    task_id: string
    organization_id: string
    user_id?: string
    user_name: string
    action: TaskHistoryAction
    details?: string
    created_at: string
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateTaskDTO {
    organization_id: string
    property_id: string
    area: TaskArea
    task_type: TaskArea
    title: string
    description?: string
    priority: TaskPriority
    assigned_to?: string
    assigned_name?: string
    estimated_minutes?: number
    scheduled_at?: string
    due_date?: string
    recurrence_rule?: RecurrenceRule | null
    source_incident_id?: string
    checklist_items?: string[]   // Labels to create
    images?: string[]
}

export interface UpdateTaskDTO {
    area?: TaskArea
    title?: string
    description?: string
    priority?: TaskPriority
    status?: TaskStatus
    assigned_to?: string
    assigned_name?: string
    estimated_minutes?: number
    scheduled_at?: string
    due_date?: string
    started_at?: string
    completed_at?: string
    images?: string[]
    attachments?: string[]
    resolution_notes?: string
    recurrence_rule?: RecurrenceRule | null
}

// ─── KPI Types ────────────────────────────────────────────────────────────────

export interface OperationsKPIs {
    active_incidents: number
    critical_incidents: number
    pending_tasks: number
    overdue_tasks: number
    completed_today: number
    staff_working: number
}

// ─── Team Member (for assignment dropdown) ────────────────────────────────────

export interface TeamMember {
    id: string            // user_id in auth.users
    full_name: string
    email: string
    role: string
    role_label?: string
}
