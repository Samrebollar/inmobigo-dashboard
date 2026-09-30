import { Skeleton } from '@/components/ui/skeleton'

/**
 * Esqueleto que se muestra al instante al abrir un módulo, mientras el
 * servidor termina de cargar sus datos (evita que el clic "no haga nada").
 */
export function ModuleLoading() {
    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6" aria-busy="true" aria-label="Cargando">
            <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <div className="space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                {[0, 1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
            </div>
            <Skeleton className="h-12 rounded-2xl" />
            <div className="space-y-3">
                {[0, 1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
            </div>
        </div>
    )
}
