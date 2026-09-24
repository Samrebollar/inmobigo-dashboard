import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Busca la ficha de residente de un usuario autenticado, con el mismo
 * patrón de respaldo que ya usan las páginas web del residente
 * (residents.user_id primero, luego por email): de 125 residentes en
 * producción, 97 nunca tuvieron user_id asignado (se crearon desde el
 * panel del administrador antes de que el residente aceptara su invitación
 * y confirmara su cuenta), así que buscar solo por user_id los deja fuera.
 *
 * A diferencia de esas páginas, usa el admin client (evita cualquier duda
 * de RLS sobre filas que todavía no tienen user_id) y, cuando encuentra la
 * ficha por email, aprovecha para rellenar user_id — así la próxima
 * búsqueda (incluida cualquier consulta futura protegida por RLS) ya
 * encuentra la fila directo, sin volver a depender del respaldo por email.
 */
export async function findResidentForUser(user: { id: string; email?: string | null }) {
    const adminSupabase = createAdminClient()

    const { data: byUserId } = await adminSupabase
        .from('residents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    if (byUserId) return byUserId

    if (user.email) {
        const { data: byEmail } = await adminSupabase
            .from('residents')
            .select('*')
            .ilike('email', user.email)
            .is('user_id', null)
            .maybeSingle()

        if (byEmail) {
            await adminSupabase.from('residents').update({ user_id: user.id }).eq('id', byEmail.id)
            return { ...byEmail, user_id: user.id }
        }
    }

    return null
}
