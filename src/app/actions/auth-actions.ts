'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

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
    type?: string,
    access_token?: string
) {
    console.log('🔑 [resetPasswordWithCodeAction] Iniciando intento de cambio de contraseña...');
    const supabase = await createClient();

    try {
        // Intento 1: ¿Viene un Access Token directo del cliente?
        if (access_token) {
            console.log('   - Intentando con Access Token...');
            const { error: err } = await supabase.auth.setSession({ access_token, refresh_token: '' });
            if (!err) console.log('   ✅ Autenticación por Token exitosa');
        } 
        
        // Intento 2: ¿Viene un Código de Invitación (PKCE)?
        else if (code) {
            console.log('   - Intentando con Código de Invitación (PKCE)...');
            const { error: err } = await supabase.auth.exchangeCodeForSession(code);
            if (!err) console.log('   ✅ Autenticación por Código exitosa');
            else console.log('   ❌ Error en Código:', err.message);
        }

        // Intento 3: ¿Viene un Token Hash (OTP)?
        else if (token_hash && type) {
            console.log('   - Intentando con Token Hash (OTP)...');
            const { error: err } = await supabase.auth.verifyOtp({ token_hash, type: type as any });
            if (!err) console.log('   ✅ Autenticación por Hash exitosa');
        }

        // VERIFICACIÓN FINAL: ¿Tenemos sesión ahora?
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('No se pudo validar tu identidad. Es posible que el enlace haya expirado o haya sido usado por tu aplicación de correo. Por favor solicita uno nuevo.');
        }

        // 2. Ejecutar el cambio de contraseña
        console.log('   - Ejecutando updateUser...');
        const { error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) throw updateError;

        console.log('   🎉 [resetPasswordWithCodeAction] Contraseña actualizada con éxito');
        return { success: true };

    } catch (error: any) {
        console.error('🔴 [resetPasswordWithCodeAction] ERROR CRÍTICO:', error.message);
        return { success: false, error: error.message };
    }
}

export async function adminResetPasswordAction(userId?: string, password?: string, email?: string) {
    console.log(`🛠️ [adminResetPasswordAction] Iniciando cambio forzado... ID: ${userId || 'N/A'}, Email: ${email || 'N/A'}`);
    const admin = createAdminClient();

    try {
        if (!password) throw new Error('La contraseña es requerida');
        
        let targetUserId = userId;

        // Si no tenemos el ID, lo buscamos directamente en nuestra tabla de residentes (más rápido y seguro)
        if (!targetUserId && email) {
            const { data: residentData, error: dbError } = await admin
                .from('residents')
                .select('auth_user_id')
                .eq('email', email.toLowerCase())
                .single();

            if (dbError || !residentData?.auth_user_id) {
                console.log('   ⚠️ No se encontró en tabla residents, intentando búsqueda global en Auth...');
                // Respaldo: Búsqueda global si no está en la tabla de residentes
                const { data: { users }, error: authError } = await admin.auth.admin.listUsers();
                const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
                if (!user) throw new Error('No se pudo localizar tu cuenta. Por favor verifica que el enlace sea el más reciente enviado a tu correo.');
                targetUserId = user.id;
            } else {
                targetUserId = residentData.auth_user_id;
            }
        }

        if (!targetUserId) throw new Error('Identificación de seguridad no encontrada.');

        // Forzar el cambio de contraseña con privilegios de administrador
        const { error: updateError } = await admin.auth.admin.updateUserById(targetUserId, {
            password: password
        });

        if (updateError) throw updateError;

        console.log(`✅ [adminResetPasswordAction] Contraseña actualizada con éxito para: ${targetUserId}`);
        return { success: true };
    } catch (error: any) {
        console.error('🔴 [adminResetPasswordAction] ERROR CRÍTICO:', error.message);
        return { success: false, error: error.message };
    }
}
