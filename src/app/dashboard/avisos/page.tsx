import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AvisosClient } from '@/components/dashboard/avisos-client'

export const dynamic = 'force-dynamic'

export default async function AvisosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
      <AvisosClient />
    </div>
  )
}
