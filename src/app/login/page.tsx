'use client'

import { useEffect, useState } from 'react'
import { LoginForm } from './components/login-form'
import { MarketingShowcase } from './components/marketing-showcase'

export default function LoginPage() {
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

        {/* Left: Login Form */}
        <div className="flex h-full flex-col items-center justify-center p-8 sm:p-12 lg:p-24 relative z-20 border-r border-white/5">

          {/* Form Container with Glass Effect if requested, or clean */}
          <div className="w-full max-w-sm space-y-8">
            <LoginForm />
          </div>
        </div>

        {/* Right: Marketing Showcase */}
        {/* Hidden on mobile, visible on LG+ */}
        <div className="hidden h-full flex-col justify-center lg:flex relative overflow-hidden">
          <MarketingShowcase />
        </div>

      </div>
    </div>
  )
}