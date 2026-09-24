import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { findResidentForUser } from '@/services/mobile-resident-lookup'
import MobileDocumentosClient from '@/components/mobile/mobile-documentos-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobileDocumentosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const resident = await findResidentForUser(user)

    if (!resident) {
        redirect('/residente')
    }

    let reglamentoUrl: string | null = null
    if (resident.condominium_id) {
        const adminSupabase = createAdminClient()
        const { data: condo } = await adminSupabase
            .from('condominiums')
            .select('reglamento_url')
            .eq('id', resident.condominium_id)
            .maybeSingle()
        reglamentoUrl = condo?.reglamento_url || null
    }

    return <MobileDocumentosClient reglamentoUrl={reglamentoUrl} />
}
