import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingContent } from './components/onboarding-content'

export default async function OnboardingPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    // Fetch user profile to check for user_type
    const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .maybeSingle()

    // Check if already has org AND user_type
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    // Solo redirigir al dashboard si tiene AMBAS cosas. 
    // Si falta el user_type, debe quedarse en onboarding para definirlo.
    if (orgUser && profile?.user_type) {
        return redirect('/dashboard')
    }

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#0F172A] selection:bg-indigo-500/30 flex flex-col items-center justify-center p-4">
            {/* Global Premium Background Grains & Gradients */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(79,70,229,0.15)_0%,transparent_50%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.15)_0%,transparent_50%)]" />
                
                {/* Aurora Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 blur-[120px] rounded-full animate-aurora-1" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full animate-aurora-2" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-500/10 blur-[100px] rounded-full animate-aurora-3" />

                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />
            </div>

            <div className="relative z-10 w-full max-w-4xl space-y-8">
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <img src="/inmobigo-logo.png" alt="InmobiGo Logo" className="h-14 w-14 rounded-2xl shadow-lg shadow-indigo-500/20 object-contain" />
                        <span className="text-3xl font-bold tracking-tight text-white italic">InmobiGo</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-white mb-2">Bienvenido a la nueva era</h1>
                    <p className="text-zinc-400 text-lg max-w-lg mx-auto">
                        Configura tu entorno de trabajo profesional en pocos pasos.
                    </p>
                </div>

                <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
                    <OnboardingContent userId={user.id} initialUserType={profile?.user_type as any} />
                </div>
            </div>
        </div>
    )
}
