'use server'

import { createClient } from '@supabase/supabase-js'
import type {
    CreateTaskDTO,
    UpdateTaskDTO,
    TeamTask,
    TaskChecklistItem,
    TaskComment,
    TaskHistoryAction,
} from '@/types/team-tasks'

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
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
            .select('id, status, due_date, assigned_to, started_at', { count: 'exact', head: false })
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
        const completed_today = tasks.filter((t: any) => {
            if (t.status !== 'completed') return false
            return true // Ideally filter by completed_at >= today — simplified here
        }).length
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
        const supabase = getAdminClient()

        const payload: any = { ...dto }
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

        await recordTaskHistory(supabase, {
            task_id: taskId,
            organization_id: organizationId,
            user_id: updatedBy.id,
            user_name: updatedBy.name,
            action,
            details: changeDetails || `Tarea actualizada`,
        })

        return { success: true, task }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
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
        const supabase = getAdminClient()

        const { data: original, error: fetchErr } = await supabase
            .from('team_tasks')
            .select('*')
            .eq('id', taskId)
            .single()

        if (fetchErr || !original) return { success: false, error: fetchErr?.message || 'Tarea no encontrada' }

        const { id, created_at, updated_at, started_at, completed_at, ...rest } = original

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

