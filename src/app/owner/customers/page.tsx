'use client'

import { motion } from 'framer-motion'
import { 
    Search, 
    Filter, 
    Plus, 
    MoreHorizontal, 
    Mail, 
    Phone, 
    Building2, 
    ArrowUpRight,
    ArrowDownRight,
    BadgeCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const customers = [
    { 
        id: '1',
        name: 'Condominio Altavista', 
        admin: 'Mauricio Gómez',
        email: 'mauricio@altavista.com',
        phone: '+52 555-0123',
        plan: 'Elite', 
        units: 120, 
        revenue: '$450.00', 
        growth: '+15%',
        status: 'active',
        joined: '12 Ene 2024'
    },
    { 
        id: '2',
        name: 'Torre Residencial X', 
        admin: 'Lucía Fernández',
        email: 'l.fernandez@trx.com',
        phone: '+52 555-0124',
        plan: 'Plus', 
        units: 85, 
        revenue: '$250.00', 
        growth: '+5%',
        status: 'active',
        joined: '05 Feb 2024'
    },
    { 
        id: '3',
        name: 'Fraccionamiento Arcos', 
        admin: 'Roberto S.',
        email: 'r.sanchez@arcos.mx',
        phone: '+52 555-0125',
        plan: 'Core', 
        units: 45, 
        revenue: '$120.00', 
        growth: '+0%',
        status: 'pending',
        joined: '18 Feb 2024'
    },
    { 
        id: '4',
        name: 'Plaza Central Apts', 
        admin: 'Elena Rivas',
        email: 'elena.r@plazacentral.com',
        phone: '+52 555-0126',
        plan: 'Elite', 
        units: 200, 
        revenue: '$680.00', 
        growth: '+22%',
        status: 'active',
        joined: '20 Nov 2023'
    },
]

export default function CustomersPage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Gestión de Clientes</h1>
                    <p className="text-zinc-500 font-medium">Administra todos los condominios registrados en InmobiGo.</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold py-6 px-8 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
                    <Plus size={20} />
                    Alta de Cliente
                </Button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-zinc-900/50 p-4 rounded-[2rem] border border-zinc-800">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <Input 
                        placeholder="Buscar por nombre, admin o email..." 
                        className="bg-zinc-950/50 border-zinc-800 rounded-2xl pl-12 py-6 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500/50 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white rounded-2xl p-6 font-bold flex items-center gap-2">
                        <Filter size={18} />
                        Filtros
                    </Button>
                    <Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/5 text-indigo-400 font-bold px-4 py-2 rounded-xl">
                        {customers.length} Clientes
                    </Badge>
                </div>
            </div>

            {/* Customers Grid/Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-950/30 border-b border-zinc-800/50">
                                <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Condominio</th>
                                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Admin</th>
                                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Plan</th>
                                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Unidades</th>
                                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Ingreso / Crecimiento</th>
                                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Estado</th>
                                <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((customer, i) => (
                                <motion.tr 
                                    key={customer.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-all group"
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center border border-indigo-500/10 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight text-sm">
                                                    {customer.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">ID: {customer.id}</span>
                                                    <BadgeCheck size={12} className="text-indigo-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-sm font-bold text-zinc-200">{customer.admin}</span>
                                            <span className="text-[10px] font-medium text-zinc-500">{customer.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-indigo-600 hover:text-white transition-colors py-1 px-3 rounded-lg font-black text-[10px] tracking-widest uppercase">
                                            {customer.plan}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className="text-sm font-black text-zinc-100">{customer.units}</span>
                                        <span className="text-[10px] text-zinc-500 block">unid.</span>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-sm font-black text-white">{customer.revenue}</span>
                                            <div className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                                                <ArrowUpRight size={10} />
                                                {customer.growth}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <div className="flex justify-center">
                                            <div className={`
                                                flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-[10px] font-black uppercase tracking-wider
                                                ${customer.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}
                                            `}>
                                                <div className={`h-1.5 w-1.5 rounded-full ${customer.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                                {customer.status}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-all">
                                                <Mail size={18} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-all">
                                                <MoreHorizontal size={18} />
                                            </Button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-8 bg-zinc-950/20 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800/50">
                    <p className="text-[11px] text-zinc-600 font-black uppercase tracking-widest">Mostrando registros del 1 al {customers.length}</p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white rounded-xl px-6 font-black text-[10px] uppercase tracking-widest transition-all">
                            Anterior
                        </Button>
                        {[1, 2, 3].map(p => (
                            <button key={p} className={`h-8 w-8 rounded-lg text-[10px] font-black transition-all ${p === 1 ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white'}`}>
                                {p}
                            </button>
                        ))}
                        <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white rounded-xl px-6 font-black text-[10px] uppercase tracking-widest transition-all">
                            Siguiente
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
