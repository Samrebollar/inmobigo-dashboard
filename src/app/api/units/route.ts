import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { organizationId, name, number } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId es requerido' },
        { status: 400 }
      )
    }

    // 1️⃣ Obtener organización
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('units_limit, units_used, subscription_status')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organización no encontrada' },
        { status: 404 }
      )
    }

    // 2️⃣ Verificar suscripción activa
    if (organization.subscription_status !== 'active') {
      return NextResponse.json(
        { error: 'Tu suscripción no está activa.' },
        { status: 403 }
      )
    }

    // 3️⃣ Verificar límite
    if (organization.units_used >= organization.units_limit) {
      return NextResponse.json(
        { error: 'Has alcanzado el límite de unidades de tu plan.' },
        { status: 403 }
      )
    }

    // 4️⃣ Crear unidad
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .insert({
        organization_id: organizationId,
        name,
        number,
      })
      .select()
      .single()

    if (unitError) throw unitError

    // 5️⃣ Incrementar contador
    await supabase
      .from('organizations')
      .update({
        units_used: organization.units_used + 1,
      })
      .eq('id', organizationId)

    return NextResponse.json(unit)
  } catch (error: any) {
    console.error('Create Unit Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}