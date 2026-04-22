import { FinancialRecord, FiscalRegime } from '@/types/accounting';

export interface TaxCalculationResults {
    grossIncome: number;
    deductibleExpenses: number;
    ivaTrasladado: number;
    ivaAcreditable: number;
    ivaPayable: number;
    taxableBase: number;
    isrEstimated: number;
    utilidadFiscal: number;
    retencionesIVA?: number;
    isExempt: boolean;
}

export function calculateMexicanTaxes(
    records: FinancialRecord[], 
    regime: FiscalRegime
): TaxCalculationResults {
    // Solo consideramos registros 'pagados' para flujo de efectivo (Estándar SAT para P.F. y Condominios)
    // El usuario prefiere mantener solo lo cobrado (Pagados)
    const activeRecords = records.filter(r => r.status === 'pagado'); 
    
    const grossIncome = activeRecords
        .filter(r => r.type === 'ingreso')
        .reduce((sum, r) => sum + Number(r.amount), 0);
        
    const deductibleExpenses = activeRecords
        .filter(r => r.type === 'egreso')
        .reduce((sum, r) => sum + Number(r.amount), 0);

    const ivaTrasladado = grossIncome * 0.16;
    
    // IVA Acreditable: Use real data from CFDI/Manual if exists, else estimate
    const ivaAcreditable = activeRecords
        .filter(r => r.type === 'egreso')
        .reduce((sum, r) => sum + (Number(r.iva_amount) || (Number(r.amount) * 0.16)), 0);

    const ivaPayable = Math.max(0, ivaTrasladado - ivaAcreditable);
    
    let isrEstimated = 0;
    let taxableBase = 0;
    let utilidadFiscal = grossIncome - deductibleExpenses;
    let isExempt = false;

    switch (regime) {
        case 'condominio_no_lucrativo':
            // El usuario solicitó calcular la base gravable de los ingresos (Pregunta 1: No a simple Ingresos-Egresos, 
            // implicando que quiere ver el impacto sobre ingresos o remanente)
            // Mostramos utilidad fiscal como base informativa
            taxableBase = Math.max(0, grossIncome - deductibleExpenses);
            // Tasa informativa del 30% para PM No Lucrativas sobre remanente ficto/excedente
            isrEstimated = taxableBase * 0.30;
            isExempt = true; // Sigue siendo exento en cuotas, pero mostramos proyección
            break;
            
        case 'arrendamiento':
            // Aplicamos Deducción Ciega (35% fijo) como estimación profesional
            const deduccionCiega = grossIncome * 0.35;
            taxableBase = grossIncome - deduccionCiega;
            // Tasa progresiva simplificada (aprox 20% para una base media)
            isrEstimated = taxableBase * 0.20;
            break;
            
        case 'actividad_empresarial':
            taxableBase = Math.max(0, grossIncome - deductibleExpenses);
            // Tasa estándar PM 30% como punto de partida profesional
            isrEstimated = taxableBase * 0.30;
            break;
            
        default:
            isrEstimated = 0;
            taxableBase = 0;
    }

    return {
        grossIncome,
        deductibleExpenses,
        ivaTrasladado,
        ivaAcreditable,
        ivaPayable,
        taxableBase,
        isrEstimated,
        utilidadFiscal,
        isExempt
    };
}
