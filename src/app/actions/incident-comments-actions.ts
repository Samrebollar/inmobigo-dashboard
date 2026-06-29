'use server'

import { createClient } from '@supabase/supabase-js'
import type { IncidentComment } from '@/types/team-tasks'

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

export async function getIncidentCommentsAction(ticketId: string) {
    try {
        const supabase = getAdminClient()
        const { data, error } = await supabase
            .from('incident_comments')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true })

        if (error) return { success: false, error: error.message }
        return { success: true, comments: (data || []) as IncidentComment[] }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function addIncidentCommentAction(
    ticketId: string,
    organizationId: string,
    author: { id: string; name: string },
    body: string,
    isInternal: boolean = true,
    attachments?: string[]
) {
    try {
        const supabase = getAdminClient()
        const { data, error } = await supabase
            .from('incident_comments')
            .insert({
                ticket_id: ticketId,
                organization_id: organizationId,
                author_id: author.id,
                author_name: author.name,
                body,
                is_internal: isInternal,
                attachments: attachments || [],
            })
            .select()
            .single()

        if (error) return { success: false, error: error.message }
        return { success: true, comment: data as IncidentComment }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function deleteIncidentCommentAction(commentId: string) {
    try {
        const supabase = getAdminClient()
        const { error } = await supabase
            .from('incident_comments')
            .delete()
            .eq('id', commentId)

        if (error) return { success: false, error: error.message }
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}
