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

    const { pathname, hostname } = request.nextUrl

    // 🔥 DETECTAR SUBDOMINIO CORRECTAMENTE (Bypass de Autenticación)
    if (hostname === "acceso.inmobigo.mx" && pathname !== "/") {
        return NextResponse.next()
    }

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // REQUISITO: Permitir acceso público a rutas tipo /abc123 o /uuid-1234... en cualquier dominio (fallback)
    // Excluimos explícitamente rutas conocidas de la app para evitar conflictos
    const reservedRoutes = ['dashboard', 'login', 'register', 'auth', 'onboarding', 'owner', 'pase', 'api']
    const isVisitRoute = pathname !== '/' && 
                        /^\/[a-zA-Z0-9-]+$/.test(pathname) && 
                        !reservedRoutes.includes(pathname.split('/')[1])

    // Rutas estáticas o auth que siempre deben ser públicas
    const isPublicStaticOrAuth = 
        pathname.startsWith('/_next') || 
        pathname.startsWith('/favicon.ico') || 
        pathname.startsWith('/login') || 
        pathname.startsWith('/auth') || 
        pathname.startsWith('/register') || 
        pathname.startsWith('/reset-password') || 
        pathname.startsWith('/auth/confirm') || 
        pathname.startsWith('/auth/verify') || 
        pathname.startsWith('/api/debug-limits') ||
        pathname.includes('.')

    if (!user && !isVisitRoute && !isPublicStaticOrAuth) {
        // Redirección obligatoria al login si no tiene sesión y NO es un acceso de visita pública
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
        // 1. Fetch Role from multiple layers (Strict to Weak)
        
        // A. Organization Users (Staff/Admin)
        const { data: orgUser } = await supabase
            .from('organization_users')
            .select('role_new')
            .eq('user_id', user.id)
            .maybeSingle()

        // B. Profiles (Fallback for Global Roles)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role_new, user_type')
            .eq('id', user.id)
            .maybeSingle()

        // C. Residents (Specific for residents)
        const { data: resident } = await supabase
            .from('residents')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()

        let role = 'viewer'
        
        if (orgUser?.role_new) {
            role = orgUser.role_new
        } else if (profile?.role_new && profile.role_new !== 'resident') {
            role = profile.role_new
        } else if (user.user_metadata?.role === 'admin') {
            role = 'admin'
        } else if (resident || profile?.role_new === 'resident' || user.user_metadata?.role === 'resident') {
            role = 'resident'
        }

        const isAdmin = ['owner', 'admin', 'admin_condominio', 'admin_propiedad', 'admin_propiedades'].includes(role)
        const userType = profile?.user_type || user.user_metadata?.user_type

        // --- NEW ONBOARDING REDIRECTION ---
        // If logged in as admin/staff but no user_type or organization, force onboarding
        if (isAdmin && !userType && !request.nextUrl.pathname.startsWith('/onboarding')) {
            return NextResponse.redirect(new URL('/onboarding', request.url))
        }

        const path = request.nextUrl.pathname
        const isResident = role === 'resident' || role === 'tenant'
        const isStaff = isAdmin || ['manager', 'accountant', 'staff', 'security'].includes(role)

        // RESTRICTED ROUTES FOR RESIDENTS & VIEWERS
        // Note: New admin roles (admin_condominio, admin_propiedad) pass this check
        if (!isStaff && (isResident || role === 'viewer')) {
            if (path.startsWith('/dashboard/condominios') ||
                path.startsWith('/dashboard/residentes') ||
                path.startsWith('/dashboard/configuracion') ||
                path.startsWith('/dashboard/reportes')) {
                console.log(`Middleware: Redirecting ${role} from ${path} to /dashboard`)
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        }

        // Settings (Org): Owner, Admin Only
        if (path.startsWith('/dashboard/configuracion') && !isAdmin) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // Maintenance: All except Accountant?
        if (path.startsWith('/dashboard/maintenance') && role === 'accountant') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // --- Subscription Protection ---
        // Block access to core dashboard if subscription is not active
        // Exemptions: plans page (to subscribe), profile (to logout/manage account)
        const isPlansPage = path.startsWith('/dashboard/configuracion/planes')
        const isProfilePage = path.startsWith('/dashboard/perfil')

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
