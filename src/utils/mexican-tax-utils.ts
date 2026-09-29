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
    
    // Los montos se registran tal como se cobran/pagan (IVA incluido cuando aplica).
    const cobrado = activeRecords
        .filter(r => r.type === 'ingreso')
        .reduce((sum, r) => sum + Number(r.amount), 0);

    const egresos = activeRecords.filter(r => r.type === 'egreso');
    // IVA acreditable: solo el capturado del comprobante (CFDI). Antes se
    // estimaba 16% sobre el total del gasto cuando no había dato, lo que
    // inflaba el IVA acreditable (y el 16% sobre un monto que ya lo incluye).
    const ivaAcreditableRegistrado = egresos.reduce((sum, r) => sum + (Number(r.iva_amount) || 0), 0);
    const egresosTotales = egresos.reduce((sum, r) => sum + Number(r.amount), 0);

    let grossIncome = cobrado;
    let deductibleExpenses = egresosTotales;
    let ivaTrasladado = 0;
    let ivaAcreditable = 0;
    let isrEstimated = 0;
    let taxableBase = 0;
    let isExempt = false;

    switch (regime) {
        case 'condominio_no_lucrativo':
            // Las cuotas de mantenimiento de un condominio habitacional no causan
            // IVA ni ISR para la asociación (persona moral con fines no lucrativos):
            // no hay IVA trasladado ni base gravable. Antes se mostraba 16% de IVA
            // y 30% de "ISR" sobre las cuotas como "Total a Pagar".
            isExempt = true;
            break;

        case 'arrendamiento':
            // Ingreso neto de IVA (se asume que lo cobrado incluye IVA al 16%).
            grossIncome = cobrado / 1.16;
            ivaTrasladado = cobrado - grossIncome;
            ivaAcreditable = ivaAcreditableRegistrado;
            deductibleExpenses = egresosTotales - ivaAcreditableRegistrado;
            // Deducción ciega (35% del ingreso) como estimación profesional
            taxableBase = grossIncome * 0.65;
            // Tasa progresiva simplificada (aprox 20% para una base media)
            isrEstimated = taxableBase * 0.20;
            break;

        case 'actividad_empresarial':
            grossIncome = cobrado / 1.16;
            ivaTrasladado = cobrado - grossIncome;
            ivaAcreditable = ivaAcreditableRegistrado;
            deductibleExpenses = egresosTotales - ivaAcreditableRegistrado;
            taxableBase = Math.max(0, grossIncome - deductibleExpenses);
            // Tasa estándar PM 30% como punto de partida profesional
            isrEstimated = taxableBase * 0.30;
            break;

        default:
            break;
    }

    const ivaPayable = Math.max(0, ivaTrasladado - ivaAcreditable);
    const utilidadFiscal = grossIncome - deductibleExpenses;

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
