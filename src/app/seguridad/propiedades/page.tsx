'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { PropertiesKPI } from '@/components/seguridad/PropertiesKPI'
import { PropertyCard } from '@/components/seguridad/PropertyCard'
import { CreatePropertyModal } from '@/components/seguridad/CreatePropertyModal'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { Plus, LayoutGrid, List, Building } from 'lucide-react'
import { DeletePropertyModal } from '@/components/seguridad/DeletePropertyModal'

import { useProperties } from '@/hooks/use-properties'
import { EditCondominiumModal } from '@/components/seguridad/EditCondominiumModal'
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

  const [hasFetched, setHasFetched] = useState(false)

  const checkUserAndFetch = async () => {
    if (loadingDemo || hasFetched) return

    try {
      setHasFetched(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoadingUnits(false)
        return
      }

      // 0. Fetch KPIs via RPC (Fixed patterns)
      if (!isDemo) {
        setIsLoadingUnits(true)
        setIsLoadingResidents(true)
        setIsLoadingDelinquent(true)
        setIsLoadingOccupied(true)

        const fetchKpis = async () => {
            const [unitsRes, residentsRes, delinquentRes, occupiedRes] = await Promise.all([
                supabase.rpc('get_total_units'),
                supabase.rpc('get_total_residents'),
                supabase.rpc('get_total_delinquent_residents'),
                supabase.rpc('get_total_occupied_units')
            ])

            if (!unitsRes.error) setRpcTotalUnits(Number(unitsRes.data?.[0]?.total_unidades || 0))
            setIsLoadingUnits(false)

            if (!residentsRes.error) setRpcTotalResidents(Number(residentsRes.data?.[0]?.total_residentes || 0))
            setIsLoadingResidents(false)

            if (!delinquentRes.error) setRpcTotalDelinquent(Number(delinquentRes.data?.[0]?.total_morosos || 0))
            setIsLoadingDelinquent(false)

            if (!occupiedRes.error) setRpcOccupiedUnits(Number(occupiedRes.data?.[0]?.total_ocupadas || 0))
            setIsLoadingOccupied(false)
        }
        fetchKpis()
      }

      // 1. Fetch properties and orgId via the updated hook
      // We also fetch org details for the limits
      const response = await fetch('/api/properties/list')
      const result = await response.json()

      if (result.organizationId) {
        setOrgId(result.organizationId)
        fetchProperties() // Hook uses the API internally now

        const { data: orgData } = await supabase
          .from('organizations')
          .select('units_limit, plan')
          .eq('id', result.organizationId)
          .single()
          
        const PLAN_LIMITS: Record<string, number> = {
            'CORE': 20, 'PLUS': 60, 'ELITE': 120, 'CORPORATE': 250,
            'CORE PRUEBA': 5, 'CORPORATE PLUS': 1000, 'FREE': 5
        }
        setUnitsLimit(orgData?.units_limit || PLAN_LIMITS[orgData?.plan?.trim().toUpperCase() || 'FREE'] || 5)
      } else if (isDemo) {
        setOrgId('demo-org-id')
        setUnitsLimit(5)
      }
    } catch (err) {
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
