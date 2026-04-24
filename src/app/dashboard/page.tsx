import { redirect } from 'next/navigation'
import { getUserContext } from '@/utils/user-context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
    const { user, businessType } = await getUserContext()

    if (!user) {
        redirect('/login')
    }

    // Redirección inteligente basada en el business_type
    if (businessType === 'propiedades') {
        redirect('/dashboard/inicio-propiedades')
    } else {
        redirect('/dashboard/inicio-condominio')
    }
}
