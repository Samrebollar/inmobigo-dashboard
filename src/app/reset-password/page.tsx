import ResetPasswordClient from './ResetPasswordClient'

export default async function ResetPasswordPage() {
    // ELIMINAMOS la validación de servidor aquí.
    // Dejamos que el componente CLIENTE haga todo el trabajo pesado.
    // Esto evita que el móvil muestre "Enlace inválido" antes de tiempo.
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0F172A]">
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.15)_0%,transparent_50%)]" />
            </div>
            <ResetPasswordClient />
        </div>
    )
}
