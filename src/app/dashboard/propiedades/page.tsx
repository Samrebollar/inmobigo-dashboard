'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { PropertiesKPI } from '@/components/properties/PropertiesKPI'
import { PropertyCard } from '@/components/properties/PropertyCard'
import { CreatePropertyModal } from '@/components/properties/CreatePropertyModal'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { Plus, LayoutGrid, List, Building } from 'lucide-react'
import { DeletePropertyModal } from '@/components/properties/DeletePropertyModal'

import { useProperties } from '@/hooks/use-properties'
import { EditCondominiumModal } from '@/components/properties/EditCondominiumModal'
import { Condominium } from '@/types/properties'
import { useDemoMode } from '@/hooks/use-demo-mode'
import { useUserRole } from '@/hooks/use-user-role'
import { demoDb } from '@/utils/demo-db'

export default function PropiedadesPage() {
  const supabase = createClient()
  const { loading, properties, fetchProperties, deleteProperty, createProperty, updateProperty } = useProperties()
  const [orgId, setOrgId] = useState<string | null>(null)

  // Estado para las unidades traídas por RPC
  const [rpcTotalUnits, setRpcTotalUnits] = useState<number>(0)
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(true)

  // Estado para los residentes traídos por RPC
  const [rpcTotalResidents, setRpcTotalResidents] = useState<number>(0)
  const [isLoadingResidents, setIsLoadingResidents] = useState<boolean>(true)

  // Estado para los residentes morosos
  const [rpcTotalDelinquent, setRpcTotalDelinquent] = useState<number>(0)
  const [isLoadingDelinquent, setIsLoadingDelinquent] = useState<boolean>(true)

  // Estado para unidades ocupadas / limite
  const [rpcOccupiedUnits, setRpcOccupiedUnits] = useState<number>(0)
  const [isLoadingOccupied, setIsLoadingOccupied] = useState<boolean>(true)
  const [unitsLimit, setUnitsLimit] = useState<number>(0)

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCondo, setEditingCondo] = useState<Condominium | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; propertyId: string; propertyName: string }>({
    isOpen: false,
    propertyId: '',
    propertyName: ''
  })
  const { checkAction, isDemo, loading: loadingDemo } = useDemoMode()
  const { isPropiedades } = useUserRole()

  useEffect(() => {
    checkUserAndFetch()
  }, [loadingDemo])

  const checkUserAndFetch = async () => {
    if (loadingDemo) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoadingUnits(false)
        return
      }

      // 0. Fetch Total Units and Residents via RPC
      if (!isDemo) {
        setIsLoadingUnits(true)
        setIsLoadingResidents(true)
        setIsLoadingDelinquent(true)
        setIsLoadingOccupied(true)

        // Fetch Units
        // La función SQL no requiere parámetros porque usa auth.uid() directamente por seguridad
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_total_units')
        
        if (rpcError) {
          console.error('Error fetching RPC get_total_units:', rpcError)
          setRpcTotalUnits(0)
        } else {
          // rpcData retorna un array de objetos, ej: [{ total_unidades: 5 }]
          const unitsValue = rpcData && rpcData.length > 0 ? rpcData[0].total_unidades : 0
          setRpcTotalUnits(Number(unitsValue) || 0)
        }
        setIsLoadingUnits(false)

        // Fetch Residents
        const { data: rpcResData, error: rpcResError } = await supabase.rpc('get_total_residents')
        
        if (rpcResError) {
          console.error('Error fetching RPC get_total_residents:', rpcResError)
          setRpcTotalResidents(0)
        } else {
          // rpcResData retorna un array de objetos, ej: [{ total_residentes: 10 }]
          const resValue = rpcResData && rpcResData.length > 0 ? rpcResData[0].total_residentes : 0
          setRpcTotalResidents(Number(resValue) || 0)
        }
        setIsLoadingResidents(false)

        // Fetch Delinquent Residents
        const { data: rpcDelqData, error: rpcDelqError } = await supabase.rpc('get_total_delinquent_residents')
        
        if (rpcDelqError) {
          console.error('Error fetching RPC get_total_delinquent_residents:', rpcDelqError)
          setRpcTotalDelinquent(0)
        } else {
          const delqValue = rpcDelqData && rpcDelqData.length > 0 ? rpcDelqData[0].total_morosos : 0
          setRpcTotalDelinquent(Number(delqValue) || 0)
        }
        setIsLoadingDelinquent(false)

        // Fetch Occupied Units
        const { data: rpcOccData, error: rpcOccError } = await supabase.rpc('get_total_occupied_units')
        if (rpcOccError) {
          console.error('Error fetching RPC get_total_occupied_units:', rpcOccError)
          setRpcOccupiedUnits(0)
        } else {
          const occValue = rpcOccData && rpcOccData.length > 0 ? rpcOccData[0].total_ocupadas : 0
          setRpcOccupiedUnits(Number(occValue) || 0)
        }
        setIsLoadingOccupied(false)

      } else {
        setIsLoadingUnits(false)
        setIsLoadingResidents(false)
        setIsLoadingDelinquent(false)
        setIsLoadingOccupied(false)
      }

      // Determinar orgId para cargar propiedades y limites
      let currentOrgId = null;

      // 1. Try to get org from organization_users (RBAC table)
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (orgUser) {
        currentOrgId = orgUser.organization_id;
      } else {
        // 2. Fallback: Try to get org owned by user (Legacy/Initial table)
        const { data: ownedOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .single()

        if (ownedOrg) {
          currentOrgId = ownedOrg.id;
        }
      }

      if (currentOrgId) {
        setOrgId(currentOrgId)
        fetchProperties(currentOrgId)
        
        // Fetch units limit del plan de la organización
        const { data: orgData } = await supabase
          .from('organizations')
          .select('units_limit, plan')
          .eq('id', currentOrgId)
          .single()
          
        const PLAN_LIMITS: Record<string, number> = {
            'CORE': 20,
            'PLUS': 60,
            'ELITE': 120,
            'CORPORATE': 250,
            'CORE PRUEBA': 5,
            'CORPORATE PLUS': 1000,
            'FREE': 5
        }

        const dbLimit = orgData?.units_limit || 0;
        const rawPlanName = orgData?.plan ? orgData.plan.trim().toUpperCase() : 'FREE';
        const mappedLimit = PLAN_LIMITS[rawPlanName] || 5; 
        
        console.log("Org Límite SQL:", dbLimit, " | Org Plan SQL:", rawPlanName, " | Mapped:", mappedLimit);

        const resolvedLimit = dbLimit > 0 ? dbLimit : mappedLimit;

        setUnitsLimit(resolvedLimit)
      } else if (isDemo) {
        setOrgId('demo-org-id')
        setUnitsLimit(5) // Demo fallback limit
      } else {
        console.error('No organization found for this user.')
      }
    } catch (err) {
      if (isDemo) {
        setOrgId('demo-org-id')
        setUnitsLimit(5)
      }
      console.error('Error in checkUserAndFetch:', err)
      setIsLoadingUnits(false)
    }
  }

  // Calculate KPIs
  const totalCondos = properties.length
  
  // Calcular total de unidades basado en modo Demo o RPC real
  const computedDemoUnits = properties.reduce((acc, curr) => acc + (curr.units_total || 0), 0)
  const totalUnits = isDemo ? computedDemoUnits : rpcTotalUnits

  // Sum all residents across properties (real data from service)
  const computedDemoResidents = properties.reduce((acc, curr: any) => acc + (curr.residents_count || 0), 0)
  const totalResidents = isDemo 
    ? (demoDb.getResidents().length || computedDemoResidents)
    : rpcTotalResidents

  const totalDelinquent = isDemo ? 0 : rpcTotalDelinquent

  // Ocupacion de Plan: totalUnits creadas vs el máximo del plan (unitsLimit)
  const occupancyRate = unitsLimit > 0 ? Math.min(100, Math.round((totalUnits / unitsLimit) * 100)) : 0

  const handleDelete = (id: string, name: string) => {
    checkAction(() => {
      setDeleteModal({
        isOpen: true,
        propertyId: id,
        propertyName: name
      })
    })
  }

  const confirmDelete = async () => {
    try {
      await deleteProperty(deleteModal.propertyId)
      setDeleteModal({ isOpen: false, propertyId: '', propertyName: '' })
    } catch (err: any) {
      console.error('Delete error:', err)
      throw err // Let the modal handle visual error state if needed, or we could handle it here
    }
  }

  const isInitialLoading = loading && properties.length === 0 && !deleteModal.isOpen && !isCreateOpen && !editingCondo;

  if (isInitialLoading || ((isLoadingUnits || isLoadingResidents || isLoadingDelinquent || isLoadingOccupied) && !isDemo)) {
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
          <h1 className="text-3xl font-bold tracking-tight text-white">{isPropiedades ? 'Portafolio de Propiedades' : 'Propiedades'}</h1>
          <p className="text-zinc-400">
            {isPropiedades 
              ? 'Gestiona tus propiedades en renta y monitorea su rendimiento.' 
              : 'Gestiona tus condominios activos y monitorea su rendimiento.'}
          </p>
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
            {isPropiedades ? 'Nueva Propiedad' : 'Nuevo Condominio'}
          </Button>
        </motion.div>
      </div>

      {/* KPI Section */}
      <PropertiesKPI
        totalCondos={totalCondos}
        totalUnits={totalUnits}
        totalResidents={totalResidents}
        delinquentResidents={totalDelinquent}
        occupancyRate={occupancyRate}
        unitsLimit={unitsLimit}
      />

      {/* Grid */}
      <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.2 }}
         className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {properties.map((condo: any) => {
          const condoResidentsCount = isDemo ? demoDb.getResidents(condo.id).length : (condo.residents_count || 0)
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
            <h3 className="text-lg font-medium text-white">
              {isPropiedades ? 'No tienes propiedades registradas' : 'No tienes condominios'}
            </h3>
            <p className="text-zinc-500 mt-1 max-w-sm mx-auto">
              {isPropiedades 
                ? 'Comienza agregando tu primera propiedad para administrar unidades e inquilinos.' 
                : 'Comienza creando tu primer condominio para administrar unidades y residentes.'}
            </p>
            <Button onClick={() => checkAction(() => setIsCreateOpen(true))} className="mt-4" variant="outline">
              {isPropiedades ? 'Agregar Propiedad' : 'Crear Condominio'}
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

      <DeletePropertyModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={confirmDelete}
        propertyName={deleteModal.propertyName}
      />
    </div>
  )
}