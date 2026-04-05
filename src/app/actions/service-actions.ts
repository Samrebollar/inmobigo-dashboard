'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

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
    status: 'received' | 'closed',
    adminUserId: string
}) {
    const { id, status, adminUserId } = params
    if (!id || !status) return { success: false, error: 'Parámetros incompletos' }

    try {
        const adminClient = createAdminClient()
        
        const updateData: any = { 
            status: status
        }
        
        // Remove handled_by and received_at until DB columns are confirmed
        // updateData.handled_by = adminUserId
        // if (status === 'received') {
        //     updateData.received_at = new Date().toISOString()
        // }

        const { error } = await adminClient
            .from('package_alerts')
            .update(updateData)
            .eq('id', id)

        if (error) throw error

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

    try {
        const adminClient = createAdminClient()
        
        const { error } = await adminClient
            .from('package_alerts')
            .insert({
                ...data,
                created_at: new Date().toISOString()
            })

        if (error) throw error

        revalidatePath('/dashboard/avisos')
        revalidatePath('/dashboard/servicios')

        return { success: true }
    } catch (error: any) {
        console.error('Error in createPackageAlertAction:', error)
        return { success: false, error: error.message || 'Error al crear el aviso' }
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

        revalidatePath('/dashboard/configuracion')
        
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
 */
export async function getAmenitiesAction(organizationId: string) {
    if (!organizationId) return { success: false, error: 'ID de organización no proporcionado' }

    try {
        const adminClient = createAdminClient()
        
        // 1. Limpieza de "Salon de Eventos" (el registro huérfano/duplicado que el usuario quiere borrar)
        // Lo borramos proactivamente para que no aparezca más.
        await adminClient
            .from('amenities')
            .delete()
            .eq('organization_id', organizationId)
            .ilike('name', 'Salon de Eventos')

        // 2. Intentar obtener las existentes
        let { data, error } = await adminClient
            .from('amenities')
            .select('*')
            .eq('organization_id', organizationId)
            .order('name')

        if (error) throw error

        // 3. Si está vacío, sembrar por defecto desde el servidor (más fiable)
        if (!data || data.length === 0) {
            const defaultAmenities = [
                { name: 'Alberca', icon_name: 'Waves', description: 'Alberca templada con vista al jardín.', capacity: 20, price: 0, deposit: 0, status: 'available', schedule_start: '09:00', schedule_end: '22:00', organization_id: organizationId },
                { name: 'Área de Asadores', icon_name: 'Flame', description: 'Espacio parrillero totalmente equipado.', capacity: 12, price: 0, deposit: 500, status: 'available', schedule_start: '09:00', schedule_end: '22:00', organization_id: organizationId },
                { name: 'Gimnasio Pro', icon_name: 'Dumbbell', description: 'Equipamiento de alto rendimiento.', capacity: 15, price: 0, deposit: 500, status: 'available', schedule_start: '08:00', schedule_end: '22:00', organization_id: organizationId },
                { name: 'Salón de Fiestas', icon_name: 'Music', description: 'Salón premium para eventos sociales.', capacity: 50, price: 0, deposit: 500, status: 'available', schedule_start: '08:00', schedule_end: '22:00', organization_id: organizationId }
            ]

            const { data: seeded, error: seedError } = await adminClient
                .from('amenities')
                .insert(defaultAmenities)
                .select()

            if (seedError) throw seedError
            data = seeded
        }

        return { success: true, data }
    } catch (error: any) {
        console.error('Error in getAmenitiesAction:', error)
        return { success: false, error: error.message || 'Error al obtener amenidades' }
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

        revalidatePath('/dashboard/configuracion')
        revalidatePath('/dashboard/amenidades')

        return { success: true }
    } catch (error: any) {
        console.error('Error in deleteAmenityAction:', error)
        return { success: false, error: error.message || 'Error al borrar amenidad' }
    }
}

/**
 * Crea una reserva de amenidad (Bypass RLS)
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

    try {
        const adminClient = createAdminClient()
        
        const { error } = await adminClient
            .from('amenity_reservations')
            .insert({
                amenity_id: data.amenity_id,
                resident_id: data.resident_id,
                organization_id: data.organization_id,
                reservation_date: data.reservation_date,
                status: data.status || 'pending'
            })

        if (error) {
            console.error('Supabase Error in createAmenityReservationAction:', error)
            
            // Error de duplicado (Unique Constraint)
            if (error.code === '23505') {
                return { success: false, error: 'Este horario ya ha sido reservado por otro residente. Por favor elige otra fecha.' }
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
