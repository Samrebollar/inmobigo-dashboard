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
    onInvite: (email: string, role: Role) => Promise<void>
}

const ROLES: { value: Role; label: string; description: string }[] = [
    { value: 'admin_propiedad', label: 'Admin. Propiedad / Dueño', description: 'Acceso total a la organización, finanzas y gestión de todo el equipo.' },
    { value: 'admin_condominio', label: 'Admin. de Condominio', description: 'Gestión total de un condominio específico, residentes y reportes.' },
    { value: 'accountant', label: 'Contador', description: 'Gestión exclusiva de finanzas (facturas, pagos) y reportes financieros.' },
    { value: 'security', label: 'Seguridad / Vigilante', description: 'Control de accesos y avisos. Sin acceso a datos sensibles o finanzas.' },
    { value: 'staff', label: 'Staff / Conserje', description: 'Gestión operativa básica de mantenimiento y áreas comunes.' },
    { value: 'viewer', label: 'Solo Lectura', description: 'Acceso de consulta para supervisores o auditores.' },
]

export function InviteUserModal({ isOpen, onClose, onInvite }: InviteUserModalProps) {
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<Role>('staff')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onInvite(email, role)
            setEmail('')
            setRole('staff')
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
                        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-800 p-6 bg-zinc-900/50">
                            <h2 className="text-xl font-bold text-white">Invitar Miembro</h2>
                            <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Correo Electrónico</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <Input
                                        placeholder="colaborador@empresa.com"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoFocus
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-zinc-400">Rol Asignado</label>
                                <div className="grid gap-3">
                                    {ROLES.map((r) => (
                                        <button
                                            key={r.value}
                                            type="button"
                                            onClick={() => setRole(r.value)}
                                            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${role === r.value
                                                ? 'border-indigo-500 bg-indigo-500/10'
                                                : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800'
                                                }`}
                                        >
                                            <div className={`mt-0.5 rounded-full p-1 ${role === r.value ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                                <Shield className="h-3 w-3" />
                                            </div>
                                            <div>
                                                <p className={`font-medium ${role === r.value ? 'text-indigo-400' : 'text-zinc-300'}`}>
                                                    {r.label}
                                                </p>
                                                <p className="text-xs text-zinc-500">{r.description}</p>
                                            </div>
                                            {role === r.value && <Check className="ml-auto h-4 w-4 text-indigo-500" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button type="submit" isLoading={loading} disabled={!email} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500 text-white">
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
