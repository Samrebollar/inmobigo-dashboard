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
                    // Only unauthenticated visitors are in demo mode
                    setIsDemo(true)
                    return
                }

                // Authenticated users: check for an active subscription
                const { data: subscription, error: subError } = await supabase
                    .from('subscriptions')
                    .select('subscription_status')
                    .eq('user_id', user.id)
                    .eq('subscription_status', 'active')
                    .maybeSingle()

                // If there's a query error, default to NOT demo (real account benefit-of-doubt)
                if (subError) {
                    console.warn('useDemoMode: subscriptions query error, defaulting to real mode', subError.message)
                    setIsDemo(false)
                } else {
                    // isDemo only if no active subscription row found
                    setIsDemo(!subscription)
                }
            } catch (e) {
                // On unexpected errors, if we have a session assume real mode
                const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
                setIsDemo(!session)
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
