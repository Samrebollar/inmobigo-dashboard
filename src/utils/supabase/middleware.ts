import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (
        !user &&
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/auth') &&
        !request.nextUrl.pathname.startsWith('/register')
    ) {
        // no user, potentially respond by redirecting the user to the login page
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If user is logged in and trying to access login page, redirect to dashboard
    if (user && request.nextUrl.pathname.startsWith('/login')) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // RBAC Check
    if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
        // 1. Fetch Admin Role (Strict)
        const { data: orgUser } = await supabase
            .from('organization_users')
            .select('role')
            .eq('user_id', user.id)
            .single()

        // 2. Fetch Resident Role (Strict)
        const { data: resident } = await supabase
            .from('residents')
            .select('id')
            .eq('user_id', user.id)
            .single()

        let role = 'viewer'
        if (orgUser?.role) {
            role = orgUser.role
        } else if (resident) {
            role = 'resident'
        }

        const path = request.nextUrl.pathname
        const isResident = role === 'resident'
        // viewer is treated as restrictive too

        // RESTRICTED ROUTES FOR RESIDENTS & VIEWERS
        if (isResident || role === 'viewer') {
            if (path.startsWith('/dashboard/properties') ||
                path.startsWith('/dashboard/residents') ||
                path.startsWith('/dashboard/settings') ||
                path.startsWith('/dashboard/reports')) {
                console.log(`Middleware: Redirecting ${role} from ${path} to /dashboard`)
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        }

        // Settings (Org): Owner, Admin Only
        if (path.startsWith('/dashboard/settings') && !['owner', 'admin'].includes(role)) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // Maintenance: All except Accountant? (Accountant usually only finance)
        if (path.startsWith('/dashboard/maintenance') && role === 'accountant') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // --- Subscription Protection ---
        // Block access to core dashboard if subscription is not active
        // Exemptions: plans page (to subscribe), profile (to logout/manage account)
        const isPlansPage = path.startsWith('/dashboard/settings/plans')
        const isProfilePage = path.startsWith('/dashboard/profile')

        if (!isPlansPage && !isProfilePage) {
            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('subscription_status')
                .eq('user_id', user.id)
                .eq('subscription_status', 'active')
                .maybeSingle()

            /* 
            // COMENTADO PARA PERMITIR MODO DEMO
            if (!subscription) {
                const url = request.nextUrl.clone()
                url.pathname = '/dashboard/settings/plans'
                return NextResponse.redirect(url)
            }
            */
        }
    }

    return supabaseResponse
}
