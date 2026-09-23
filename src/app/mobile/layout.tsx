import { Inter } from 'next/font/google'

const inter = Inter({
    subsets: ['latin'],
})

export const metadata = {
    title: 'InmobiGo',
    description: 'App móvil de InmobiGo para residentes',
}

/**
 * Layout raíz de la versión "app móvil" (basada en el diseño de Figma),
 * independiente del panel web actual (/residente/*, /login). No reemplaza
 * nada — es una superficie nueva y aditiva. Solo aplica la tipografía y el
 * fondo compartidos; el control de sesión y el bottom nav viven en el grupo
 * de rutas (app), ya que /mobile/login no requiere estar autenticado.
 */
export default function MobileLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={`${inter.className} min-h-screen bg-[#F8F9FA]`}>
            {children}
        </div>
    )
}
