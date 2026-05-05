'use client'

import { useState, useEffect } from 'react'
import { Menu, X, LogOut, Search, AlertTriangle, CreditCard, Clock } from 'lucide-react'
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
    subscriptionInfo?: {
        planName: string
        daysRemaining: number
        nextPaymentDate: string
    } | null
    headerActions?: React.ReactNode
}

export function DashboardLayoutClient({
    children,
    sidebarContent,
    displayName,
    avatarUrl,
    isDemoMode,
    subscriptionInfo,
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
        document.body.removeAttribute('data-scroll-locked')
        document.body.style.pointerEvents = 'auto'
        
        if (isSidebarOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        
        return () => {
            document.body.style.overflow = ''
            document.body.style.pointerEvents = 'auto'
        }
    }, [isSidebarOpen])

    return (
        <div className="flex h-screen w-full bg-black text-white overflow-hidden pointer-events-auto">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-zinc-900 bg-black flex-col">
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
                            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 z-50 w-72 bg-black border-r border-zinc-900 flex flex-col lg:hidden"
                        >
                            <div className="flex h-16 items-center justify-between border-b border-zinc-900 px-6">
                                <Link href="/seguridad" className="text-lg font-bold tracking-tight text-white flex items-center gap-3">
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
                <header className="flex h-16 items-center justify-between border-b border-zinc-900 bg-black px-4 md:px-6 sticky top-0 z-30 w-full">
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
                        >
                            <Menu size={24} />
                        </button>

                        <div className="hidden md:flex items-center gap-4 bg-zinc-900/30 px-3 py-1.5 rounded-lg border border-zinc-900 text-zinc-400 focus-within:border-indigo-500/50 focus-within:text-white transition-colors w-full max-w-md">
                            <Search size={16} />
                            {headerActions}
                        </div>

                        {/* Mobile Logo Visibility */}
                        <Link href="/seguridad" className="md:hidden flex items-center gap-2 lg:hidden">
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
                        <Link href="/seguridad/perfil" className="flex-shrink-0">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="h-8 w-8 md:h-9 md:h-9 rounded-full object-cover border-2 border-zinc-900 hover:border-indigo-500 transition-colors"
                                />
                            ) : (
                                <div className="h-8 w-8 md:h-9 md:h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 cursor-pointer border-2 border-zinc-900 hover:border-indigo-500 transition-colors"></div>
                            )}
                        </Link>
                    </div>
                </header>

                <div className="flex-1 overflow-auto bg-black relative">
                    <div className="min-h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}

