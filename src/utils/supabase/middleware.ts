import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from './admin'

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
        pathname.startsWith('/acceso-residente') || 
        pathname.startsWith('/activar-residente') || 
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
    if (user) {
        const path = request.nextUrl.pathname

        // 1. Fetch Role from multiple layers (Strict to Weak)
        const adminSupabase = createAdminClient()

        const { data: orgUser } = await adminSupabase
            .from('organization_users')
            .select('role_new, organization_id')
            .eq('user_id', user.id)
            .maybeSingle()

        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('role_new, user_type')
            .eq('id', user.id)
            .maybeSingle()

        const { data: resident } = await adminSupabase
            .from('residents')
            .select('id, condominiums(organization_id)')
            .eq('user_id', user.id)
            .maybeSingle()

        let role = 'viewer'
        if (orgUser?.role_new) {
            role = orgUser.role_new
        } else if (profile?.role_new && profile.role_new !== 'resident' && profile.role_new !== 'tenant') {
            role = profile.role_new
        } else if (user.user_metadata?.role === 'admin') {
            role = 'admin'
        } else if (resident || profile?.role_new === 'resident' || profile?.role_new === 'tenant' || user.user_metadata?.role === 'resident' || user.user_metadata?.role === 'tenant') {
            role = 'resident' 
        }

        // Determine associated business_type
        let orgId = orgUser?.organization_id || (resident?.condominiums as any)?.organization_id
        let businessType = 'condominio'

        if (orgId) {
            const { data: org } = await adminSupabase
                .from('organizations')
                .select('business_type')
                .eq('id', orgId)
                .maybeSingle()
            if (org?.business_type) {
                businessType = org.business_type
            }
        }


        if (role === 'resident' || role === 'tenant') {
            if (businessType === 'propiedades') {
                role = 'tenant'
            } else {
                role = 'resident'
            }
        }



        const isAdmin = ['owner', 'admin', 'admin_condominio', 'admin_propiedad', 'admin_propiedades'].includes(role)
        const userType = profile?.user_type || user.user_metadata?.user_type

        // --- GLOBAL REDIRECTIONS BASED ON ROLES ---
        if (role === 'resident' && !path.startsWith('/residente') && !isPublicStaticOrAuth) {
            const url = request.nextUrl.clone()
            url.pathname = '/residente'
            return NextResponse.redirect(url)
        }

        if (role === 'tenant' && !path.startsWith('/inquilino') && !isPublicStaticOrAuth) {
            const url = request.nextUrl.clone()
            url.pathname = '/inquilino'
            return NextResponse.redirect(url)
        }

        // Bloquear acceso a /residente/* si no es residente
        if (path.startsWith('/residente') && role !== 'resident') {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }

        // Bloquear acceso a /inquilino/* si no es inquilino
        if (path.startsWith('/inquilino') && role !== 'tenant') {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }

        if (path.startsWith('/dashboard')) {
            // --- NEW ONBOARDING REDIRECTION ---
            if (isAdmin && !userType && !path.startsWith('/onboarding')) {
                return NextResponse.redirect(new URL('/onboarding', request.url))
            }

            const isResidentRole = role === 'resident' || role === 'tenant'
            const isStaff = isAdmin || ['manager', 'accountant', 'staff', 'security'].includes(role)

            // RESTRICTED ROUTES FOR VIEWERS
            if (!isStaff && role === 'viewer') {
                if (path.startsWith('/dashboard/condominios') ||
                    path.startsWith('/dashboard/residentes') ||
                    path.startsWith('/dashboard/configuracion') ||
                    path.startsWith('/dashboard/reportes')) {
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                }
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

        // --- SaaS Professional Blocking Logic ---
        const isPlansPage = path.startsWith('/dashboard/configuracion/planes')
        const isProfilePage = path.startsWith('/dashboard/perfil')

        if (!isPlansPage && !isProfilePage) {
            const { data: subscription } = await adminSupabase
                .from('subscriptions')
                .select('subscription_status, created_at')
                .eq('organization_id', orgId)
                .eq('subscription_status', 'active')
                .maybeSingle()

            if (subscription) {
                const createdAt = new Date(subscription.created_at)
                const nextPayment = new Date(createdAt)
                nextPayment.setMonth(nextPayment.getMonth() + 1)
                
                const now = new Date()
                if (now > nextPayment && role !== 'resident') {
                    const url = request.nextUrl.clone()
                    url.pathname = '/dashboard/configuracion/planes'
                    url.searchParams.set('reason', 'expired')
                    return NextResponse.redirect(url)
                }
            } else if (role !== 'resident') {
                // If no subscription and not demo mode (you might want to allow demo mode here)
                // For now, let's just block if it's definitely not a resident
            }
        }
    }

    return supabaseResponse
}
