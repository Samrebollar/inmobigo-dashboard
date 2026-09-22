'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import type { DebtLineItem } from '@/types/residents'

const DEBT_CATEGORY_LABEL: Record<string, string> = {
    maintenance: 'Cuota de Mantenimiento',
    fine: 'Multa',
    special_assessment: 'Cuota Extraordinaria',
    water: 'Agua',
    electricity: 'Luz',
    other: 'Otro cargo',
}

const MESES_ES_LARGO = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/**
 * Crea una factura real (invoices) por cada línea de deuda previa capturada al
 * dar de alta a un residente, en vez de guardar un número suelto en
 * residents.debt_amount. Así cada concepto (mantenimiento de un mes puntual,
 * multa, cuota extraordinaria, agua, luz, otro) queda visible en Movimientos
 * y se clasifica solo como pendiente/vencida según su fecha — el mismo
 * mecanismo que ya usan las cuotas generadas por el cron mensual.
 */
async function createDebtLineInvoices(
    admin: ReturnType<typeof createAdminClient>,
    { residentId, condominiumId, unitId, items }: {
        residentId: string
        condominiumId: string
        unitId: string | null
        items: DebtLineItem[]
    }
) {
    const validItems = items.filter(i => Number(i.amount) > 0)
    if (validItems.length === 0) return { error: null }

    const { data: condo } = await admin
        .from('condominiums')
        .select('organization_id')
        .eq('id', condominiumId)
        .maybeSingle()
    const organizationId = condo?.organization_id || null

    let unitPaymentDeadline = 10
    if (unitId) {
        const { data: unit } = await admin
            .from('units')
            .select('payment_deadline')
            .eq('id', unitId)
            .maybeSingle()
        unitPaymentDeadline = Number(unit?.payment_deadline) || 10
    }

    const todayStr = new Date().toISOString().substring(0, 10)

    const rows = validItems.map((item) => {
        const folio = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        const categoryLabel = DEBT_CATEGORY_LABEL[item.category] || 'Otro cargo'

        if (item.category === 'maintenance' && item.month) {
            const [yearStr, monthStr] = item.month.split('-')
            const year = parseInt(yearStr, 10)
            const monthIndex = parseInt(monthStr, 10) - 1
            const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate()
            const billingDay = Math.min(unitPaymentDeadline, lastDayOfMonth)
            const mm = String(monthIndex + 1).padStart(2, '0')
            const dueDateStr = `${year}-${mm}-${String(billingDay).padStart(2, '0')}`
            const monthLabel = `${MESES_ES_LARGO[monthIndex]} ${year}`

            return {
                condominium_id: condominiumId,
                organization_id: organizationId,
                resident_id: residentId,
                unit_id: unitId,
                invoice_type: 'maintenance',
                invoice_scope: 'resident',
                status: 'pending',
                amount: item.amount,
                balance_due: item.amount,
                currency: 'MXN',
                due_date: dueDateStr,
                period_start: `${year}-${mm}-01`,
                period_end: `${year}-${mm}-${String(lastDayOfMonth).padStart(2, '0')}`,
                description: item.note ? `${categoryLabel} ${monthLabel} (saldo previo) - ${item.note}` : `${categoryLabel} ${monthLabel} (saldo previo)`,
                folio,
                reminder_sent: false,
                recargo_aplicado: false,
            }
        }

        return {
            condominium_id: condominiumId,
            organization_id: organizationId,
            resident_id: residentId,
            unit_id: unitId,
            invoice_type: item.category,
            invoice_scope: 'resident',
            status: 'pending',
            amount: item.amount,
            balance_due: item.amount,
            currency: 'MXN',
            due_date: todayStr,
            period_start: todayStr,
            period_end: todayStr,
            description: item.note ? `${categoryLabel} - ${item.note}` : `${categoryLabel} (saldo previo)`,
            folio,
            reminder_sent: false,
            recargo_aplicado: false,
        }
    })

    const { error } = await admin.from('invoices').insert(rows)
    return { error }
}

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
                role_name: 'Residente',
                role_description: 'Podrás reservar amenidades, ver tus estados de cuenta y reportar incidencias.',
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
        debt_items,
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
            .select('first_name, last_name, units(unit_number)')
            .eq('email', cleanEmail)
            .eq('condominium_id', condominium_id)
            .maybeSingle();
            
        if (existingResident) {
            const name = `${existingResident.first_name} ${existingResident.last_name}`;
            const unit = (existingResident as any).units?.unit_number || 'sin asignar';
            return { 
                success: false, 
                error: `Duplicado: El correo ${cleanEmail} ya está registrado para el residente ${name} en la unidad ${unit}.` 
            };
        }

        if (phone) {
            const { data: existingPhone } = await admin
                .from('residents')
                .select('first_name, last_name, units(unit_number)')
                .eq('condominium_id', condominium_id)
                .eq('phone', phone)
                .maybeSingle();

            if (existingPhone) {
                const name = `${existingPhone.first_name} ${existingPhone.last_name}`;
                const unit = (existingPhone as any).units?.unit_number || 'sin asignar';
                return {
                    success: false,
                    error: `Duplicado: El teléfono ${phone} ya está registrado para el residente ${name} en la unidad ${unit}.`
                };
            }
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
            // 2. Invitar al usuario (Paso Crítico)
            console.log(`👤 [adminCreateResidentAction] Invitando: ${cleanEmail}`);
            
            try {
                const { data: authData, error: authError } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
                    // Pasamos el email en la URL como salvavidas de identidad
                    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/activar-residente?e=${encodeURIComponent(cleanEmail)}`,
                    data: {
                        first_name,
                        last_name,
                        full_name: `${first_name} ${last_name}`,
                        phone,
                        role: 'resident',
                        role_name: 'Residente',
                        role_description: 'Podrás reservar amenidades, ver tus estados de cuenta y reportar incidencias.',
                        user_type: 'resident'
                    }
                });

                if (authError || !authData?.user) {
                    throw authError || new Error('No se generaron credenciales de usuario');
                }
                
                userId = authData.user.id;
                console.log(`✅ [adminCreateResidentAction] Usuario invitado con ID: ${userId}`);
            } catch (inviteError: any) {
                console.error('⚠️ Error al enviar invitación (Posible fallo SMTP/Límite):', inviteError.message);
                
                // FALLBACK: Si falla el envío del correo (ej. Custom SMTP mal configurado),
                // creamos el usuario silenciosamente para que no bloquee a la plataforma.
                console.log('🔄 Ejecutando FALLBACK: Creando usuario sin enviar correo inicial...');
                const { data: fallbackData, error: fallbackError } = await admin.auth.admin.createUser({
                    email: cleanEmail,
                    email_confirm: true,
                    password: Math.random().toString(36).slice(-12) + 'InmobiGo1!', // Contraseña temporal segura
                    user_metadata: {
                        first_name,
                        last_name,
                        full_name: `${first_name} ${last_name}`,
                        phone,
                        role: 'resident',
                        role_name: 'Residente',
                        role_description: 'Podrás reservar amenidades, ver tus estados de cuenta y reportar incidencias.',
                        user_type: 'resident'
                    }
                });

                if (fallbackError || !fallbackData?.user) {
                    console.error('❌ Error fatal en Fallback:', fallbackError);
                    return { success: false, error: 'Fallo al crear el usuario en Auth, incluso usando el método de respaldo.' };
                }

                userId = fallbackData.user.id;
                console.log(`✅ [adminCreateResidentAction] Usuario creado por Fallback con ID: ${userId}`);
            }
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

        // 6. Deuda previa desglosada (alta manual) — una factura real por línea
        // en vez de un número suelto en debt_amount, para que cada concepto
        // aparezca en Movimientos y se clasifique solo (pendiente/vencida)
        // según su fecha, igual que cualquier otro recibo.
        if (Array.isArray(debt_items) && debt_items.length > 0) {
            const { error: debtError } = await createDebtLineInvoices(admin, {
                residentId: newResident.id,
                condominiumId: condominium_id,
                unitId: unit_id || null,
                items: debt_items,
            });
            if (debtError) console.error('⚠️ Error creando facturas de deuda previa:', debtError);
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
