import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
// ❌ DESACTIVADO TEMPORALMENTE
// import { cronService } from '@/services/cron-service'
// import { Invoice } from '@/types/finance'

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()

    // Obtener facturas (solo prueba básica para validar que funciona)
    const { data: facturas, error } = await supabase
      .from('invoices')
      .select('*')
      .limit(5)

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Cron funcionando (modo seguro)',
      total: facturas?.length || 0,
      data: facturas
    })

  } catch (err: any) {
    console.error('CRON ERROR:', err)
    return NextResponse.json(
      { error: 'System Error', details: err.message },
      { status: 500 }
    )
  }
}