'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useDemoMode } from '@/hooks/use-demo-mode'
import { demoDb } from '@/utils/demo-db'
import AdminFinanceClient from './admin-finance-client'
import { ResidentFinanceView } from '@/components/finance/resident-finance-view'
import { Loader2 } from 'lucide-react'

export default function FinancePage() {
  const supabase = createClient()
  const { isDemo, loading: demoLoading } = useDemoMode()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<{ isResident: boolean, isAdminOrStaff: boolean }>({ isResident: false, isAdminOrStaff: false })
  const [organization, setOrganization] = useState<any>(null)
  const [condominiumId, setCondominiumId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (isDemo) {
            setCondominiumId('demo-condo-1') // Fallback demo ID
            setOrganization({ id: 'demo-org-id' })
            setRole({ isResident: false, isAdminOrStaff: true })
          }
          setLoading(false)
          return
        }
        setUser(user)

        // Check Role
        const [resData, orgUserData] = await Promise.all([
          supabase.from('residents').select('id').eq('user_id', user.id).maybeSingle(),
          supabase.from('organization_users').select('role, organization:organizations(*)').eq('user_id', user.id).maybeSingle()
        ])

        const isResident = !!resData.data
        const isAdminOrStaff = !!orgUserData.data?.role
        setRole({ isResident, isAdminOrStaff })

        let org = orgUserData.data?.organization
        if (!org) {
          const { data: ownerOrg } = await supabase
            .from('organizations')
            .select(`*`)
            .eq('owner_id', user.id)
            .maybeSingle()
          org = ownerOrg
        }
        setOrganization(org)

        // Find Condominium
        if (org) {
          const { data: condos } = await supabase
            .from('condominiums')
            .select('id')
            .eq('organization_id', org?.id ?? '')
            .eq('status', 'active')
            .limit(1)

          if (condos && condos.length > 0) {
            setCondominiumId((condos as any)[0].id)
          }
        }

        // Demo Overrides
        if (isDemo && !condominiumId) {
          const demoCondos = demoDb.getProperties()
          if (demoCondos.length > 0) {
            setCondominiumId(demoCondos[0].id)
          } else {
            setCondominiumId('demo-condo-1')
          }
          if (!org) setOrganization({ id: 'demo-org-id' })
          setRole({ isResident: false, isAdminOrStaff: true })
        }

      } catch (err) {
        console.error('Error initializing FinancePage:', err)
      } finally {
        setLoading(false)
      }
    }

    if (!demoLoading) {
      init()
    }
  }, [demoLoading, isDemo])

  if (loading || demoLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (role.isResident && !role.isAdminOrStaff) {
    return <ResidentFinanceView />
  }

  if (!organization && !isDemo) return <div className="p-8 text-white">No se encontró organización activa.</div>

  if (!condominiumId) {
    return (
      <div className="p-8 text-white">
        <h2 className="text-xl font-bold mb-2">No hay condominios activos</h2>
        <p className="text-zinc-400">Para ver las finanzas, primero debes crear un condominio en la sección de Propiedades.</p>
      </div>
    )
  }

  return <AdminFinanceClient condominiumId={condominiumId} organizationId={organization?.id || 'demo-org-id'} />
}
