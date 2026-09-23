import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MobileDocumentosClient from '@/components/mobile/mobile-documentos-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobileDocumentosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name, reglamento_url)')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!resident) {
        redirect('/residente')
    }

    return <MobileDocumentosClient reglamentoUrl={(resident.condominiums as any)?.reglamento_url || null} />
}
