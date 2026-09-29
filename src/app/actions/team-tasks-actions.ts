'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createSessionClient } from '@/utils/supabase/server'
import type {
    CreateTaskDTO,
    UpdateTaskDTO,
    TeamTask,
    TaskChecklistItem,
    TaskComment,
    TaskHistoryAction,
    RecurrenceRule,
} from '@/types/team-tasks'

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

/** Fecha de hoy en México (YYYY-MM-DD); el servidor corre en UTC. */
function todayMx() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESO — las acciones usan service role, así que se valida aquí que quien
// llama pertenece a la organización (antes se confiaba en el organizationId
// que mandaba el navegador).
// ─────────────────────────────────────────────────────────────────────────────

type Caller = { userId: string; organizationId: string; role: string | null }

async function getCaller(): Promise<Caller | null> {
    const session = await createSessionClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return null
    const { data: orgUser } = await getAdminClient()
        .from('organization_users')
        .select('organization_id, role_new')
        .eq('user_id', user.id)
        .maybeSingle()
    if (!orgUser?.organization_id) return null
    return { userId: user.id, organizationId: orgUser.organization_id, role: orgUser.role_new || null }
}

/** Administración de la organización (el guardia usa las acciones de Mis Tareas). */
async function assertOrgAdmin(organizationId: string) {
    const caller = await getCaller()
    if (!caller || caller.organizationId !== organizationId || caller.role === 'security') {
        throw new Error('No autorizado')
    }
    return caller
}

/** Tarea de la organización del usuario; un guardia solo puede tocar las suyas. */
async function assertTaskAccess(taskId: string) {
    const caller = await getCaller()
    if (!caller) throw new Error('No autorizado')
    const { data: task } = await getAdminClient()
        .from('team_tasks')
        .select('id, organization_id, assigned_to')
        .eq('id', taskId)
        .maybeSingle()
    if (!task || task.organization_id !== caller.organizationId) throw new Error('No autorizado')
    if (caller.role === 'security' && task.assigned_to !== caller.userId) throw new Error('No autorizado')
    return caller
}

async function assertChecklistItemAccess(itemId: string) {
    const { data: item } = await getAdminClient()
        .from('task_checklist_items')
        .select('task_id')
        .eq('id', itemId)
        .maybeSingle()
    if (!item) throw new Error('No autorizado')
    return assertTaskAccess(item.task_id)
}

/**
 * Aviso por WhatsApp al responsable (flujo n8n 34). n8n busca el teléfono en
 * la base de datos a partir del task_id, así que el webhook no puede usarse
 * para escribir a números arbitrarios.
 */
async function notifyTaskAssigned(taskId: string) {
    try {
        const base = process.env.N8N_BASE_URL || 'https://n8n.inmobigo.mx'
        await fetch(`${base}/webhook/tarea-asignada-equipo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId }),
            signal: AbortSignal.timeout(5000),
        })
    } catch (err) {
        console.error('[notifyTaskAssigned]', err)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getTeamTasksAction(
    organizationId: string,
    filters?: {
        property_id?: string
        area?: string
        assigned_to?: string
        status?: string
        priority?: string
        due_date_from?: string
        due_date_to?: string
    }
) {
    try {
        await assertOrgAdmin(organizationId)
        const supabase = getAdminClient()

        let query = supabase
            .from('team_tasks')
            .select(`
                *,
                condominiums ( name )
            `)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })

        if (filters?.property_id) query = query.eq('property_id', filters.property_id)
        if (filters?.area) query = query.eq('area', filters.area)
        if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
        if (filters?.status) query = query.eq('status', filters.status)
        if (filters?.priority) query = query.eq('priority', filters.priority)
        if (filters?.due_date_from) query = query.gte('due_date', filters.due_date_from)
        if (filters?.due_date_to) query = query.lte('due_date', filters.due_date_to)

        const { data, error } = await query

        if (error) return { success: false, error: error.message }

        const tasks: TeamTask[] = (data || []).map((t: any) => ({
            ...t,
            property_name: t.condominiums?.name,
        }))

        return { success: true, tasks }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function getTeamTaskByIdAction(taskId: string) {
    try {
        await assertTaskAccess(taskId)
        const supabase = getAdminClient()

        const [taskResult, checklistResult, commentsResult, historyResult] = await Promise.all([
            supabase
                .from('team_tasks')
                .select('*, condominiums ( name )')
                .eq('id', taskId)
                .single(),
            supabase
                .from('task_checklist_items')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true }),
            supabase
                .from('task_comments')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', { ascending: false }),
            supabase
                .from('task_history')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', { ascending: false })
                .limit(50),
        ])

        if (taskResult.error) return { success: false, error: taskResult.error.message }

        const task: TeamTask = {
            ...taskResult.data,
            property_name: (taskResult.data as any).condominiums?.name,
            checklist_items: checklistResult.data || [],
            comments: commentsResult.data || [],
            history: historyResult.data || [],
        }

        return { success: true, task }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function getOperationsKPIsAction(organizationId: string, propertyId?: string) {
    try {
        await assertOrgAdmin(organizationId)
        const supabase = getAdminClient()

        const today = new Date().toISOString().split('T')[0]

        // Build base queries
        let ticketsQuery = supabase
            .from('tickets')
            .select('id, status, priority', { count: 'exact', head: false })
            .eq('organization_id', organizationId)
            .in('status', ['open', 'in_progress'])

        let tasksQuery = supabase
            .from('team_tasks')
            .select('id, status, due_date, assigned_to, started_at, completed_at', { count: 'exact', head: false })
            .eq('organization_id', organizationId)

        if (propertyId) {
            ticketsQuery = ticketsQuery.eq('condominium_id', propertyId)
            tasksQuery = tasksQuery.eq('property_id', propertyId)
        }

        const [activeIncidents, pendingTasks] = await Promise.all([
            ticketsQuery,
            tasksQuery,
        ])

        const incidents = activeIncidents.data || []
        const tasks = pendingTasks.data || []

        const critical_incidents = incidents.filter((t: any) => t.priority === 'critical' || t.priority === 'urgent').length
        const pending_tasks = tasks.filter((t: any) => t.status === 'pending').length
        const overdue_tasks = tasks.filter((t: any) =>
            t.status !== 'completed' && t.status !== 'cancelled' && t.due_date && t.due_date < today
        ).length
        const completed_today = tasks.filter((t: any) =>
            t.status === 'completed' && t.completed_at && t.completed_at.split('T')[0] === today
        ).length
        const staff_working = new Set(
            tasks.filter((t: any) => t.status === 'in_progress' && t.assigned_to).map((t: any) => t.assigned_to)
        ).size

        return {
            success: true,
            kpis: {
                active_incidents: incidents.length,
                critical_incidents,
                pending_tasks,
                overdue_tasks,
                completed_today,
                staff_working,
            }
        }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS — Task CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function createTaskAction(
    dto: CreateTaskDTO,
    createdBy: { id: string; name: string }
) {
    try {
        await assertOrgAdmin(dto.organization_id)
        const supabase = getAdminClient()

        const { checklist_items, ...taskPayload } = dto

        const { data: task, error } = await supabase
            .from('team_tasks')
            .insert({
                ...taskPayload,
                recurrence_rule: taskPayload.recurrence_rule
                    ? JSON.stringify(taskPayload.recurrence_rule)
                    : null,
                created_by: createdBy.id,
            })
            .select()
            .single()

        if (error) return { success: false, error: error.message }

        // Insert checklist items if provided
        if (checklist_items && checklist_items.length > 0) {
            const items = checklist_items.map((label: string) => ({
                task_id: task.id,
                organization_id: dto.organization_id,
                label,
            }))
            await supabase.from('task_checklist_items').insert(items)
        }

        // Record history
        await recordTaskHistory(supabase, {
            task_id: task.id,
            organization_id: dto.organization_id,
            user_id: createdBy.id,
            user_name: createdBy.name,
            action: 'create',
            details: `Tarea creada: "${task.title}"`,
        })

        if (task.assigned_to) await notifyTaskAssigned(task.id)

        return { success: true, task }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function updateTaskAction(
    taskId: string,
    organizationId: string,
    dto: UpdateTaskDTO,
    updatedBy: { id: string; name: string },
    changeDetails?: string
) {
    try {
        const caller = await assertTaskAccess(taskId)
        if (caller.organizationId !== organizationId) throw new Error('No autorizado')
        // El guardia solo puede avanzar su propia tarea (iniciar / completar)
        if (caller.role === 'security' && Object.keys(dto).some(k => !['status', 'started_at', 'completed_at'].includes(k))) {
            throw new Error('No autorizado')
        }
        const supabase = getAdminClient()

        const { data: previous } = await supabase
            .from('team_tasks')
            .select('assigned_to, status, due_date, recurrence_rule')
            .eq('id', taskId)
            .maybeSingle()

        // Una ocurrencia de tarea recurrente es para su día: el equipo no puede
        // iniciarla ni completarla por adelantado (antes se podían completar
        // los recorridos de toda la semana en unos minutos)
        if (caller.role === 'security' && previous?.recurrence_rule && previous.due_date && previous.due_date > todayMx()) {
            const fecha = new Date(`${previous.due_date}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
            return { success: false, error: `Esta tarea es para el ${fecha}` }
        }

        const payload: any = { ...dto, updated_at: new Date().toISOString() }
        if (payload.recurrence_rule !== undefined) {
            payload.recurrence_rule = payload.recurrence_rule
                ? JSON.stringify(payload.recurrence_rule)
                : null
        }

        const { data: task, error } = await supabase
            .from('team_tasks')
            .update(payload)
            .eq('id', taskId)
            .eq('organization_id', organizationId)
            .select()
            .single()

        if (error) return { success: false, error: error.message }

        // Determine history action
        let action: TaskHistoryAction = 'update'
        if (dto.status === 'in_progress' && dto.started_at) action = 'start'
        else if (dto.status === 'completed') action = 'complete'
        else if (dto.status === 'cancelled') action = 'cancel'
        else if (dto.assigned_to) action = 'reassign'

        // Solo cuenta como "se acaba de completar" si antes no lo estaba: evita
        // que un doble clic o volver a marcar una tarea ya completada genere
        // (o se salte) ocurrencias recurrentes
        const justCompleted = action === 'complete' && previous?.status !== 'completed'

        await recordTaskHistory(supabase, {
            task_id: taskId,
            organization_id: organizationId,
            user_id: updatedBy.id,
            user_name: updatedBy.name,
            action,
            details: changeDetails || `Tarea actualizada`,
        })

        if (dto.assigned_to && dto.assigned_to !== previous?.assigned_to) {
            await notifyTaskAssigned(taskId)
        }

        // Si esta tarea vino de una incidencia (source_incident_id) y se acaba de
        // completar, la incidencia se resuelve sola — antes había que crear la tarea
        // Y ADEMÁS acordarse de ir a Incidencias a cerrarla a mano (cosa que ni
        // siquiera era posible: no existía ninguna acción para cambiar su estado).
        if (justCompleted && task.source_incident_id) {
            await supabase
                .from('tickets')
                .update({ status: 'resolved' })
                .eq('id', task.source_incident_id)
                .eq('organization_id', organizationId)

            await supabase.from('incident_comments').insert({
                ticket_id: task.source_incident_id,
                organization_id: organizationId,
                author_id: updatedBy.id,
                author_name: updatedBy.name,
                body: `Resuelta automáticamente al completarse la tarea "${task.title}"`,
                is_internal: true,
            })
        }

        // Si la tarea es recurrente y se acaba de completar, se genera sola la
        // siguiente ocurrencia — antes "Recurrencia" en el formulario no hacía
        // nada: la tarea completada simplemente desaparecía del tablero y
        // alguien tenía que acordarse de volver a crearla a mano.
        if (justCompleted && task.recurrence_rule) {
            try {
                const rule: RecurrenceRule = JSON.parse(task.recurrence_rule)
                await generateNextRecurrence(supabase, task, rule, updatedBy)
            } catch (err) {
                console.error('Error generando la siguiente ocurrencia recurrente:', err)
            }
        }

        return { success: true, task }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECURRENCE
// ─────────────────────────────────────────────────────────────────────────────

function advanceDate(base: Date, rule: RecurrenceRule): Date {
    const d = new Date(base)
    const interval = Math.max(1, Number(rule.interval) || 1)
    switch (rule.type) {
        case 'daily': d.setDate(d.getDate() + interval); break
        case 'weekly': d.setDate(d.getDate() + interval * 7); break
        case 'monthly': d.setMonth(d.getMonth() + interval); break
        case 'yearly': d.setFullYear(d.getFullYear() + interval); break
        case 'custom': d.setDate(d.getDate() + interval); break
        default: d.setDate(d.getDate() + 1)
    }
    return d
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateNextRecurrence(supabase: any, completedTask: any, rule: RecurrenceRule, createdBy: { id: string; name: string }) {
    // Se avanza desde la fecha límite ORIGINAL (no desde hoy), para que una tarea
    // que se completa tarde no corra todo el calendario de la recurrencia — "limpieza
    // de alberca todos los lunes" debe seguir cayendo en lunes aunque esta semana se
    // haya completado el martes.
    const baseDateStr = completedTask.due_date || new Date().toISOString().split('T')[0]
    const baseDate = new Date(`${baseDateStr}T12:00:00`)
    const nextDueDate = advanceDate(baseDate, rule).toISOString().split('T')[0]

    if (rule.end_date && nextDueDate > rule.end_date) return

    let nextScheduledAt: string | null = null
    if (completedTask.scheduled_at) {
        nextScheduledAt = advanceDate(new Date(completedTask.scheduled_at), rule).toISOString()
    }

    const {
        id, created_at, updated_at, started_at, completed_at,
        images, attachments, due_date, scheduled_at, status,
        ...rest
    } = completedTask

    // Si ya existe la ocurrencia de esa fecha, no se duplica
    let existingQuery = supabase
        .from('team_tasks')
        .select('id')
        .eq('organization_id', completedTask.organization_id)
        .eq('title', completedTask.title)
        .eq('due_date', nextDueDate)
        .limit(1)
    existingQuery = completedTask.assigned_to
        ? existingQuery.eq('assigned_to', completedTask.assigned_to)
        : existingQuery.is('assigned_to', null)
    const { data: existing } = await existingQuery
    if (existing && existing.length > 0) return

    const { data: newTask, error } = await supabase
        .from('team_tasks')
        .insert({
            ...rest,
            due_date: nextDueDate,
            scheduled_at: nextScheduledAt,
            status: 'pending',
            created_by: createdBy.id,
        })
        .select()
        .single()

    if (error || !newTask) {
        console.error('[generateNextRecurrence] no se pudo crear la siguiente ocurrencia:', error, { taskId: completedTask.id, nextDueDate })
        return
    }

    // El checklist se copia como plantilla (sin marcar) — la ocurrencia nueva
    // arranca desde cero, no con las casillas ya completadas de la anterior.
    const { data: checklistItems } = await supabase
        .from('task_checklist_items')
        .select('label')
        .eq('task_id', completedTask.id)

    if (checklistItems && checklistItems.length > 0) {
        await supabase.from('task_checklist_items').insert(
            checklistItems.map((item: any) => ({
                task_id: newTask.id,
                organization_id: completedTask.organization_id,
                label: item.label,
            }))
        )
    }

    await recordTaskHistory(supabase, {
        task_id: newTask.id,
        organization_id: completedTask.organization_id,
        user_id: createdBy.id,
        user_name: createdBy.name,
        action: 'create',
        details: `Generada automáticamente por recurrencia de "${completedTask.title}"`,
    })
}

export async function startTaskAction(
    taskId: string,
    organizationId: string,
    updatedBy: { id: string; name: string }
) {
    return updateTaskAction(
        taskId,
        organizationId,
        { status: 'in_progress', started_at: new Date().toISOString() },
        updatedBy,
        'Tarea iniciada'
    )
}

export async function completeTaskAction(
    taskId: string,
    organizationId: string,
    updatedBy: { id: string; name: string }
) {
    return updateTaskAction(
        taskId,
        organizationId,
        { status: 'completed', completed_at: new Date().toISOString() },
        updatedBy,
        'Tarea completada'
    )
}

export async function deleteTaskAction(taskId: string, organizationId: string) {
    try {
        await assertOrgAdmin(organizationId)
        const supabase = getAdminClient()
        const { error } = await supabase
            .from('team_tasks')
            .delete()
            .eq('id', taskId)
            .eq('organization_id', organizationId)

        if (error) return { success: false, error: error.message }
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function duplicateTaskAction(
    taskId: string,
    organizationId: string,
    overrides: { property_id?: string; assigned_to?: string; assigned_name?: string; due_date?: string },
    createdBy: { id: string; name: string }
) {
    try {
        await assertOrgAdmin(organizationId)
        const supabase = getAdminClient()

        const { data: original, error: fetchErr } = await supabase
            .from('team_tasks')
            .select('*')
            .eq('id', taskId)
            .eq('organization_id', organizationId)
            .single()

        if (fetchErr || !original) return { success: false, error: fetchErr?.message || 'Tarea no encontrada' }

        // images/attachments son evidencia de ESA instancia (ej. foto de la fuga ya
        // reparada) — no aplican a la tarea nueva, que todavía no se ha hecho.
        const { id, created_at, updated_at, started_at, completed_at, images, attachments, ...rest } = original

        const { data: newTask, error } = await supabase
            .from('team_tasks')
            .insert({
                ...rest,
                ...overrides,
                status: 'pending',
                created_by: createdBy.id,
            })
            .select()
            .single()

        if (error) return { success: false, error: error.message }

        // Duplicate checklist items
        const { data: checklistItems } = await supabase
            .from('task_checklist_items')
            .select('label')
            .eq('task_id', taskId)

        if (checklistItems && checklistItems.length > 0) {
            await supabase.from('task_checklist_items').insert(
                checklistItems.map((item: any) => ({
                    task_id: newTask.id,
                    organization_id: organizationId,
                    label: item.label,
                }))
            )
        }

        await recordTaskHistory(supabase, {
            task_id: newTask.id,
            organization_id: organizationId,
            user_id: createdBy.id,
            user_name: createdBy.name,
            action: 'create',
            details: `Tarea duplicada desde: "${original.title}"`,
        })

        return { success: true, task: newTask }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────

export async function addChecklistItemAction(
    taskId: string,
    organizationId: string,
    label: string
) {
    try {
        await assertOrgAdmin(organizationId)
        const supabase = getAdminClient()
        const { data, error } = await supabase
            .from('task_checklist_items')
            .insert({ task_id: taskId, organization_id: organizationId, label })
            .select()
            .single()

        if (error) return { success: false, error: error.message }
        return { success: true, item: data }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function toggleChecklistItemAction(
    itemId: string,
    completed: boolean,
    completedBy: { id: string; name: string }
) {
    try {
        await assertChecklistItemAccess(itemId)
        const supabase = getAdminClient()
        const payload = completed
            ? { is_completed: true, completed_by: completedBy.id, completed_by_name: completedBy.name, completed_at: new Date().toISOString() }
            : { is_completed: false, completed_by: null, completed_by_name: null, completed_at: null }

        const { data, error } = await supabase
            .from('task_checklist_items')
            .update(payload)
            .eq('id', itemId)
            .select()
            .single()

        if (error) return { success: false, error: error.message }
        return { success: true, item: data }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function deleteChecklistItemAction(itemId: string) {
    try {
        const caller = await assertChecklistItemAccess(itemId)
        if (caller.role === 'security') throw new Error('No autorizado')
        const supabase = getAdminClient()
        const { error } = await supabase.from('task_checklist_items').delete().eq('id', itemId)
        if (error) return { success: false, error: error.message }
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────────────────────────────────────

export async function addTaskCommentAction(
    taskId: string,
    organizationId: string,
    author: { id: string; name: string },
    body: string,
    attachments?: string[]
) {
    try {
        const caller = await assertTaskAccess(taskId)
        if (caller.organizationId !== organizationId) throw new Error('No autorizado')
        const supabase = getAdminClient()
        const { data, error } = await supabase
            .from('task_comments')
            .insert({
                task_id: taskId,
                organization_id: organizationId,
                author_id: author.id,
                author_name: author.name,
                body,
                attachments: attachments || [],
            })
            .select()
            .single()

        if (error) return { success: false, error: error.message }

        await recordTaskHistory(supabase, {
            task_id: taskId,
            organization_id: organizationId,
            user_id: author.id,
            user_name: author.name,
            action: 'comment',
            details: body.substring(0, 100),
        })

        return { success: true, comment: data }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY (internal helper)
// ─────────────────────────────────────────────────────────────────────────────

async function recordTaskHistory(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    entry: {
        task_id: string
        organization_id: string
        user_id?: string
        user_name: string
        action: TaskHistoryAction
        details?: string
    }
) {
    return supabase.from('task_history').insert(entry)
}


// ─────────────────────────────────────────────────────────────────────────────
// MIS TAREAS — vista del miembro del equipo (guardia, auxiliar, etc.)
// ─────────────────────────────────────────────────────────────────────────────

/** Tareas asignadas al usuario de la sesión: abiertas + completadas en 7 días. */
export async function getMyTasksAction() {
    try {
        const caller = await getCaller()
        if (!caller) return { success: false, error: 'No autorizado', tasks: [] as TeamTask[] }

        const supabase = getAdminClient()
        const since = new Date(Date.now() - 7 * 86400000).toISOString()
        const { data, error } = await supabase
            .from('team_tasks')
            .select('*, condominiums ( name )')
            .eq('organization_id', caller.organizationId)
            .eq('assigned_to', caller.userId)
            .or(`status.in.(pending,in_progress),and(status.eq.completed,completed_at.gte."${since}")`)
            .order('due_date', { ascending: true, nullsFirst: false })

        if (error) return { success: false, error: error.message, tasks: [] as TeamTask[] }

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', caller.userId)
            .maybeSingle()

        // Las ocurrencias futuras de una tarea recurrente aparecen hasta su día
        const today = todayMx()
        const tasks: TeamTask[] = (data || [])
            .filter((t: any) => !(t.recurrence_rule && t.status === 'pending' && t.due_date && t.due_date > today))
            .map((t: any) => ({ ...t, property_name: t.condominiums?.name }))
        return {
            success: true,
            tasks,
            organizationId: caller.organizationId,
            userId: caller.userId,
            userName: profile?.full_name || 'Equipo',
        }
    } catch (err: any) {
        return { success: false, error: err.message, tasks: [] as TeamTask[] }
    }
}

/**
 * Foto de evidencia de una tarea: se guarda en task_evidence y se agrega como
 * comentario con la imagen adjunta (la ve la administración en la tarea).
 */
export async function addTaskEvidenceAction(formData: FormData) {
    try {
        const taskId = String(formData.get('task_id') || '')
        const file = formData.get('file')
        const note = String(formData.get('note') || '').trim()
        if (!taskId || !(file instanceof File)) return { success: false, error: 'Falta la foto' }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return { success: false, error: 'Formato de imagen no válido' }
        if (file.size > 5 * 1024 * 1024) return { success: false, error: 'La foto pesa más de 5 MB' }

        const caller = await assertTaskAccess(taskId)
        const supabase = getAdminClient()

        const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
        const path = `${caller.organizationId}/${taskId}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
            .from('task_evidence')
            .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type })
        if (uploadError) return { success: false, error: 'No se pudo subir la foto' }

        const { data: { publicUrl } } = supabase.storage.from('task_evidence').getPublicUrl(path)

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', caller.userId)
            .maybeSingle()
        const authorName = profile?.full_name || 'Equipo'

        const { data: comment, error } = await supabase
            .from('task_comments')
            .insert({
                task_id: taskId,
                organization_id: caller.organizationId,
                author_id: caller.userId,
                author_name: authorName,
                body: note || '📷 Foto de evidencia',
                attachments: [publicUrl],
            })
            .select()
            .single()
        if (error) return { success: false, error: error.message }

        await recordTaskHistory(supabase, {
            task_id: taskId,
            organization_id: caller.organizationId,
            user_id: caller.userId,
            user_name: authorName,
            action: 'comment',
            details: 'Subió una foto de evidencia',
        })

        return { success: true, comment }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}
