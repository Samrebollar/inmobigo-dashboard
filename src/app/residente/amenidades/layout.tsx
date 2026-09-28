import { DelinquencyGuard } from '@/components/residente/delinquency-guard'

export const dynamic = 'force-dynamic'

export default function ResidenteAmenidadesLayout({ children }: { children: React.ReactNode }) {
    return <DelinquencyGuard section="Amenidades bloqueadas">{children}</DelinquencyGuard>
}
