'use server'

import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Detecta el rol y la redirección adecuada para un usuario autenticado.
 * Prioriza la tabla 'residents' para detectar residentes/inquilinos.
 * Si no existe, usa la tabla 'users' para detectar administradores.
 */
export async function getUserRoleAction(userId: string) {
    // Retorno de seguridad si no hay ID
    if (!userId) return { success: true, role: 'user', redirectPath: '/dashboard' };

    const supabase = createAdminClient();

    try {
        // 1. Verificar si es residente (Prioridad)
        const { data: res } = await supabase
            .from('residents')
            .select('role, resident_type')
            .eq('user_id', userId)
            .maybeSingle();

        if (res) {
            return { success: true, role: res.role || 'resident', redirectPath: '/dashboard' };
        }

        // 2. Verificar si es administrador
        const { data: user } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .maybeSingle();

        if (user) {
            return { success: true, role: user.role, redirectPath: '/dashboard' };
        }

        // 3. Fallback final
        return { success: true, role: 'user', redirectPath: '/dashboard' };

    } catch (e) {
        // Ante cualquier error, no romper la app, simplemente mandar al dashboard base
        return { success: true, role: 'user', redirectPath: '/dashboard' };
    }
}
