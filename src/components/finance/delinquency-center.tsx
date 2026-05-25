'use client'

import { useState, useEffect } from 'react'
import { DelinquencyReportModal } from './delinquency-report-modal'
import { createClient } from '@/utils/supabase/client'

export function DelinquencyCenter({
    condominiumId,
    onStatsUpdate
}: {
    condominiumId: string,
    onStatsUpdate?: (stats: any) => void
}) {
    const [availableCondos, setAvailableCondos] = useState<{ id: string, name: string }[]>([])
    const [activeCondoIds, setActiveCondoIds] = useState<string[]>([])
    const supabase = createClient()

    useEffect(() => {
        if (!condominiumId || condominiumId.startsWith('demo-')) {
            setActiveCondoIds([condominiumId])
            return
        }

        const initCondos = async () => {
            try {
                // Look up org from this condo
                const { data: orgLookup } = await supabase
                    .from('condominiums')
                    .select('organization_id')
                    .eq('id', condominiumId)
                    .maybeSingle()

                if (orgLookup?.organization_id) {
                    const { data: orgCondos } = await supabase
                        .from('condominiums')
                        .select('id, name')
                        .eq('organization_id', orgLookup.organization_id)
                        .order('name')

                    if (orgCondos) {
                        setAvailableCondos(orgCondos)
                        setActiveCondoIds(orgCondos.map(c => c.id))
                    } else {
                        setActiveCondoIds([condominiumId])
                    }
                } else {
                    setActiveCondoIds([condominiumId])
                }
            } catch (err) {
                console.error('[DelinquencyCenter] Error loading condos:', err)
                setActiveCondoIds([condominiumId])
            }
        }

        initCondos()
    }, [condominiumId])

    return (
        <div className="w-full h-full">
            <DelinquencyReportModal
                isOpen={true}
                onClose={() => {}}
                condominiumIds={activeCondoIds}
                availableCondos={availableCondos}
                onStatsUpdate={onStatsUpdate}
            />
        </div>
    )
}
