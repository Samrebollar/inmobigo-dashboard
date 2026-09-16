import { createServerClient } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  let next = searchParams.get('next') ?? '/reset-password'
  const code = searchParams.get('code')

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Intercambiar el código o validar el token
  let authError = null
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    authError = error
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    authError = error
  } else {
    authError = new Error('No code or token_hash found')
  }

  // 2. Si hubo error, redirigir al login
  if (authError) {
    console.error('Auth Confirmation Error:', authError)
    return NextResponse.redirect(new URL('/login?error=auth-failure', request.url))
  }

  // 3. ¡ESTA ES LA CLAVE! Crear la respuesta y copiar las cookies MANUALMENTE CON OPCIONES
  // 4. Respaldo para móvil: si el navegador pierde la cookie de sesión en el salto entre
  // apps (correo -> navegador), adjuntamos los tokens reales de la sesión ya verificada
  // en el FRAGMENTO de la URL (nunca en query string: el fragmento no se envía al servidor
  // ni queda en logs). El cliente los usa para reestablecer la sesión con setSession().
  // Importante: nunca pasar aquí un email o user id "pelado" — eso sería confiar en un
  // identificador no verificado y permitiría a cualquiera forjar el enlace.
  const { data: { session } } = await supabase.auth.getSession()
  if (session && next.startsWith('/reset-password')) {
    next = `${next}#access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`
  }

  const response = NextResponse.redirect(new URL(next, request.url))
  
  // Obtenemos todas las cookies que Supabase acaba de intentar poner en el almacén
  const allCookies = cookieStore.getAll()
  
  allCookies.forEach(cookie => {
    // Copiamos la cookie con TODAS sus opciones originales
    response.cookies.set({
        name: cookie.name,
        value: cookie.value,
        path: '/',
        sameSite: 'lax',
        secure: true,
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7 // 1 semana por seguridad
    })
  })

  return response
}
