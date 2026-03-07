'use client'

import { useEffect, useState } from 'react'
import { RegisterForm } from './components/register-form'
import { MarketingShowcase } from '../login/components/marketing-showcase'

export default function RegisterPage() {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) return null

    return (
        <div className="relative flex min-h-screen w-full overflow-hidden bg-[#0F172A] selection:bg-indigo-500/30">
            {/* Global Premium Background Grains & Gradients */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(79,70,229,0.15)_0%,transparent_50%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.15)_0%,transparent_50%)]" />
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />
            </div>

            {/* Main Container Grid - 50/50 Split */}
            <div className="relative z-10 grid w-full lg:grid-cols-2 min-h-screen">

                {/* Left: Marketing Showcase (Reused from Login) */}
                {/* Hidden on mobile, visible on LG+ */}
                <div className="hidden h-full flex-col justify-center lg:flex relative overflow-hidden bg-[#0B1221]">
                    <MarketingShowcase variant="register" />
                </div>

                {/* Right: Register Form */}
                <div className="flex h-full flex-col items-center justify-center p-8 sm:p-12 lg:p-24 relative z-20 border-l border-white/5 bg-[#111827]">
                    <div className="w-full max-w-sm space-y-8">
                        <RegisterForm />
                    </div>
                </div>

            </div>
        </div>
    )
}
