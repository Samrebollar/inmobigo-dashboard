'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Package, 
    Home, 
    AlertTriangle, 
    CheckCircle2, 
    XCircle,
    Plus,
    Edit2,
    Trash2,
    Search,
    Filter,
    Camera,
    ClipboardList,
    MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { demoDb } from '@/utils/demo-db'
import { AddInventoryItemModal } from './add-inventory-item-modal'

interface InventoryItem {
    id: string
    name: string
    property_id: string
    property_name: string
    status: 'good' | 'fair' | 'damaged'
    notes?: string
    image_url?: string
    category?: string
}

export function InventoryAdmin({ admin }: { admin: any }) {
    const [items, setItems] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchInventory()
    }, [])

    const fetchInventory = () => {
        setLoading(true)
        const data = demoDb.getInventory()
        setItems(data)
        setLoading(false)
    }

    const handleDelete = (id: string) => {
        if (confirm('¿Deseas eliminar este artículo del inventario?')) {
            demoDb.deleteInventoryItem(id)
            setItems(prev => prev.filter(i => i.id !== id))
            toast.success('Artículo eliminado')
        }
    }

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'good':
                return { bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'Bueno' }
            case 'fair':
                return { bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Regular' }
            case 'damaged':
                return { bg: 'bg-rose-500/10 text-rose-500 border-rose-500/20', label: 'Dañado' }
            default:
                return { bg: 'bg-zinc-800 text-zinc-400 border-zinc-700', label: 'Desconocido' }
        }
    }

    const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.property_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-72 bg-zinc-900/40 border border-zinc-800 rounded-3xl animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
                        <ClipboardList size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Inventario de Propiedades</h2>
                        <p className="text-xs text-zinc-500 font-medium">Control de activos y estado físico de tus unidades.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar en inventario..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <Button 
                        onClick={() => {
                            setEditingItem(null)
                            setIsModalOpen(true)
                        }}
                        className="h-11 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-5 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                    >
                        <Plus size={18} />
                        <span>Agregar Item</span>
                    </Button>
                </div>
            </div>

            {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-zinc-800 rounded-[2.5rem] bg-zinc-900/20">
                    <Package size={48} className="text-zinc-800 mb-4" />
                    <h3 className="text-zinc-400 font-bold text-lg">Inventario vacío</h3>
                    <p className="text-zinc-600 text-sm mt-1">
                        {searchQuery ? 'No se encontraron resultados para tu búsqueda' : 'Registra los muebles y equipos de tus propiedades'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredItems.map((item) => {
                            const styles = getStatusStyles(item.status)
                            return (
                                <motion.div
                                    layout
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="group relative h-full"
                                >
                                    <div className="relative z-10 bg-zinc-900/40 border border-zinc-800 hover:border-emerald-500/30 rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col transition-all duration-300">
                                        <div className="relative h-44 bg-black/40 flex items-center justify-center overflow-hidden">
                                            {item.image_url ? (
                                                <img 
                                                    src={item.image_url} 
                                                    alt={item.name} 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="text-zinc-800 group-hover:text-zinc-700 transition-colors">
                                                    <Package size={64} strokeWidth={1} />
                                                </div>
                                            )}
                                            <div className="absolute top-3 right-3 flex gap-2">
                                                <button 
                                                    onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                                    className="h-8 w-8 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-colors"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(item.id)}
                                                    className="h-8 w-8 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-300 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="absolute bottom-3 left-3">
                                                <div className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest ${styles.bg} backdrop-blur-md`}>
                                                    {styles.label}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="mb-4">
                                                <h4 className="text-lg font-bold text-white leading-tight mb-1">{item.name}</h4>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                    <Home size={10} className="text-zinc-600" />
                                                    {item.property_name}
                                                </p>
                                            </div>

                                            <div className="flex-1 flex flex-col justify-end">
                                                <div className="flex items-center gap-1.5 mb-2 mt-2">
                                                    <div className={`w-2 h-2 rounded-full ${item.status === 'good' ? 'bg-emerald-500' : item.status === 'fair' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                                                        ESTADO DE EQUIPO: {styles.label}
                                                    </span>
                                                </div>
                                                {item.notes && (
                                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 relative mt-2">
                                                        <p className="text-[11px] text-zinc-300 font-medium italic leading-relaxed line-clamp-3">
                                                            "{item.notes}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

            <AddInventoryItemModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchInventory}
                editingItem={editingItem}
            />
        </div>
    )
}

