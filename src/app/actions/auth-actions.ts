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

export async function resetPasswordWithCodeAction(
    password: string,
    code?: string,
    token_hash?: string,
    type?: string
) {
    const supabase = await createClient();

    try {
        // 1. Validar la identidad primero en el servidor
        if (code) {
            const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
            if (authError) throw authError;
        } else if (token_hash && type) {
            const { error: authError } = await supabase.auth.verifyOtp({
                token_hash,
                type: type as any,
            });
            if (authError) throw authError;
        } else {
            // Si no hay código ni hash, verificar si ya hay una sesión (para navegadores que sí la guardaron)
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No se detectó una invitación válida o sesión activa.');
        }

        // 2. Una vez validado (ya tenemos sesión en el servidor), actualizar la contraseña
        const { error: updateError } = await supabase.auth.updateUser({
            password: password,
        });

        if (updateError) throw updateError;

        return { success: true };
    } catch (error: any) {
        console.error('❌ [resetPasswordWithCodeAction] Error:', error.message);
        return { success: false, error: error.message };
    }
}
