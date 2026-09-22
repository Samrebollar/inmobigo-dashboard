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
    access_token?: string,
    refresh_token?: string
) {
    console.log('🔑 [resetPasswordWithCodeAction] Iniciando intento de cambio de contraseña...');
    const supabase = await createClient();

    try {
        // Intento 1: ¿Viene un Access Token directo del cliente?
        if (access_token) {
            console.log('   - Intentando con Access Token...');
            // El refresh_token es obligatorio: sin él, setSession no puede validar
            // ni persistir la sesión (rompe justo el salto móvil correo -> navegador).
            const { error: err } = await supabase.auth.setSession({ access_token, refresh_token: refresh_token || '' });
            if (!err) console.log('   ✅ Autenticación por Token exitosa');
            else console.log('   ❌ Error en Token:', err.message);
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
            // Sin sesión verificada no se cambia la contraseña bajo ninguna circunstancia.
            return { success: false, error: 'SESSION_MISSING' };
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

export async function updateUserRoleAdminAction(userId: string, role: string) {
    console.log(`🛠️ [updateUserRoleAdminAction] Actualizando rol del sistema para: ${userId} a ${role}`);
    const admin = createAdminClient();

    try {
        const { error } = await admin
            .from('users')
            .update({ role })
            .eq('id', userId);

        if (error) throw error;
        
        return { success: true };
    } catch (error: any) {
        console.error('🔴 [updateUserRoleAdminAction] ERROR:', error.message);
        return { success: false, error: error.message };
    }
}

export async function resendInvitationAction(email: string) {
    console.log(`✉️ [resendInvitationAction] Reenviando invitación a: ${email}`);
    const admin = createAdminClient();

    try {
        if (!email) throw new Error('El correo electrónico es requerido');

        // Intentamos enviar un correo de recuperación de contraseña (que funciona como invitación para establecer password)
        // El '?e=' es obligatorio aunque no se use en la página: sin query string previo,
        // {{ .RedirectTo }} en el template de correo no tiene dónde "enganchar" el &token_hash=
        // y el link queda mal formado (cae en la ruta de QR /[id] en vez de /reset-password).
        const { error } = await admin.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?e=${encodeURIComponent(email.trim())}`,
        });

        if (error) {
            console.error('🔴 [resendInvitationAction] Error al enviar reset password:', error.message);
            throw new Error('No se pudo enviar el correo de invitación. Verifica que el residente tenga una cuenta de acceso creada.');
        }
        
        return { success: true };
    } catch (error: any) {
        console.error('🔴 [resendInvitationAction] ERROR:', error.message);
        return { success: false, error: error.message };
    }
}
