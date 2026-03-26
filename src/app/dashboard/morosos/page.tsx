'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertTriangle, UserX, Receipt, Mail, Loader2, ArrowUpRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { useDemoMode } from '@/hooks/use-demo-mode'
import { demoDb } from '@/utils/demo-db'
import { DelinquencyCenter } from '@/components/finance/delinquency-center'
import { motion } from 'framer-motion'

export default function MorososPage() {
  const supabase = createClient()
  const { isDemo, loading: demoLoading } = useDemoMode()
  const [loading, setLoading] = useState(true)
  const [condominiumId, setCondominiumId] = useState<string | null>(null)
  
  const [stats, setStats] = useState({
    totalMorosos: 0,
    deudaTotal: 0,
    facturasVencidas: 0,
    topRiskCount: 0,
    topRiskLevel: 'low' as 'low' | 'medium' | 'critical',
    maxDaysOverdue: 0
  })

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (isDemo) {
            setCondominiumId('demo-condo-1')
          }
          setLoading(false)
          return
        }

        // Get Organization for user
        const { data: orgUserData } = await supabase
          .from('organization_users')
          .select('organization:organizations(*)')
          .eq('user_id', user.id)
          .maybeSingle()

        let org = orgUserData?.organization
        if (!org) {
          const { data: ownerOrg } = await supabase
            .from('organizations')
            .select('*')
            .eq('owner_id', user.id)
            .maybeSingle()
          org = ownerOrg
        }

        if (org) {
          const { data: condos } = await supabase
            .from('condominiums')
            .select('id')
            .eq('organization_id', (org as any).id)
            .eq('status', 'active')
            .limit(1)

          if (condos && condos.length > 0) {
            setCondominiumId((condos as any)[0].id)
          }
        }

        if (isDemo && !condominiumId) {
          const demoCondos = demoDb.getProperties()
          setCondominiumId(demoCondos.length > 0 ? demoCondos[0].id : 'demo-condo-1')
        }

        setLoading(false)
      } catch (err) {
        console.error('Error init MorososPage:', err)
        setLoading(false)
      }
    }

    if (!demoLoading) init()
  }, [demoLoading, isDemo])

  const handleStatsUpdate = useCallback((newStats: { 
    totalMorosos: number, 
    deudaTotal: number, 
    facturasVencidas: number,
    topRiskCount: number,
    topRiskLevel: 'low' | 'medium' | 'critical',
    maxDaysOverdue: number 
  }) => {
    setStats(prev => {
      // Only update if values actually changed to prevent loops
      if (prev.totalMorosos === newStats.totalMorosos && 
          prev.deudaTotal === newStats.deudaTotal && 
          prev.facturasVencidas === newStats.facturasVencidas &&
          prev.topRiskCount === newStats.topRiskCount &&
          prev.topRiskLevel === newStats.topRiskLevel &&
          prev.maxDaysOverdue === newStats.maxDaysOverdue) {
        return prev
      }
      return newStats
    })
  }, [])

  if (loading || demoLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!condominiumId) {
    return (
      <div className="p-8 text-white">
        <h2 className="text-xl font-bold mb-2">No hay condominios activos</h2>
        <p className="text-zinc-400">Para ver morosos, primero debes crear un condominio.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Gestión de Morosos</h1>
          <p className="text-zinc-400">Visualiza a los inquilinos con atrasos y da seguimiento a la cobranza.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Metric Card: Total Morosos (Risk/Urgent) */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            whileHover={{ scale: 1.02 }}
            className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg transition-all hover:shadow-rose-500/20 hover:border-rose-500/50"
        >
          <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-rose-500/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="p-6">
            <div className="flex flex-row items-center justify-between pb-4">
              <h3 className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Total Morosos</h3>
              <div className="rounded-full bg-rose-500/10 p-2 text-rose-500 transition-colors group-hover:bg-rose-500/20">
                <UserX className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold tracking-tight text-white">{stats.totalMorosos}</div>
              </div>
              <p className="text-xs text-zinc-500 mt-2 font-medium">Residentes con deuda</p>
            </div>
          </div>
        </motion.div>

        {/* Metric Card: Deuda Total (Warning/Financial) */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            whileHover={{ scale: 1.02 }}
            className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg transition-all hover:shadow-amber-500/20 hover:border-amber-500/50"
        >
          <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="p-6">
            <div className="flex flex-row items-center justify-between pb-4">
              <h3 className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Deuda Total</h3>
              <div className="rounded-full bg-amber-500/10 p-2 text-amber-500 transition-colors group-hover:bg-amber-500/20">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold tracking-tight text-white">
                  ${stats.deudaTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-2 font-medium">Monto pendiente de cobro</p>
            </div>
          </div>
        </motion.div>

        {/* Metric Card: Facturas Vencidas (Tracking/Status) */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            whileHover={{ scale: 1.02 }}
            className={`group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg transition-all 
              ${stats.topRiskLevel === 'critical' ? 'hover:shadow-rose-500/20 hover:border-rose-500/50' : 
                stats.topRiskLevel === 'medium' ? 'hover:shadow-amber-500/20 hover:border-amber-500/50' : 
                'hover:shadow-indigo-500/20 hover:border-indigo-500/50'}`}
        >
          <div className={`absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100
              ${stats.topRiskLevel === 'critical' ? 'via-rose-500/50' : 
                stats.topRiskLevel === 'medium' ? 'via-amber-500/50' : 
                'via-indigo-500/50'}`} />
          <div className="p-6">
            <div className="flex flex-row items-center justify-between pb-4">
              <h3 className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Morosidad Crítica</h3>
              <div className={`rounded-full p-2 transition-colors 
                  ${stats.topRiskLevel === 'critical' ? 'bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20' : 
                    stats.topRiskLevel === 'medium' ? 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20' : 
                    'bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500/20'}`}>
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold tracking-tight text-white">
                {stats.topRiskCount} {stats.topRiskCount === 1 ? 'residente' : 'residentes'}
              </div>
              <div className="text-xs font-medium text-zinc-500 mt-2">
                {stats.topRiskLevel === 'low' ? '+7' : stats.topRiskLevel === 'medium' ? '+15' : `+${stats.maxDaysOverdue}`} días de atraso
              </div>
            </div>
            
            <div className={`mt-4 pt-4 border-t border-zinc-800/50 text-xs font-bold
                ${stats.topRiskLevel === 'critical' ? 'text-rose-500' : 
                  stats.topRiskLevel === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
              {stats.topRiskLevel === 'critical' ? '¡Requiere atención inmediata!' : 
               stats.topRiskLevel === 'medium' ? 'Atención prioritaria' : 
               stats.totalMorosos > 0 ? 'Atención programada' : 'Sin residentes morosos'}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main layout for Delinquency Center */}
      <div className="h-[500px]">
        <DelinquencyCenter 
          condominiumId={condominiumId} 
          onStatsUpdate={handleStatsUpdate}
        />
      </div>
    </div>
  )
}
