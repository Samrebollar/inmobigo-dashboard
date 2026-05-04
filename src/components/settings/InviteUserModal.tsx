'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Shield, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Role } from '@/types/auth'

interface InviteUserModalProps {
    isOpen: boolean
    onClose: () => void
    onInvite: (fullName: string, email: string, role: Role) => Promise<void>
}

const ROLES: { value: Role; label: string; description: string }[] = [
    { value: 'admin_condominio', label: 'Auxiliar de Condominio', description: 'Gestión total de un condominio específico, residentes y reportes.' },
    { value: 'security', label: 'Seguridad/Vigilante', description: 'Control de accesos y avisos. Sin acceso a datos sensibles o finanzas.' },
]

export function InviteUserModal({ isOpen, onClose, onInvite }: InviteUserModalProps) {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<Role>('admin_condominio')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onInvite(fullName, email, role)
            setFullName('')
            setEmail('')
            setRole('admin_condominio')
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900 shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-800 p-8 bg-zinc-900/50">
                            <h2 className="text-2xl font-black text-white italic tracking-tight">Invitar Miembro</h2>
                            <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nombre y Apellido</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors">
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        <Input
                                            placeholder="Ej. Juan Pérez"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            required
                                            autoFocus
                                            className="h-14 pl-12 bg-zinc-950/50 border-zinc-800 rounded-2xl focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Correo Electrónico</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-indigo-500 transition-colors">
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <Input
                                            placeholder="colaborador@empresa.com"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="h-14 pl-12 bg-zinc-950/50 border-zinc-800 rounded-2xl focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Rol Asignado</label>
                                <div className="grid gap-3">
                                    {ROLES.map((r) => (
                                        <button
                                            key={r.value}
                                            type="button"
                                            onClick={() => setRole(r.value)}
                                            className={`group flex items-start gap-4 rounded-2xl border p-4 text-left transition-all ${role === r.value
                                                ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(79,70,229,0.1)]'
                                                : 'border-zinc-800 bg-zinc-950/30 hover:bg-zinc-800/50'
                                                }`}
                                        >
                                            <div className={`mt-0.5 rounded-xl p-2 transition-colors ${role === r.value ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'}`}>
                                                <Shield className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1">
                                                <p className={`font-black text-sm uppercase tracking-tight ${role === r.value ? 'text-indigo-400' : 'text-zinc-300'}`}>
                                                    {r.label}
                                                </p>
                                                <p className="text-xs text-zinc-500 font-medium leading-relaxed mt-1">{r.description}</p>
                                            </div>
                                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${role === r.value ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-800'}`}>
                                                {role === r.value && <Check className="h-3 w-3 text-white stroke-[4]" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button 
                                    type="submit" 
                                    isLoading={loading} 
                                    disabled={!email || !fullName} 
                                    className="h-16 w-full gap-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Mail className="h-4 w-4" /> Enviar Invitación
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
