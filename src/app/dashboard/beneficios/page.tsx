import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { readFile } from 'fs/promises'
import path from 'path'
import { getBenefitDataAction, getDetailedReferralStatsAction } from '@/app/actions/benefit-actions'
import { BeneficiosClient } from '@/components/dashboard/beneficios-client'
import { AlertCircle, Database, Terminal } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BeneficiosPage() {
  const supabase = await createClient()

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Determine user role and organization context
  const adminSupabase = createAdminClient()
  
  const { data: orgUser } = await adminSupabase
    .from('organization_users')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: resident } = await adminSupabase
    .from('residents')
    .select('*, condominiums(organization_id)')
    .eq('user_id', user.id)
    .maybeSingle()

  // Fallback: If not in organization_users, check if they are the OWNER of any organization
  let finalOrganizationId = orgUser?.organization_id || resident?.condominiums?.organization_id
  let userRole = orgUser?.role || 'admin_propiedad'

  if (!finalOrganizationId) {
    const { data: ownedOrg } = await adminSupabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()
    
    if (ownedOrg) {
      finalOrganizationId = ownedOrg.id
    }
  }

  // If still no organization context, display error
  if (!finalOrganizationId) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-zinc-500 p-6 text-center max-w-md mx-auto">
        <AlertCircle size={40} className="text-zinc-650 mb-3" />
        <h3 className="font-bold text-white text-lg">Sin Organización</h3>
        <p className="text-sm text-zinc-500 mt-1">No se encontró un contexto de organización activo para tu cuenta de usuario.</p>
      </div>
    )
  }

  // 3. Fetch Benefits Data via Server Action
  const result = await getBenefitDataAction(finalOrganizationId)

  // 4. Handle DB Not Ready (Tables not created yet)
  if (!result.success && (result.error === 'DB_NOT_READY' || result.error === 'DB_NOT_READY_REWARDS')) {
    const isRewards = result.error === 'DB_NOT_READY_REWARDS'
    const migrationFileName = isRewards
      ? '20260620_referral_rewards.sql'
      : '20260619_create_benefits_schema.sql'
    const migrationDesc = isRewards
      ? 'Las tablas y columnas del Sistema de Recompensas de Referidos no han sido creadas en tu base de datos de Supabase.'
      : 'Las tablas necesarias para el módulo de Beneficios no han sido creadas en tu base de datos de Supabase.'

    // Try to read the SQL file to show it inline
    let sqlContent = ''
    try {
      const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', migrationFileName)
      sqlContent = await readFile(sqlPath, 'utf-8')
    } catch {
      sqlContent = '-- No se pudo leer el archivo SQL. Búscalo en: supabase/migrations/' + migrationFileName
    }

    return (
      <div className="mx-auto max-w-3xl p-6 md:p-12">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 space-y-6 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
          
          <div className="flex items-center gap-4 border-b border-zinc-800 pb-5">
            <div className="h-12 w-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Configuración de Base de Datos requerida</h2>
              <p className="text-xs text-zinc-500">Módulo de Beneficios 🎁</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-zinc-400 text-sm leading-relaxed">
              {migrationDesc}
            </p>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Copia el SQL de abajo y ejecútalo en el <strong className="text-white">SQL Editor de Supabase</strong>:
            </p>

            {/* File reference */}
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 flex items-center gap-3 text-xs font-mono text-zinc-300">
              <Terminal size={14} className="text-indigo-400 shrink-0" />
              <span>supabase/migrations/{migrationFileName}</span>
            </div>

            {/* Inline SQL */}
            <div className="relative">
              <pre className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 text-[11px] text-zinc-300 font-mono overflow-x-auto max-h-72 leading-relaxed whitespace-pre-wrap break-all">
                {sqlContent}
              </pre>
            </div>

            <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800 text-xs text-zinc-500 space-y-2">
              <p className="font-bold text-zinc-400 uppercase tracking-widest text-[9px]">Instrucciones para aplicar:</p>
              <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                <li>Ve al panel de control de tu proyecto en <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Supabase</a>.</li>
                <li>Selecciona <strong className="text-zinc-300">SQL Editor</strong> en el menú de la izquierda.</li>
                <li>Haz clic en <strong className="text-zinc-300">New query</strong> (Nueva consulta).</li>
                <li>Copia el SQL de arriba y pégalo en el editor.</li>
                <li>Haz clic en <strong className="text-zinc-300">Run</strong> (Ejecutar) en la esquina inferior derecha.</li>
                <li>Recarga esta página.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 5. General Error state
  if (!result.success || !result.data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-zinc-500 p-6 text-center max-w-md mx-auto">
        <AlertCircle size={40} className="text-rose-500/80 mb-3" />
        <h3 className="font-bold text-white text-lg">Error al Cargar Beneficios</h3>
        <p className="text-sm text-zinc-500 mt-1">{result.error || 'Ocurrió un error inesperado al consultar los datos o no se encontraron datos válidos.'}</p>
      </div>
    )
  }

  // Fetch detailed stats for the referral system
  let detailedStats = {
    totalReferrals: 0,
    activePlans: 0,
    totalEarned: 0,
    totalPaid: 0,
    totalPending: 0,
    topReferrers: []
  }

  const statsResult = await getDetailedReferralStatsAction(finalOrganizationId)
  if (statsResult.success && statsResult.data) {
    detailedStats = statsResult.data as any
  }

  const adminContext = {
    ...user,
    organization_id: finalOrganizationId,
    role: userRole
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
      <BeneficiosClient 
        admin={adminContext} 
        initialData={result.data} 
        detailedStats={detailedStats} 
      />
    </div>
  )
}
