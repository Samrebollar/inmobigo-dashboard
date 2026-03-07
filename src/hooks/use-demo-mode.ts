'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export function useDemoMode() {
    const supabase = createClient()
    const router = useRouter()
    const [isDemo, setIsDemo] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkSub = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setIsDemo(true)
                    return
                }

                const { data: subscription } = await supabase
                    .from('subscriptions')
                    .select('subscription_status')
                    .eq('user_id', user.id)
                    .eq('subscription_status', 'active')
                    .maybeSingle()

                setIsDemo(!subscription)
            } catch (e) {
                setIsDemo(true)
            } finally {
                setLoading(false)
            }
        }
        checkSub()
    }, [])

    const checkAction = (onConfirm: () => void, isWriteAction: boolean = true) => {
        if (isDemo && isWriteAction) {
            // Instead of blocking, we now allow it but it should be handled specially
            // by the component to avoid database persistence.
            // For now, we'll keep the alert but change the text to be more encouraging.
            console.log('Modo Demo: Acción simulada habilitada')
        }
        onConfirm()
    }

    return { isDemo, loading, checkAction }
}
