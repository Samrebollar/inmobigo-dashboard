'use server'

import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Verifica si un correo está pre-aprobado para registrarse como residente.
 * Se ejecuta en el servidor para poder usar el Admin Client y bypassar RLS.
 */
export async function checkResidentPreApprovalAction(email: string) {
    if (!email) return { exists: false, registered: false };

    const supabase = createAdminClient();
    
    try {
        console.log(`🔍 [checkResidentPreApprovalAction] Buscando en DB con ilike: '${email.trim()}'`);
        
        const { data, error } = await supabase
            .from('residents')
            .select('id, is_registered, email')
            .ilike('email', email.trim())
            .maybeSingle();
            
        if (error) {
            console.error('❌ [checkResidentPreApprovalAction] Error Supabase:', error);
            return { exists: false, registered: false };
        }
        
        if (data) {
            console.log(`✅ [checkResidentPreApprovalAction] Residente encontrado: ID ${data.id}, Registrado: ${data.is_registered}`);
        } else {
            console.log(`⚠️ [checkResidentPreApprovalAction] No se encontró residente para el correo proporcionado.`);
        }
        
        return {
            exists: !!data,
            registered: data?.is_registered || false
        };
    } catch (err: any) {
        console.error('❌ [checkResidentPreApprovalAction] Excepción:', err);
        return { exists: false, registered: false };
    }
}

/**
 * Registra a un residente vinculándolo con su ficha pre-aprobada.
 */
export async function registerResidentAction(formData: any) {
    const { email, password, firstName, lastName, phone } = formData;
    const cleanEmail = email.trim().toLowerCase();
    const admin = createAdminClient();

    try {
        // 0. VALIDAR CAMPOS REQUERIDOS
        if (!email || !password || !firstName) {
            throw new Error('Faltan campos obligatorios para el registro (Email, Password, Nombre).');
        }

        console.log(`🚀 [registerResidentAction] Iniciando registro para: ${cleanEmail}`);
        
        // 🔍 LOGGING DE PAYLOAD (CON SEGURIDAD)
        console.log('📦 [registerResidentAction] Payload para Auth:', {
            email: cleanEmail,
            firstName,
            lastName,
            phone,
            role: 'resident'
        });

        // 1. Verificar Pre-aprobación y obtener datos base
        const { data: resident, error: findError } = await admin
            .from('residents')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();

        if (findError) throw findError;
        if (!resident) {
            return { success: false, error: 'No estás registrado como residente en nuestra base de datos. Por favor, contacta a la administración.' };
        }

        if (resident.is_registered) {
            return { success: false, error: 'Este correo ya tiene una cuenta activa. Por favor, inicia sesión.' };
        }

        // 🔍 EXTRACCIÓN DE METADATOS CLAVE
        const orgId = resident.organization_id || resident.condominium_id;

        // 2. REGISTRATION FLOW (Auth and Linking)
        // El trigger 'on_auth_user_created' en la base de datos se encargará de:
        // - Crear el perfil en 'public.profiles'
        // - Vincular al residente en 'public.residents' (user_id, is_registered=true)
        // - Verificar pre-aprobación del correo

        // 3. Crear usuario en Supabase Auth
        // Usamos admin para saltarnos la confirmación de email y asegurar la creación
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
            email: cleanEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`,
                phone: phone,
                role: 'resident',
                user_type: 'resident',
                organization_id: orgId
            }
        });

        if (authError) {
            throw authError; // El catch lo serializará
        }

        const userId = authData.user.id;

        // 4. VERIFICAR VINCULACIÓN FINAL
        // Aunque el trigger debería haberlo hecho, aseguramos la integridad 
        // por si hubo algún retraso o race condition leve.
        const { error: linkError } = await admin
            .from('residents')
            .update({ 
                user_id: userId, 
                is_registered: true,
                status: 'active'
            })
            .eq('id', resident.id);

        if (linkError) {
            console.error('⚠️ [registerResidentAction] Error verificando vinculación:', linkError);
            // No bloqueamos aquí porque el usuario de auth ya existe.
        }

        console.log(`✅ [registerResidentAction] Registro exitoso para ${cleanEmail}`);
        return { success: true, userId };

    } catch (err: any) {
        console.error('❌ [registerResidentAction] Error crítico:', err);
        
        // Serialización del error para que el cliente no reciba un {} vacío
        const serializedError = {
            message: err.message || 'Error interno durante el registro.',
            code: err.code || 'unexpected_failure',
            status: err.status || 500,
            hint: err.hint,
            details: err.details
        };

        return { 
            success: false, 
            error: {
                message: err.message || 'Error interno durante el registro.',
                code: err.code || 'UNKNOWN',
                status: err.status || 500,
                details: err.details || null,
                hint: err.hint || null
            }
        };
    }
}
