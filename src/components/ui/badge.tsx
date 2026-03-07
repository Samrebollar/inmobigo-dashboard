import React from 'react'

import { cn } from "@/lib/utils"

export function Badge({ children, variant = 'default', className }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary'; className?: string }) {
    const variants = {
        default: 'bg-zinc-800 text-zinc-300',
        success: 'bg-emerald-950/50 text-emerald-400 border border-emerald-900',
        warning: 'bg-amber-950/50 text-amber-400 border border-amber-900',
        destructive: 'bg-red-950/50 text-red-400 border border-red-900',
        outline: 'border border-zinc-700 text-zinc-300 bg-transparent',
        secondary: 'bg-zinc-800 text-zinc-100',
    }

    return (
        <span className={cn(`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`, className)}>
            {children}
        </span>
    )
}
