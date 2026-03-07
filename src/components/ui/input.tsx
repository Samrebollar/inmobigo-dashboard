'use client'

import React from 'react'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }) {
    const { label, error, className, ...rest } = props

    return (
        <div className="w-full">
            {label && <label className="mb-2 block text-sm font-medium text-zinc-400">{label}</label>}
            <input
                className={`w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 ${error ? 'border-red-900 focus:border-red-500 focus:ring-red-500' : ''
                    } ${className}`}
                {...rest}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    )
}
