import { verifyInviteToken } from '@/utils/invite-token'
import { createAdminClient } from '@/utils/supabase/admin'
import { AlertTriangle, ExternalLink, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react'

const MP_BLUE = '#009EE3'

interface PageProps {
    searchParams: Promise<{ token?: string }>
}

function buildOAuthUrl(token: string): string {
    const clientId = process.env.NEXT_PUBLIC_MP_CLIENT_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUri = encodeURIComponent(`${appUrl}/api/mercadopago/oauth/callback`)
    return (
        `https://auth.mercadopago.com/authorization` +
        `?client_id=${clientId}` +
        `&response_type=code` +
        `&platform_id=mp` +
        `&state=${encodeURIComponent(token)}` +
        `&redirect_uri=${redirectUri}`
    )
}

export const metadata = {
    title: 'Conectar Mercado Pago — InmobiGo',
    description: 'Enlace de invitación público para conectar Mercado Pago Business.',
}

export default async function PublicConnectPage(props: PageProps) {
    const searchParams = await props.searchParams
    const token = searchParams.token

    if (!token) {
        return (
            <PublicCardLayout>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4">
                    <AlertTriangle className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Falta el token de invitación</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                    El enlace utilizado es incompleto. Solicita al administrador del condominio que te genere un nuevo enlace de invitación.
                </p>
            </PublicCardLayout>
        )
    }

    // 1. Validar firma criptográfica y expiración
    const verification = verifyInviteToken(token)

    if (!verification.valid || !verification.condominiumId) {
        return (
            <PublicCardLayout>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-4">
                    <AlertTriangle className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Enlace de invitación no válido</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                    {verification.error || 'El enlace ha expirado o es incorrecto.'}
                </p>
                <p className="text-zinc-500 text-xs mt-4">
                    Los enlaces de invitación tienen una validez de 48 horas por razones de seguridad.
                </p>
            </PublicCardLayout>
        )
    }

    const { condominiumId } = verification
    const adminSupabase = createAdminClient()

    // 2. Verificar si el token ya fue consumido en mp_connect_tokens
    const { data: dbToken } = await adminSupabase
        .from('mp_connect_tokens')
        .select('used_at, expires_at')
        .eq('token', token)
        .maybeSingle()

    if (dbToken?.used_at) {
        return (
            <PublicCardLayout>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Invitación ya utilizada</h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                    Este enlace de invitación ya fue procesado exitosamente. La cuenta de Mercado Pago de este condominio ya se encuentra vinculada.
                </p>
            </PublicCardLayout>
        )
    }

    // 3. Consultar nombre del condominio
    const { data: condo } = await adminSupabase
        .from('condominiums')
        .select('name')
        .eq('id', condominiumId)
        .maybeSingle()

    const condoName = condo?.name || 'Condominio'

    // 4. Verificar si payment_accounts ya está conectado
    const { data: existingAccount } = await adminSupabase
        .from('payment_accounts')
        .select('id, expires_at')
        .eq('condominium_id', condominiumId)
        .eq('provider', 'mercadopago')
        .maybeSingle()

    const isAlreadyConnected = existingAccount && (!existingAccount.expires_at || new Date(existingAccount.expires_at) > new Date())

    const oauthUrl = buildOAuthUrl(token)

    return (
        <PublicCardLayout>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-5 shadow-lg shadow-blue-500/5">
                <Zap className="h-8 w-8" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 text-xs font-semibold mb-4">
                <span>Vinculación oficial de cobros</span>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
                {condoName}
            </h1>

            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                Has sido invitado para conectar la cuenta de <strong className="text-zinc-200">Mercado Pago Business</strong> para la administración de este condominio.
            </p>

            {isAlreadyConnected ? (
                <div className="mt-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                    <p className="font-bold flex items-center justify-center gap-1.5 mb-1">
                        <CheckCircle2 className="h-4 w-4" /> Ya existe una cuenta conectada
                    </p>
                    <p className="text-emerald-400/80">
                        Si deseas reconectar o cambiar de cuenta, puedes hacer clic en el botón a continuación.
                    </p>
                </div>
            ) : null}

            <div className="mt-8">
                <a
                    href={oauthUrl}
                    style={{ backgroundColor: MP_BLUE }}
                    className="inline-flex items-center justify-center gap-3 w-full px-6 py-3.5 rounded-2xl text-white text-base font-bold hover:opacity-90 transition-all shadow-xl shadow-blue-500/20 active:scale-95 cursor-pointer"
                >
                    <ExternalLink className="h-5 w-5" />
                    Conectar con Mercado Pago
                </a>
            </div>

            <div className="mt-6 pt-5 border-t border-zinc-800/60 flex items-center justify-center gap-2 text-xs text-zinc-500">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>InmobiGo no almacena tus claves ni retiene fondos.</span>
            </div>
        </PublicCardLayout>
    )
}

function PublicCardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />

            <main className="relative z-10 w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center">
                {children}
            </main>

            <footer className="relative z-10 mt-8 text-center text-xs text-zinc-600">
                <p>Plataforma de Gestión de Condominios — InmobiGo</p>
            </footer>
        </div>
    )
}
