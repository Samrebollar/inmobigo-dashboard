import { createClient } from '@/utils/supabase/client'

export const dashboardService = {
    async getGlobalStats(orgId: string) {
        const supabase = createClient()

        // 1. Get properties count
        const { count: propertiesCount } = await supabase
            .from('condominiums')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('status', 'active')

        // 2. Get active condominiums IDs to filter other data
        const { data: condos } = await supabase
            .from('condominiums')
            .select('id, units_total')
            .eq('organization_id', orgId)
            .eq('status', 'active')

        const condoIds = condos?.map(c => c.id) || []

        let totalRevenue = 0
        let totalCollected = 0
        let totalOverdue = 0
        let totalUnits = condos?.reduce((acc, c) => acc + c.units_total, 0) || 0

        if (condoIds.length > 0) {
            // 3. Get Invoice Stats
            const { data: invoices } = await supabase
                .from('invoices')
                .select('amount, status')
                .in('condominium_id', condoIds)

            invoices?.forEach(inv => {
                totalRevenue += inv.amount
                if (inv.status === 'paid') totalCollected += inv.amount
                if (inv.status === 'overdue') totalOverdue += inv.amount
            })
        }

        return {
            propertiesCount: propertiesCount || 0,
            totalUnits,
            totalRevenue,
            totalCollected,
            totalOverdue,
            occupancyRate: 85 // Mocked for now until residents link is robust
        }
    },

    async getDeudaTotal() {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('get_total_deuda').single()

        if (error) {
            console.error('Error fetching total deuda:', error)
            throw error
        }

        return { total_deuda: Number(data?.total_deuda || 0) }
    }
}
