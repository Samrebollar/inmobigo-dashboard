import { createClient } from '@/utils/supabase/server'
import ResidentProfileClient from '@/components/settings/resident-profile-client'
import { resolveProfileData } from '@/services/profile-service'
import { getOrCreateAdminIdentity, ORG_OWNER_ROLES } from '@/services/admin-identity-service'
import { getUserSignature } from '@/lib/payment-receipts'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const data = await resolveProfileData(supabase, user)

    // Ficha pública del administrador (Empresa o Comité) y su código QR
    const adminIdentity = data.organizationId && ORG_OWNER_ROLES.includes(data.role)
        ? await getOrCreateAdminIdentity(data.organizationId, {
            display_name: data.organizationName,
            contact_phone: data.profile?.phone || null,
            contact_email: user.email || null,
        })
        : null

    // Firma para los recibos de pago: la registra todo el equipo que puede
    // registrar o validar pagos (seguridad no, su firma no vale en un recibo)
    const canSignReceipts = data.isAdmin && data.role !== 'security' && !!data.organizationId
    const signature = canSignReceipts ? await getUserSignature(createAdminClient(), user.id) : null

    return (
        <ResidentProfileClient
            user={user}
            initialResident={data.resident}
            profile={data.profile}
            role={data.role}
            isAdmin={data.isAdmin}
            subscription={data.subscription}
            organizationName={data.organizationName}
            adminContact={data.adminContact}
            accountStatus={data.accountStatus}
            adminIdentity={adminIdentity}
            canSignReceipts={canSignReceipts}
            signature={signature}
            financeHref={data.isAdmin ? '/dashboard/finance' : '/dashboard/payments'}
        />
    )
}
