import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Get all organizations
        const { data: orgs, error: orgErr } = await supabase.from('organizations').select('*').limit(5)
        
        let report = `=== ORGANIZATIONS ===\n${JSON.stringify(orgs, null, 2)}\n\n`
        
        if (orgs && orgs.length > 0) {
            for (const org of orgs) {
                report += `\n=== ORG: ${org.name} (${org.id}) ===\n`
                
                // Get subscriptions
                const { data: subs } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('organization_id', org.id)
                report += `Subscriptions: ${JSON.stringify(subs, null, 2)}\n`

                // Get condominiums
                const { data: condos } = await supabase
                    .from('condominiums')
                    .select('*')
                    .eq('organization_id', org.id)
                report += `Condominiums: ${JSON.stringify(condos, null, 2)}\n`

                if (condos && condos.length > 0) {
                    const condoIds = condos.map(c => c.id)
                    
                    // Count units exactly as the trigger does
                    const { count } = await supabase
                        .from('units')
                        .select('*', { count: 'exact', head: true })
                        .in('condominium_id', condoIds)
                    report += `\n=== CURRENT UNIT COUNT (via count API): ${count} ===\n`
                    
                    // Fetch actual units
                    const { data: units } = await supabase
                        .from('units')
                        .select('id, unit_number, type, status, condominium_id')
                        .in('condominium_id', condoIds)
                    report += `Units Data (${units?.length}):\n${JSON.stringify(units, null, 2)}\n`
                }
            }
        }
        
        return new NextResponse(report, { headers: { 'content-type': 'text/plain' } })
    } catch (e: any) {
        return NextResponse.json({ error: e.message })
    }
}
