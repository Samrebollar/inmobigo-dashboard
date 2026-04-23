'use server'

import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Detecta el rol y la redirección adecuada para un usuario autenticado.
 * Prioriza la tabla 'residents' para detectar residentes/inquilinos.
 * Si no existe, usa la tabla 'users' para detectar administradores.
 */
export async function getUserRoleAction(userId: string) {
    if (!userId) return { success: false, error: 'User ID required' };

    const supabase = createAdminClient();

    try {
        console.log(`🔍 [getUserRoleAction] Detectando rol y ruta para: ${userId}`);

        // Query sugerida: Detectar rol en 'users' y opcionalmente en 'residents'
        const { data, error } = await supabase
            .from('users')
            .select(`
                role,
                residents:residents(role, resident_type)
            `)
            .eq('id', userId)
            .single();

        if (error) {
            console.error('❌ [getUserRoleAction] Error querying roles:', error);
            return { success: false, error: error.message };
        }

        // Lógica de prioridad:
        // Si existe en 'residents', usamos ese rol (resident/tenant).
        // Si no, usamos el rol de la tabla 'users' (admin_condominio/admin_propiedades).
        const residentData = data.residents?.[0];
        const resident_role = residentData?.role;
        const user_role = data.role;
        
        const finalRole = resident_role || user_role;
        let redirectPath = '/dashboard';

        // Definición de rutas según el rol detectado
        switch (finalRole) {
            case 'admin_condominio':
                redirectPath = '/dashboard/admin-condominio';
                break;
            case 'admin_propiedades':
                redirectPath = '/dashboard/admin-propiedades';
                break;
            case 'resident':
                redirectPath = '/dashboard/resident';
                break;
            case 'tenant':
                redirectPath = '/dashboard/tenant';
                break;
            default:
                // Manejo de casos especiales por resident_type si el role no es explícito
                if (residentData?.resident_type === 'propiedades') {
                    redirectPath = '/dashboard/tenant';
                } else if (residentData) {
                    redirectPath = '/dashboard/resident';
                }
                break;
        }

        console.log(`✅ [getUserRoleAction] Rol: ${finalRole}, Redirect: ${redirectPath}`);
        
        return { 
            success: true, 
            role: finalRole, 
            redirectPath 
        };

    } catch (err: any) {
        console.error('❌ [getUserRoleAction] Error crítico:', err);
        return { 
            success: false, 
            error: err.message || 'Error detectando el rol del usuario.' 
        };
    }
}
