'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
    Calculator, 
    ShieldCheck, 
    AlertCircle, 
    TrendingUp, 
    TrendingDown, 
    Zap,
    Info,
    HelpCircle,
    ArrowUpRight,
    ArrowDownRight,
    Scale,
    Brain,
    Building2
} from 'lucide-react'
import { FinancialRecord, FiscalRegime, REGIME_LABELS } from '@/types/accounting'
import { calculateMexicanTaxes } from '@/utils/mexican-tax-utils'
import { cn } from '@/lib/utils'

interface SatTaxProjectionProps {
    records: FinancialRecord[]
    regime: FiscalRegime
    condominiums?: { id: string, name: string, fiscal_regime?: string }[]
}

export function SatTaxProjection({ records, regime, condominiums = [] }: SatTaxProjectionProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleConfigureProperty = (id: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('condo', id)
        params.set('view', 'fiscal')
        router.push(`/dashboard/contabilidad-inteligente?${params.toString()}`)
    }

    const taxes = calculateMexicanTaxes(records, regime)
    
    // Compute per-property breakdown using individual regimes
    const propertyBreakdown = condominiums.map(condo => {
        const condoRecords = records.filter(r => r.condominium_id === condo.id);
        const condoRegime = (condo.fiscal_regime || null) as FiscalRegime;
        
        const condoTaxes = condoRegime ? calculateMexicanTaxes(condoRecords, condoRegime) : null;
        
        return {
            id: condo.id,
            name: condo.name,
            regime: condoRegime,
            income: condoTaxes?.grossIncome || 0,
            expenses: condoTaxes?.deductibleExpenses || 0,
            tax: condoTaxes ? (condoTaxes.ivaPayable + condoTaxes.isrEstimated) : 0,
            iva: condoTaxes?.ivaPayable || 0,
            isr: condoTaxes?.isrEstimated || 0,
            isConfigured: !!condoRegime
        };
    }).filter(p => p.income > 0 || p.expenses > 0 || !p.isConfigured).sort((a, b) => b.tax - a.tax);

    const formatCurrency = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const cards = [
        {
            title: "IVA por Pagar",
            amount: taxes.ivaPayable,
            description: taxes.ivaPayable === 0 
                ? "Totalmente compensado por egresos"
                : `IVA Trasladado minus Acreditable`,
            icon: Scale,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        },
        {
            title: "ISR Estimado",
            amount: taxes.isrEstimated,
            description: taxes.isExempt ? "No genera ISR (Cuotas sociales)" : "Proyección mensual SAT",
            icon: Calculator,
            color: taxes.isExempt ? "text-emerald-400" : "text-purple-400",
            bg: taxes.isExempt ? "bg-emerald-500/10" : "bg-purple-500/10",
            border: taxes.isExempt ? "border-emerald-500/20" : "border-purple-500/20"
        },
        {
            title: "Base Gravable",
            amount: taxes.taxableBase,
            description: taxes.taxableBase === 0 ? "Sin excedente gravable" : "Monto sujeto a impuestos",
            icon: ShieldCheck,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20"
        }
    ]

    const getIATip = () => {
        if (taxes.isExempt) {
            return "💡 IA Tip: Tu régimen de Condominio no lucrativo está exento de ISR en cuotas sociales. Asegúrate de que tus gastos operativos tengan CFDI para acreditar el IVA."
        }
        if (regime === 'arrendamiento') {
            return "💡 IA Tip: Se está aplicando la deducción ciega del 35%. Si tus gastos de mantenimiento reales superan este porcentaje, podrías reducir tu carga fiscal registrándolos detalladamente."
        }
        if (taxes.ivaPayable > 0 && records.filter(r => r.type === 'egreso').length === 0) {
            return "⚠️ Alerta SAT: No se han registrado egresos deducibles. Esto incrementará tu pago de IVA al 16% total sobre tus ingresos."
        }
        return "✨ Estado Fiscal: Tu flujo de efectivo actual mantiene una base gravable saludable. Recuerda realizar tus pagos provisionales antes del día 17."
    }

    return (
        <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-500/10 rounded-2xl text-orange-500 border border-orange-500/20">
                        <Zap size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">Proyección SAT</h3>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Estimación de impuestos en tiempo real</p>
                    </div>
                </div>
                <div className="hidden md:flex bg-zinc-900 border border-zinc-800 rounded-px p-1">
                    <div className="px-3 py-1.5 rounded-lg text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                        <Scale size={12} />
                        Régimen: {regime ? REGIME_LABELS[regime] : 'Pendiente de Configurar'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        className={cn(
                            "p-6 rounded-[2.5rem] border bg-white/[0.02] backdrop-blur-xl flex flex-col gap-4 relative overflow-hidden group transition-all",
                            card.border
                        )}
                    >
                        <div className={cn(
                            "absolute top-0 right-0 w-24 h-24 blur-[50px] opacity-10 -translate-y-1/2 translate-x-1/2 rounded-full",
                            card.bg
                        )} />
                        
                        <div className="flex justify-between items-start relative z-10">
                            <div className={cn("p-4 rounded-2xl", card.bg, card.color)}>
                                <card.icon size={24} />
                            </div>
                            <ArrowUpRight size={16} className={cn("opacity-0 group-hover:opacity-100 transition-opacity", card.color)} />
                        </div>

                        <div className="space-y-1 relative z-10">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{card.title}</p>
                            <h4 className={cn("text-3xl font-black tracking-tighter", card.color)}>
                                ${card.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h4>
                            <p className="text-[10px] text-zinc-500 font-bold">{card.description}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6"
            >
                <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 shrink-0">
                    <Brain size={28} />
                </div>
                <div className="space-y-2 flex-1 text-center md:text-left">
                    <p className="text-sm font-bold text-indigo-200/90 leading-relaxed italic">
                        {getIATip()}
                    </p>
                    <div className="flex items-center justify-center md:justify-start gap-4">
                         <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                            <TrendingUp size={10} />
                            Ingresos: ${formatCurrency(taxes.grossIncome)}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-rose-500 uppercase tracking-widest">
                            <TrendingDown size={10} />
                            Egresos: ${formatCurrency(taxes.deductibleExpenses)}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Property Breakdown Section */}
            {propertyBreakdown.length > 1 && (
                <div className="pt-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 px-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <h4 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Desglose por Propiedad</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                        {propertyBreakdown.map((item) => (
                            <div 
                                key={item.id}
                                className="group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-[2rem] bg-zinc-900/40 border border-zinc-800/50 hover:border-indigo-500/30 transition-all gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                        <Building2 size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white tracking-tight">{item.name}</p>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Impacto Fiscal Estimado</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-8 md:gap-12 px-2">
                                    {!item.isConfigured ? (
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                                                <AlertCircle size={12} />
                                                Pendiente
                                            </div>
                                            <button 
                                                onClick={() => handleConfigureProperty(item.id)}
                                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                                            >
                                                Configurar
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Régimen</p>
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                                    {REGIME_LABELS[item.regime!] || 'Cargando...'}
                                                </p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Ingresos</p>
                                                <p className="text-xs font-bold text-zinc-300">${item.income.toLocaleString()}</p>
                                            </div>
                                            <div className="hidden sm:block w-px h-6 bg-zinc-800" />
                                            <div className="space-y-0.5 text-right md:text-left">
                                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Total a Pagar</p>
                                                <p className="text-lg font-black text-indigo-400 leading-none">
                                                    ${item.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-[8px] text-zinc-600 font-bold whitespace-nowrap">IVA: ${item.iva.toLocaleString()} | ISR: ${item.isr.toLocaleString()}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

