import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // Facturas
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')

  // Pagos
  const { data: payments } = await supabase
    .from('payments')
    .select('*')

  // ===============================
  // KPIs
  // ===============================

  const totalFacturado = invoices?.reduce((acc, i) => acc + Number(i.amount), 0) || 0

  const totalCobrado = payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0

  const facturasVencidas = invoices?.filter(
    i => i.status === 'vencida'
  ) || []

  const pendientes = invoices?.filter(
    i => i.status === 'pendiente'
  ) || []

  const tasaCobranza =
    totalFacturado > 0
      ? ((totalCobrado / totalFacturado) * 100).toFixed(1)
      : 0

  // ===============================
  // Actividad reciente
  // ===============================

  const actividad = payments
    ?.sort((a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
    )
    .slice(0, 5)

  return NextResponse.json({
    kpis: {
      totalFacturado,
      totalCobrado,
      facturasVencidas: facturasVencidas.length,
      pendientes: pendientes.length,
      tasaCobranza
    },
    actividad
  })
}