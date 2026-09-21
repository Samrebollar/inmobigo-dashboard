import { AlertCircle } from 'lucide-react'

export function NotLinkedState({ email }: { email?: string | null }) {
    return (
        <div className="flex h-[70vh] flex-col items-center justify-center p-10 text-center space-y-6">
            <div className="rounded-full bg-zinc-900 p-4 ring-1 ring-white/10">
                <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
            <div className="max-w-md space-y-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Cuenta no vinculada</h1>
                <p className="text-zinc-400">
                    Tu cuenta aún no está vinculada a ninguna unidad. Contacta al administrador de tu condominio para que te registre como residente.
                </p>
            </div>
            {email && (
                <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 text-sm text-zinc-500">
                    Tu correo: <span className="text-white font-medium">{email}</span>
                </div>
            )}
        </div>
    )
}
