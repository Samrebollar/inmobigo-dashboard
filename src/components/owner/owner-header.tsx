'use client'

import { Search, Bell, Menu, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function OwnerHeader() {
    return (
        <header className="h-20 bg-zinc-950/50 border-b border-zinc-900/50 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-40">
            {/* Search Bar - Stripe Style */}
            <div className="flex-1 max-w-xl">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar clientes, pagos o analíticas..." 
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-2.5 pl-12 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-[10px] font-mono text-zinc-500">⌘</kbd>
                        <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-[10px] font-mono text-zinc-500">K</kbd>
                    </div>
                </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-6">
                {/* Platform Name Badge */}
                <Badge variant="outline" className="hidden md:flex border-indigo-500/30 text-indigo-400 bg-indigo-500/5 px-3 py-1 rounded-full font-bold tracking-tight text-[10px] uppercase">
                    InmobiGo V1.4.2 (Stable)
                </Badge>

                {/* Notifications */}
                <button className="relative p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all group">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-500 border-2 border-zinc-950 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                </button>

                {/* Vertical Divider */}
                <div className="h-6 w-px bg-zinc-800" />

                {/* Profile Toggle */}
                <button className="flex items-center gap-3 p-1.5 hover:bg-zinc-800/50 rounded-2xl transition-all group">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/10 border border-white/10 group-hover:scale-105 transition-transform">
                        OA
                    </div>
                    <div className="hidden lg:flex flex-col text-left">
                        <span className="text-sm font-bold text-white tracking-tight">Owner Admin</span>
                        <span className="text-[10px] font-medium text-emerald-400 leading-none">Status: Online</span>
                    </div>
                    <ChevronDown size={14} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                </button>
            </div>
        </header>
    )
}
