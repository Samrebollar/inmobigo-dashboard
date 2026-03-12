'use client'

import { useState, useEffect } from 'react'
import { Menu, X, LogOut, Search, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface DashboardLayoutClientProps {
    children: React.ReactNode
    sidebarContent: React.ReactNode
    displayName: string
    avatarUrl?: string | null
    isDemoMode: boolean
    headerActions?: React.ReactNode
}

export function DashboardLayoutClient({
    children,
    sidebarContent,
    displayName,
    avatarUrl,
    isDemoMode,
    headerActions
}: DashboardLayoutClientProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const pathname = usePathname()

    // Close sidebar when route changes
    useEffect(() => {
        setIsSidebarOpen(false)
    }, [pathname])

    // Close sidebar on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsSidebarOpen(false)
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [])

    // Prevent scrolling when mobile sidebar is open
    useEffect(() => {
        if (isSidebarOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
    }, [isSidebarOpen])

    return (
        <div className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-xl flex-col">
                {sidebarContent}
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 z-50 w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col lg:hidden"
                        >
                            <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-6">
                                <Link href="/dashboard" className="text-lg font-bold tracking-tight text-white flex items-center gap-3">
                                    <img src="/logo-inmobigo.png" alt="InmobiGo Logo" className="h-12 w-auto object-contain" />
                                    <span>InmobiGo</span>
                                </Link>
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {sidebarContent}
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Header */}
                <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 md:px-6 backdrop-blur-xl sticky top-0 z-30 w-full">
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
                        >
                            <Menu size={24} />
                        </button>

                        <div className="hidden md:flex items-center gap-4 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 focus-within:border-indigo-500/50 focus-within:text-white transition-colors w-full max-w-md">
                            <Search size={16} />
                            {headerActions}
                        </div>

                        {/* Mobile Logo Visibility */}
                        <Link href="/dashboard" className="md:hidden flex items-center gap-2 lg:hidden">
                            <img src="/logo-inmobigo.png" alt="InmobiGo Logo" className="h-10 w-auto object-contain" />
                            <span className="font-bold text-sm tracking-tight text-white">InmobiGo</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-medium text-white truncate max-w-[120px]">
                                {displayName}
                            </div>
                        </div>
                        <Link href="/dashboard/perfil" className="flex-shrink-0">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="h-8 w-8 md:h-9 md:h-9 rounded-full object-cover border-2 border-zinc-800 hover:border-indigo-500 transition-colors"
                                />
                            ) : (
                                <div className="h-8 w-8 md:h-9 md:h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 cursor-pointer border-2 border-zinc-800 hover:border-indigo-500 transition-colors"></div>
                            )}
                        </Link>
                    </div>
                </header>

                <div className="flex-1 overflow-auto bg-zinc-950 relative">
                    {isDemoMode && (
                        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 md:px-6 py-3 flex items-center justify-between backdrop-blur-md sticky top-0 z-20">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                <p className="text-[10px] md:text-xs font-medium text-amber-200/80 truncate">
                                    <span className="font-bold text-amber-500 uppercase tracking-wider mr-2 hidden xs:inline">Modo Demo:</span>
                                    Estás previsualizando las funciones. Suscríbete para activar.
                                </p>
                            </div>
                            <Link
                                href="/dashboard/configuracion/planes"
                                className="text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-amber-500 text-black px-3 md:px-4 py-1.5 rounded hover:bg-amber-400 transition-colors flex-shrink-0"
                            >
                                Ver Planes
                            </Link>
                        </div>
                    )}
                    <div className="min-h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}

