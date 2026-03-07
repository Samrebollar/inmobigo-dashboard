'use client'
// Force refresh

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { PropertiesKPI } from '@/components/properties/PropertiesKPI'
import { PropertyCard } from '@/components/properties/PropertyCard'
import { CreatePropertyModal } from '@/components/properties/CreatePropertyModal'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { Plus, LayoutGrid, List, Building } from 'lucide-react'

import { useProperties } from '@/hooks/use-properties'
import { EditCondominiumModal } from '@/components/properties/EditCondominiumModal'
import { Condominium } from '@/types/properties'
import { useDemoMode } from '@/hooks/use-demo-mode'
import { demoDb } from '@/utils/demo-db'

export default function PropiedadesPage() {
  console.log('Mounting PropiedadesPage')
  const supabase = createClient()
  const { loading, properties, fetchProperties, deleteProperty, createProperty, updateProperty } = useProperties()
  const [orgId, setOrgId] = useState<string | null>(null)

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCondo, setEditingCondo] = useState<Condominium | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { checkAction, isDemo, loading: loadingDemo } = useDemoMode()

  useEffect(() => {
    checkUserAndFetch()
  }, [loadingDemo])

  const checkUserAndFetch = async () => {
    if (loadingDemo) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Try to get org from organization_users (RBAC table)
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (orgUser) {
        console.log('Org found via organization_users:', orgUser.organization_id)
        setOrgId(orgUser.organization_id)
        fetchProperties(orgUser.organization_id)
        return
      }
      console.log('No orgUser found in checkUserAndFetch')

      // 2. Fallback: Try to get org owned by user (Legacy/Initial table)
      const { data: ownedOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .single()

      if (ownedOrg) {
        console.log('Org found via owner_id fallback:', ownedOrg.id)
        setOrgId(ownedOrg.id)
        fetchProperties(ownedOrg.id)
      } else if (isDemo) {
        // En modo demo sin organización, proveemos una ficticia para que funcione la creación
        console.log('Modo Demo: Usando organización ficticia')
        setOrgId('demo-org-id')
      } else {
        console.error('No organization found for this user.')
      }
    } catch (err) {
      if (isDemo) {
        setOrgId('demo-org-id')
      }
      console.error('Error in checkUserAndFetch:', err)
    }
  }

  // Calculate KPIs
  const totalCondos = properties.length
  const totalUnits = properties.reduce((acc, curr) => acc + (curr.units_total || 0), 0)

  // En modo demo, obtenemos los totales reales de lo que se ha creado
  const demoResidentsCount = isDemo ? demoDb.getResidents().length : 0
  const demoUnitsCount = isDemo ? demoDb.getUnits().length : 0

  // Mock data for occupancy and residents since it requires joining resident table
  // Pero lo mejoramos para que si hay datos demo, los use
  const totalResidents = isDemo ? demoResidentsCount : Math.floor(totalUnits * 1.5)
  const occupancyRate = totalUnits > 0 ? Math.min(100, Math.round((totalResidents / totalUnits) * 100)) : 0

  const handleDelete = async (id: string, name: string) => {
    checkAction(async () => {
      if (!window.confirm(`¿Estás seguro de que deseas eliminar el condominio "${name}"? Esta acción no se puede deshacer y eliminará todas las unidades y residentes asociados.`)) {
        return
      }

      try {
        await deleteProperty(id)
      } catch (err: any) {
        alert(`Error al eliminar el condominio: ${err.message}`)
      }
    })
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl font-bold tracking-tight text-white">Propiedades</h1>
          <p className="text-zinc-400">Gestiona tus condominios activos y monitorea su rendimiento.</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={() => checkAction(() => setIsCreateOpen(true))} className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
            <Plus className="h-4 w-4" />
            Nuevo Condominio
          </Button>
        </motion.div>
      </div>

      {/* KPI Section */}
      <PropertiesKPI
        totalCondos={totalCondos}
        totalUnits={totalUnits}
        totalResidents={totalResidents}
        occupancyRate={occupancyRate}
      />

      {/* Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {properties.map((condo) => {
          const condoResidentsCount = isDemo ? demoDb.getResidents(condo.id).length : Math.floor(condo.units_total * 1.5)
          const condoOccupancyRate = condo.units_total > 0 ? Math.min(100, Math.round((condoResidentsCount / condo.units_total) * 100)) : 0

          return (
            <PropertyCard
              key={condo.id}
              id={condo.id}
              name={condo.name}
              city={condo.city || ''}
              type={condo.type}
              unitsCount={condo.units_total}
              residentsCount={condoResidentsCount}
              occupancyRate={condoOccupancyRate}
              status={condo.status}
              onEdit={() => checkAction(() => setEditingCondo(condo))}
              onDelete={(id) => handleDelete(id, condo.name)}
            />
          )
        })}

        {properties.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
            <div className="mx-auto h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 mb-4">
              <Building className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-medium text-white">No tienes condominios</h3>
            <p className="text-zinc-500 mt-1 max-w-sm mx-auto">Comienza creando tu primer condominio para administrar unidades y residentes.</p>
            <Button onClick={() => checkAction(() => setIsCreateOpen(true))} className="mt-4" variant="outline">
              Crear Condominio
            </Button>
          </div>
        )}
      </motion.div>

      <CreatePropertyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          if (!isDemo && orgId) {
            fetchProperties(orgId)
          }
        }}
        orgId={orgId}
        createProperty={createProperty}
      />

      {editingCondo && (
        <EditCondominiumModal
          isOpen={!!editingCondo}
          onClose={() => setEditingCondo(null)}
          onSuccess={() => {
            if (!isDemo && orgId) {
              fetchProperties(orgId)
            }
            setEditingCondo(null)
          }}
          condominium={editingCondo}
          updateProperty={updateProperty}
        />
      )}
    </div>
  )
}