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

/**
 * Crea un residente o inquilino desde el panel de administración.
 * Maneja la invitación por email, creación de usuario en auth y vinculación.
 */
export async function adminCreateResidentAction(payload: any) {
    const { 
        email, 
        first_name, 
        last_name, 
        phone, 
        condominium_id, 
        unit_id, 
        debt_amount, 
        status,
        vehicles,
        business_type 
    } = payload;
    
    const cleanEmail = email.trim().toLowerCase();
    
    // SOPORTE PARA MODO DEMO
    if (condominium_id?.startsWith('demo-')) {
        console.log('🧪 [adminCreateResidentAction] Modo DEMO detectado, simulando creación...');
        return { 
            success: true, 
            data: { 
                id: `demo-res-${Math.random().toString(36).substr(2, 9)}`,
                email: cleanEmail,
                first_name,
                last_name,
                phone,
                status: status || 'active',
                condominium_id,
                resident_type: business_type === 'propiedades' ? 'propiedades' : 'condominio',
                role: business_type === 'propiedades' ? 'tenant' : 'resident',
                is_registered: false,
                created_at: new Date().toISOString()
            } 
        };
    }

    const admin = createAdminClient();

    try {
        console.log(`🚀 [adminCreateResidentAction] Iniciando creación para: ${cleanEmail}`);
        
        // 0. Verificar duplicados en la tabla residents
        const { data: existingResident } = await admin
            .from('residents')
            .select('id')
            .eq('email', cleanEmail)
            .maybeSingle();
            
        if (existingResident) {
            return { 
                success: false, 
                error: `Ya existe un registro con el correo ${cleanEmail} en la base de datos de residentes.` 
            };
        }

        // 1. Verificar si el usuario ya existe en auth
        const { data: userData, error: searchError } = await admin.auth.admin.listUsers({
            perPage: 1000
        });
        
        if (searchError) {
            console.error('❌ Error listing users:', searchError);
            return { success: false, error: 'Error al verificar usuarios existentes.' };
        }
        
        let userId: string | null = null;
        const existingAuthUser = userData.users.find(u => u.email?.toLowerCase() === cleanEmail);
        
        if (existingAuthUser) {
            userId = existingAuthUser.id;
            console.log(`ℹ️ [adminCreateResidentAction] Usuario ya existe en Auth: ${userId}`);
        } else {
            // 2. Invitar al usuario por email para que configure su contraseña
            console.log(`👤 [adminCreateResidentAction] Invitando nuevo usuario: ${cleanEmail}`);
            
            const { data: authData, error: authError } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/acceso-residente`,
                data: {
                    first_name,
                    last_name,
                    full_name: `${first_name} ${last_name}`,
                    role: business_type === 'propiedades' ? 'tenant' : 'resident',
                    user_type: business_type === 'propiedades' ? 'tenant' : 'resident'
                }
            });
            
            if (authError) {
                console.error('❌ Error en inviteUserByEmail:', authError);
                return { success: false, error: `Error de Supabase Auth: ${authError.message}` };
            }
            
            userId = authData.user.id;
        }

        // 3. Determinar campos dinámicos según el tipo de negocio
        const resRole = business_type === 'propiedades' ? 'tenant' : 'resident';
        const resType = business_type === 'propiedades' ? 'propiedades' : 'condominio';

        // 4. Insertar en la tabla residents
        const { data: newResident, error: residentError } = await admin
            .from('residents')
            .insert({
                email: cleanEmail,
                first_name,
                last_name,
                phone,
                condominium_id,
                unit_id: unit_id || null,
                debt_amount: debt_amount || 0,
                status: status || 'active',
                user_id: userId,
                role: resRole,
                resident_type: resType,
                is_registered: false 
            })
            .select('id, email')
            .single();

        if (residentError) {
            console.error('❌ [adminCreateResidentAction] Error creando residente:', residentError);
            return { success: false, error: `Error de base de datos: ${residentError.message}` };
        }

        // 5. Insertar vehículos si existen
        if (vehicles && vehicles.length > 0) {
            const vehicleInserts = vehicles.map((v: any) => ({
                resident_id: newResident.id,
                plate: v.plate,
                brand: v.brand,
                color: v.color
            }));
            const { error: vehError } = await admin.from('vehicles').insert(vehicleInserts);
            if (vehError) console.error('⚠️ Error insertando vehículos:', vehError);
        }

        console.log(`✅ [adminCreateResidentAction] Todo completado con éxito para: ${cleanEmail}`);
        return { 
            success: true, 
            data: { id: newResident.id, email: newResident.email } 
        };

    } catch (err: any) {
        console.error('❌ [adminCreateResidentAction] Error crítico:', err);
        return { 
            success: false, 
            error: 'Ocurrió un fallo inesperado en el servidor durante la creación del residente.' 
        };
    }
}
