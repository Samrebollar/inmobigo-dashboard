import { DelinquencyGuard } from '@/components/residente/delinquency-guard'

export const dynamic = 'force-dynamic'

export default function ResidenteHelpLayout({ children }: { children: React.ReactNode }) {
    return <DelinquencyGuard section="Contacto bloqueado">{children}</DelinquencyGuard>
}
