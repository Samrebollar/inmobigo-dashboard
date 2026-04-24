'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function VerifyBridgeContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const code = searchParams.get('code')
        const token_hash = searchParams.get('token_hash')
        const type = searchParams.get('type')

        const timer = setTimeout(() => {
            let target = '/reset-password'
            if (code) target += `?code=${code}`
            else if (token_hash) target += `?token_hash=${token_hash}&type=${type}`
            
            router.push(target)
        }, 1500)

        return () => clearTimeout(timer)
    }, [router, searchParams])

    return (
        <div className="space-y-6 text-center animate-pulse">
            <div className="flex justify-center">
                <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
            </div>
            <div className="space-y-2">
                <h1 className="text-white font-bold text-xl uppercase tracking-widest opacity-50">Verificando Seguridad</h1>
                <p className="text-zinc-400 text-sm">Validando tu identidad para acceso móvil...</p>
            </div>
        </div>
    )
}

export default function VerifyBridgePage() {
    return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4">
            <Suspense fallback={<Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />}>
                <VerifyBridgeContent />
            </Suspense>
            <div className="hidden">Confirm user identity for mobile access handshake</div>
        </div>
    )
}
