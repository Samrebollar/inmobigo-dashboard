import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CreateOrgForm } from './components/create-org-form'

export default async function OnboardingPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    // Check if already has org
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

    if (orgUser) {
        return redirect('/dashboard')
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-zinc-950 text-white">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight">Bienvenido a InmobiGo</h1>
                    <p className="text-zinc-400 mt-2">
                        Para comenzar, crea tu primera organización o condominio.
                    </p>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-xl">
                    <CreateOrgForm userId={user.id} />
                </div>
            </div>
        </div>
    )
}
