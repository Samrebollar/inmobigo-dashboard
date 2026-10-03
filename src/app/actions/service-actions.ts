'use server'

import { ACTIVE_RESERVATION_STATUSES, BOOKING_WINDOW_DAYS, PAID_MIN_DAYS_AHEAD, addDaysIso, firstBookableDate, isExclusiveAmenity, operatesOn, todayMx } from '@/lib/amenity-booking'

import { createAdminClient } from '@/utils/supabase/admin'
import { cancelReservationCharges } from '@/lib/amenity-billing'
import { revalidatePath } from 'next/cache'
import { notifyResidentNotice } from './security-ops-actions'
import { createClient } from '@/utils/supabase/server'
import { getCallerResidentBlock } from '@/lib/resident-delinquency'

// Residente moroso: no puede usar Servicios ni Amenidades (el administrador sí
// puede registrar a su nombre)
async function delinquencyBlock(residentId?: string | null) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return getCallerResidentBlock(createAdminClient(), user?.id, residentId)
}

/**
 * Borra un pase de visitante (Bypass RLS)
 */
export async function deleteVisitorPassAction(passId: string) {
    if (!passId) return { success: false, error: 'ID de pase no proporcionado' }

    try {
        const adminClient = createAdminClient()
        
        const { error } = await adminClient
            .from('visitor_passes')
            .delete()
            .eq('id', passId)

        if (error) throw error

        revalidatePath('/dashboard/avisos')
        revalidatePath('/dashboard/servicios')

        return { success: true }
    } catch (error: any) {
        console.error('Error in deleteVisitorPassAction:', error)
        return { success: false, error: error.message || 'Error desconocido al borrar' }
    }
}

/**
 * Actualiza el estado de una alerta de paquetería (Bypass RLS)
 */
export async function updatePackageAlertStatusAction(params: {
    id: string,
    status: 'received' | 'closed' | 'rejected',
    adminUserId: string
}) {
    const { id, status, adminUserId } = params
    if (!id || !status) return { success: false, error: 'Parámetros incompletos' }

    try {
        const adminClient = createAdminClient()
        
        const updateData: any = {
            status: status,
            handled_by: adminUserId
        }

        // received_at es lo que el workflow de n8n "10b - Notificar Paquete
        // Recibido" usa para saber que hay que avisarle al residente por WhatsApp.
        if (status === 'received') {
            updateData.received_at = new Date().toISOString()
        }

        const { error } = await adminClient
            .from('package_alerts')
            .update(updateData)
            .eq('id', id)

        if (error) throw error

        // Dispara de inmediato el workflow de n8n "10b - Notificar Paquete Recibido"
        // en vez de esperar a su polling de cada 15 min (el nodo webhook solo
        // relanza la misma query que usa el trigger programado).
        if (status === 'received') {
            fetch('https://n8n.inmobigo.mx/webhook/paquete-recibido', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ package_alert_id: id }),
            }).catch((err) => console.error('Error al notificar n8n (paquete-recibido):', err))
        }

        revalidatePath('/dashboard/avisos')
        revalidatePath('/dashboard/servicios')

        return { success: true }
    } catch (error: any) {
        console.error('Error in updatePackageAlertStatusAction:', error)
        return { success: false, error: error.message || 'Error al actualizar estado' }
    }
}

/**
 * Borra definitivamente una alerta de paquetería (Bypass RLS)
 */
export async function deletePackageAlertAction(id: string) {
    if (!id) return { success: false, error: 'ID de alerta no proporcionado' }

    try {
        const adminClient = createAdminClient()
        
        const { error } = await adminClient
            .from('package_alerts')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/dashboard/avisos')
        revalidatePath('/dashboard/servicios')

        return { success: true }
    } catch (error: any) {
        console.error('Error in deletePackageAlertAction:', error)
        return { success: false, error: error.message || 'Error desconocido al borrar' }
    }
}
/**
 * Crea un aviso de paquetería (Bypass RLS)
 */
export async function createPackageAlertAction(data: any) {
    if (!data.organization_id || !data.resident_id) {
        return { success: false, error: 'Datos incompletos para crear el aviso' }
    }

    const blocked = await delinquencyBlock(data.resident_id)
    if (blocked) return { success: false, error: blocked }

    try {
        const adminClient = createAdminClient()
        
        const { data: inserted, error } = await adminClient
            .from('package_alerts')
            .insert({
                ...data,
                created_at: new Date().toISOString()
            })
            .select('id')
            .single()

        if (error) throw error

        // Aviso por WhatsApp a seguridad y administración
        await notifyResidentNotice('package', inserted.id)

        revalidatePath('/dashboard/avisos')
        revalidatePath('/dashboard/servicios')

        return { success: true }
    } catch (error: any) {
        console.error('Error in createPackageAlertAction:', error)
        return { success: false, error: error.message || 'Error al crear el aviso' }
    }
}

/**
 * Crea un aviso de transporte (Uber/DiDi/taxi) — recogida o llegada de un
 * residente. Separado de package_alerts a propósito: un auto que va a
 * recoger o dejar a alguien no es un paquete, y mezclarlos confundía a
 * seguridad sobre si debía abrir la reja o solo recibir algo en la puerta.
 */
export async function createTransportNoticeAction(data: any) {
    if (!data.organization_id || !data.resident_id || !data.direction || !data.platform) {
        return { success: false, error: 'Datos incompletos para crear el aviso' }
    }

    const blocked = await delinquencyBlock(data.resident_id)
    if (blocked) return { success: false, error: blocked }

    try {
        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('transport_notices')
            .insert({
                ...data,
                created_at: new Date().toISOString()
            })

        if (error) throw error

        revalidatePath('/dashboard/servicios')
        revalidatePath('/dashboard/seguridad-operativa')
        revalidatePath('/seguridad')

        return { success: true }
    } catch (error: any) {
        console.error('Error in createTransportNoticeAction:', error)
        return { success: false, error: error.message || 'Error al crear el aviso' }
    }
}

const TRANSPORT_DECISION_WEBHOOK_URL = 'https://n8n.inmobigo.mx/webhook/transporte-decision'

async function notifyTransportDecision(noticeId: string) {
    try {
        await fetch(TRANSPORT_DECISION_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notice_id: noticeId }),
        })
    } catch (err) {
        console.error('[notifyTransportDecision] Error notificando decision de transporte:', err)
    }
}

/**
 * Actualiza el estado de un aviso de transporte (Bypass RLS)
 */
export async function updateTransportNoticeStatusAction(params: {
    id: string
    status: 'received' | 'closed' | 'rejected'
    guardName?: string
    checkpoint?: string
    handledBy?: string
}) {
    const { id, status, guardName, checkpoint, handledBy } = params
    if (!id || !status) return { success: false, error: 'Parámetros incompletos' }

    try {
        const adminClient = createAdminClient()

        const updateData: any = {
            status,
            handled_by: handledBy || null,
            guard_name: guardName || undefined,
            checkpoint: checkpoint || undefined,
        }
        if (status === 'received' || status === 'closed') {
            updateData.handled_at = new Date().toISOString()
        }

        const { error } = await adminClient
            .from('transport_notices')
            .update(updateData)
            .eq('id', id)

        if (error) throw error

        revalidatePath('/dashboard/servicios')
        revalidatePath('/dashboard/seguridad-operativa')
        revalidatePath('/seguridad')

        if (status === 'received' || status === 'rejected') {
            await notifyTransportDecision(id)
        }

        return { success: true }
    } catch (error: any) {
        console.error('Error in updateTransportNoticeStatusAction:', error)
        return { success: false, error: error.message || 'Error al actualizar estado' }
    }
}

/**
 * Crea o actualiza una amenidad (Bypass RLS)
 */
export async function saveAmenityAction(amenityData: any) {
    if (!amenityData.organization_id || !amenityData.name) {
        return { success: false, error: 'Datos incompletos: Nombre y Organización son requeridos.' }
    }

    try {
        const adminClient = createAdminClient()
        
        // Determinar si es insert o update
        const isUpdate = !!amenityData.id
        
        const { data, error } = await adminClient
            .from('amenities')
            .upsert(amenityData)
            .select()
            .single()

        if (error) {
            console.error('Supabase Error in saveAmenityAction:', error)
            throw error
        }

        revalidatePath('/dashboard/propiedades', 'layout')

        return { success: true, data }
    } catch (error: any) {
        console.error('Error in saveAmenityAction:', error)
        return { 
            success: false, 
            error: error.message || 'Error desconocido al guardar amenidad',
            details: error.details,
            hint: error.hint
        }
    }
}

/**
 * Obtiene todas las amenidades de una organización (Bypass RLS)
 * Si la organización no tiene amenidades, las crea automáticamente (Seed)
 *
 * Si se proporciona condominiumId, además de las amenidades globales de la
 * organización (condominium_id NULL, catálogo histórico) incluye las
 * amenidades propias de ESE condominio.
 */
export async function getAmenitiesAction(organizationId: string, condominiumId?: string) {
    if (!organizationId) return { success: false, error: 'ID de organización no proporcionado' }

    try {
        const adminClient = createAdminClient()

        // 1. Intentar obtener las existentes
        let query = adminClient
            .from('amenities')
            .select('*')
            .eq('organization_id', organizationId)

        if (condominiumId) {
            query = query.or(`condominium_id.is.null,condominium_id.eq.${condominiumId}`)
        }

        let { data, error } = await query.order('name')

        if (error) throw error

        // No se siembra un catálogo por defecto: si el condominio/organización
        // todavía no configuró amenidades, se devuelve vacío tal cual — antes
        // se insertaban 4 amenidades inventadas (con precio/depósito falsos)
        // directo en la tabla real apenas un residente entraba a la pantalla,
        // así que un admin que nunca había configurado nada veía "Ningún
        // Espacio Registrado" en Propiedades > Amenidades mientras el
        // residente sí veía 4 espacios reservables que no existían.
        return { success: true, data: data || [] }
    } catch (error: any) {
        console.error('Error in getAmenitiesAction:', error)
        return { success: false, error: error.message || 'Error al obtener amenidades' }
    }
}

/**
 * Obtiene las amenidades propias de UN condominio/propiedad (Bypass RLS)
 * Usado por Propiedades → Configuración, donde cada propiedad administra
 * sus propios espacios según su operación.
 */
export async function getAmenitiesByCondominiumAction(condominiumId: string, organizationId: string) {
    if (!condominiumId) return { success: false, error: 'ID de condominio no proporcionado' }

    try {
        const adminClient = createAdminClient()

        let { data, error } = await adminClient
            .from('amenities')
            .select('*')
            .eq('condominium_id', condominiumId)
            .order('name')

        if (error) throw error

        // No se siembra un catálogo por defecto — ver comentario equivalente
        // en getAmenitiesAction.
        return { success: true, data: data || [] }
    } catch (error: any) {
        console.error('Error in getAmenitiesByCondominiumAction:', error)
        return { success: false, error: error.message || 'Error al obtener amenidades del condominio' }
    }
}

/**
 * Borra una amenidad (Bypass RLS)
 */
export async function deleteAmenityAction(id: string) {
    if (!id) return { success: false, error: 'ID de amenidad no proporcionado' }

    try {
        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('amenities')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/dashboard/propiedades', 'layout')
        revalidatePath('/dashboard/amenidades')

        return { success: true }
    } catch (error: any) {
        console.error('Error in deleteAmenityAction:', error)
        return { success: false, error: error.message || 'Error al borrar amenidad' }
    }
}

/**
 * Fechas ocupadas de una amenidad de uso exclusivo (reservas pendientes o
 * aprobadas) dentro de la ventana de reserva, y la reserva activa del propio
 * usuario en esa amenidad (solo se permite una a la vez).
 */
export async function getAmenityAvailabilityAction(amenityId: string): Promise<
    { success: true; occupied: string[]; myActiveDate: string | null } | { success: false; error: string }
> {
    if (!amenityId) return { success: false, error: 'Amenidad no especificada' }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const admin = createAdminClient()
    const { data: amenity } = await admin.from('amenities').select('id, booking_mode').eq('id', amenityId).maybeSingle()
    if (!amenity) return { success: false, error: 'Amenidad no encontrada' }

    const today = todayMx()
    const { data: reservations } = await admin
        .from('amenity_reservations')
        .select('reservation_date, resident_id')
        .eq('amenity_id', amenityId)
        .in('status', ACTIVE_RESERVATION_STATUSES)
        .gte('reservation_date', today)
        .order('reservation_date', { ascending: true })

    const mine = (reservations || []).find((r: any) => r.resident_id === user.id)
    return {
        success: true,
        occupied: isExclusiveAmenity(amenity) ? Array.from(new Set((reservations || []).map((r: any) => r.reservation_date))) : [],
        myActiveDate: mine?.reservation_date || null,
    }
}

/**
 * Crea una reserva de amenidad (Bypass RLS). Reglas: la fecha debe estar
 * dentro de los próximos BOOKING_WINDOW_DAYS días y en un día en que la
 * amenidad opere; 1 reserva activa por residente por amenidad; y una amenidad
 * de uso exclusivo no se puede apartar dos veces el mismo día (también lo
 * garantiza un trigger en la base de datos).
 */
export async function createAmenityReservationAction(data: {
    amenity_id: string,
    resident_id: string,
    organization_id: string,
    reservation_date: string,
    status?: string
}) {
    if (!data.amenity_id || !data.resident_id || !data.organization_id || !data.reservation_date) {
        return { success: false, error: 'Datos incompletos para procesar la reserva' }
    }

    const blocked = await delinquencyBlock(data.resident_id)
    if (blocked) return { success: false, error: blocked }

    try {
        const adminClient = createAdminClient()

        const { data: amenity } = await adminClient
            .from('amenities')
            .select('id, name, booking_mode, use_days, status, base_price, deposit_required, deposit_amount')
            .eq('id', data.amenity_id)
            .maybeSingle()
        if (!amenity) return { success: false, error: 'La amenidad ya no está disponible.' }

        const date = data.reservation_date
        const today = todayMx()
        if (date < today) return { success: false, error: 'No puedes reservar en una fecha pasada.' }
        if (date < firstBookableDate(amenity)) {
            return { success: false, error: `${amenity.name} tiene costo: resérvala con al menos ${PAID_MIN_DAYS_AHEAD} días de anticipación para pagar 48 horas antes.` }
        }
        if (date > addDaysIso(today, BOOKING_WINDOW_DAYS)) {
            return { success: false, error: `Solo puedes reservar con hasta ${BOOKING_WINDOW_DAYS} días de anticipación.` }
        }
        if (!operatesOn(amenity, date)) return { success: false, error: `${amenity.name} no abre ese día. Elige otra fecha.` }

        const { data: active } = await adminClient
            .from('amenity_reservations')
            .select('reservation_date, amenity_id')
            .eq('resident_id', data.resident_id)
            .in('status', ACTIVE_RESERVATION_STATUSES)
            .gte('reservation_date', today)
        if ((active || []).some((r: any) => r.amenity_id === data.amenity_id)) {
            return { success: false, error: `Ya tienes una reserva activa de ${amenity.name}. Podrás apartar otra cuando pase o la canceles.` }
        }

        if (isExclusiveAmenity(amenity)) {
            const { data: taken } = await adminClient
                .from('amenity_reservations')
                .select('id')
                .eq('amenity_id', data.amenity_id)
                .eq('reservation_date', date)
                .in('status', ACTIVE_RESERVATION_STATUSES)
                .limit(1)
            if (taken && taken.length > 0) return { success: false, error: 'Esta fecha ya está ocupada. Por favor elige otra.' }
        }

        const { error } = await adminClient
            .from('amenity_reservations')
            .insert({
                amenity_id: data.amenity_id,
                resident_id: data.resident_id,
                organization_id: data.organization_id,
                reservation_date: date,
                status: data.status || 'pending'
            })

        if (error) {
            console.error('Supabase Error in createAmenityReservationAction:', error)
            // Otro residente apartó la fecha al mismo tiempo (trigger de empalmes)
            if (error.code === '23505') {
                return { success: false, error: 'Esta fecha ya está ocupada. Por favor elige otra.' }
            }
            throw error
        }

        revalidatePath('/dashboard/amenidades')
        revalidatePath('/dashboard/avisos')

        return { success: true }
    } catch (error: any) {
        console.error('Error detail in createAmenityReservationAction:', error)
        return { 
            success: false, 
            error: error.message || 'Error al procesar la reserva en el servidor',
            details: error.details 
        }
    }
}

/**
 * Borra una reserva de amenidad (Bypass RLS)
 */
export async function deleteAmenityReservationAction(reservationId: string) {
    if (!reservationId) return { success: false, error: 'ID de reserva no proporcionado' }

    try {
        const adminClient = createAdminClient()

        // Una reserva con depósito pagado no se borra hasta liquidarlo; los
        // cargos sin pagar se cancelan antes de borrarla
        const { data: reservation } = await adminClient
            .from('amenity_reservations')
            .select('deposit_status, paid_at, status, reservation_date')
            .eq('id', reservationId)
            .maybeSingle()
        if (reservation?.deposit_status === 'en_resguardo') {
            return { success: false, error: 'Esta reserva tiene un depósito en garantía pendiente de liquidar.' }
        }
        if (reservation?.paid_at && reservation.status === 'approved' && reservation.reservation_date >= todayMx()) {
            return { success: false, error: 'Esta reserva ya está pagada; no se puede borrar antes del evento.' }
        }
        await cancelReservationCharges(adminClient, reservationId)
        
        const { error } = await adminClient
            .from('amenity_reservations')
            .delete()
            .eq('id', reservationId)

        if (error) throw error

        revalidatePath('/dashboard/amenidades/reservas')
        revalidatePath('/dashboard/avisos')

        return { success: true }
    } catch (error: any) {
        console.error('Error in deleteAmenityReservationAction:', error)
        return { success: false, error: error.message || 'Error al borrar la reserva' }
    }
}

/**
 * Crea un pase de visitante (Bypass RLS)
 */
export async function createVisitorPassAction(data: any) {
    if (!data.organization_id || !data.visitor_name) {
        return { success: false, error: 'Datos incompletos para crear el pase' }
    }

    const blocked = await delinquencyBlock(data.resident_id)
    if (blocked) return { success: false, error: blocked }

    try {
        const adminClient = createAdminClient()
        
        const { data: newPass, error } = await adminClient
            .from('visitor_passes')
            .insert({
                ...data,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/dashboard/avisos')
        revalidatePath('/dashboard/servicios')
        revalidatePath('/seguridad')

        return { success: true, data: newPass }
    } catch (error: any) {
        console.error('Error in createVisitorPassAction:', error)
        return { success: false, error: error.message || 'Error al crear el pase' }
    }
}

/**
 * Obtiene datos iniciales para el dashboard de seguridad (Bypass RLS)
 */
export async function getSecurityInitialDataAction(organizationId: string) {
    if (!organizationId) return { success: false, error: 'ID de organización requerido' }

    try {
        const adminClient = createAdminClient()
        
        // 1. Mapa de Unidades -> Condominios
        const { data: units } = await adminClient
            .from('units')
            .select('id, condominium_id')
            .eq('organization_id', organizationId)
        
        const unitMap: Record<string, string> = {}
        if (units) {
            units.forEach(u => {
                if (u.condominium_id) unitMap[u.id] = u.condominium_id
            })
        }

        // 2. Visitas
        const { data: passes } = await adminClient
            .from('visitor_passes')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })

        // 3. Paquetes
        const { data: packages } = await adminClient
            .from('package_alerts')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })

        // 4. Incidencias
        const { data: incidents } = await adminClient
            .from('tickets')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('category', 'security')
            .order('created_at', { ascending: false })

        return { 
            success: true, 
            data: {
                unitMap,
                passes: passes || [],
                packages: packages || [],
                incidents: incidents || []
            }
        }
    } catch (error: any) {
        console.error('Error in getSecurityInitialDataAction:', error)
        return { success: false, error: error.message }
    }
}
