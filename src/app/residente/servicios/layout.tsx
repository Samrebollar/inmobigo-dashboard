import { DelinquencyGuard } from '@/components/residente/delinquency-guard'

export const dynamic = 'force-dynamic'

export default function ResidenteServiciosLayout({ children }: { children: React.ReactNode }) {
    return <DelinquencyGuard section="Servicios bloqueados">{children}</DelinquencyGuard>
}
