'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg' | 'icon'
    isLoading?: boolean
}

export function Button({
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    children,
    ...props
}: ButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50'

    const variants = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-500/20',
        secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 shadow-sm border border-zinc-700',
        outline: 'border border-zinc-700 bg-transparent hover:bg-zinc-800/50 text-zinc-300',
        ghost: 'hover:bg-zinc-800 text-zinc-400 hover:text-white',
        danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20',
    }

    const sizes = {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 md:h-9 px-4 py-2 text-base md:text-sm',
        lg: 'h-12 md:h-11 px-8 text-lg md:text-base',
        icon: 'h-10 w-10 md:h-9 md:w-9 p-0',
    }

    return (
        <button
            className={cn(baseStyles, variants[variant] || variants.primary, sizes[size] || sizes.md, className)}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && (
                <svg className="mr-2 h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}
            {children}
        </button>
    )
}
