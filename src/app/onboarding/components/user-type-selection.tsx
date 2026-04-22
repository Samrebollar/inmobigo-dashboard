'use client'

import { useState } from 'react'
import { Building2, Home, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

interface UserTypeSelectionProps {
    onSelect: (type: 'admin_condominio' | 'admin_propiedades') => void
    loading?: boolean
}

export function UserTypeSelection({ onSelect, loading }: UserTypeSelectionProps) {
    const [selected, setSelected] = useState<'admin_condominio' | 'admin_propiedades' | null>(null)
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)

    const handleCardClick = (type: 'admin_condominio' | 'admin_propiedades') => {
        setSelected(type)
        setIsConfirmOpen(true)
    }

    const handleConfirm = () => {
        if (selected) {
            onSelect(selected)
            setIsConfirmOpen(false)
        }
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                    onClick={() => handleCardClick('admin_condominio')}
                    className={cn(
                        "relative flex flex-col items-center text-center p-8 rounded-3xl border transition-all duration-500 group saas-card-glow animate-fade-in-up",
                        selected === 'admin_condominio'
                            ? "bg-indigo-500/10 border-indigo-500 shadow-[0_0_30px_-5px_rgba(79,70,229,0.3)] scale-[1.02]"
                            : "bg-white/[0.02] border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/[0.04] hover:scale-[1.02] hover:shadow-[0_0_20px_-5px_rgba(79,70,229,0.2)]"
                    )}
                >
                    <div className={cn(
                        "h-16 w-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 animate-float",
                        selected === 'admin_condominio' ? "bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]" : "bg-white/5 text-zinc-400 group-hover:text-zinc-200"
                    )}>
                        <Building2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">Administrador de Condominios</h3>
                    <p className="text-sm text-zinc-400">Gestiona residentes, accesos, cuotas y mantenimiento de forma integral.</p>
                </button>

                <button
                    onClick={() => handleCardClick('admin_propiedades')}
                    className={cn(
                        "relative flex flex-col items-center text-center p-8 rounded-3xl border transition-all duration-500 group saas-card-glow animate-fade-in-up",
                        selected === 'admin_propiedades'
                            ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] scale-[1.02]"
                            : "bg-white/[0.02] border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/[0.04] hover:scale-[1.02] hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]"
                    )}
                    style={{ animationDelay: '150ms' }}
                >
                    <div className={cn(
                        "h-16 w-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 animate-float",
                        selected === 'admin_propiedades' ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]" : "bg-white/5 text-zinc-400 group-hover:text-zinc-200"
                    )}>
                        <Home size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">Administrador de Propiedades</h3>
                    <p className="text-sm text-zinc-400">Administra rentas, inquilinos y múltiples carteras de propiedades.</p>
                </button>
            </div>

            {/* Confirmation Modal */}
            <Modal 
                isOpen={isConfirmOpen} 
                onClose={() => !loading && setIsConfirmOpen(false)} 
                title="¿Confirmar Selección?"
            >
                <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <div className="p-2 rounded-full bg-amber-500/20 text-amber-500 mt-1">
                            <AlertTriangle size={20} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-white">Acción Irreversible</p>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Una vez seleccionado el tipo de administrador, los módulos del sistema se configurarán permanentemente. **No podrás deshacer este cambio después.**
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-zinc-500 mb-1">Has seleccionado:</p>
                        <p className={cn(
                            "text-base font-bold",
                            selected === 'admin_condominio' ? "text-indigo-400" : "text-emerald-400"
                        )}>
                            {selected === 'admin_condominio' ? "Administrador de Condominios" : "Administrador de Propiedades"}
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button 
                            variant="secondary" 
                            className="flex-1 border-white/5 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                            onClick={() => setIsConfirmOpen(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            className={cn(
                                "flex-1 text-white shadow-lg",
                                selected === 'admin_condominio' ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                            )}
                            onClick={handleConfirm}
                            disabled={loading}
                        >
                            {loading ? "Configurando..." : "Sí, estoy seguro"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
