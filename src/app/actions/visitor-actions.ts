'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function deleteVisitorPassAction(passId: string) {
    if (!passId) return { success: false, error: 'ID de pase no proporcionado' }

    try {
        const adminClient = createAdminClient()
        
        const { error } = await adminClient
            .from('visitor_passes')
            .delete()
            .eq('id', passId)

        if (error) throw error

        // Revalidar las rutas donde se muestran los pases
        revalidatePath('/dashboard/servicios')
        revalidatePath('/dashboard/servicios/pases')

        return { success: true }
    } catch (error: any) {
        console.error('Error in deleteVisitorPassAction:', error)
        return { success: false, error: error.message || 'Error desconocido al borrar' }
    }
}
