export type FiscalRegime = 'condominio_no_lucrativo' | 'arrendamiento' | 'actividad_empresarial' | null;

export type PaymentStatus = 'pendiente' | 'pagado' | 'vencido';

export interface FinancialRecord {
    id: string;
    organization_id: string;
    user_id: string;
    type: 'ingreso' | 'egreso';
    amount: number;
    category: string;
    fiscal_category?: string;
    description: string;
    date: string;
    status: PaymentStatus;
    unit_id?: string;
    es_recurrente?: boolean;
    frecuencia?: 'mensual' | 'semanal';
    dia_corte?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
    created_at: string;
    receipt_url?: string;
    iva_amount?: number;
}

export type CategoryMap = Record<string, { ingresos: string[], egresos: string[] }>;

export const REGIME_CATEGORIES: CategoryMap = {
    'condominio_no_lucrativo': {
        ingresos: ['Cuotas de mantenimiento', 'Recargos', 'Otros ingresos'],
        egresos: ['Limpieza', 'Jardinería', 'Mantenimiento', 'Seguridad', 'Servicios (agua, luz)', 'Administración']
    },
    'arrendamiento': {
        ingresos: ['Rentas', 'Otros ingresos'],
        egresos: ['Mantenimiento', 'Servicios', 'Administración', 'Honorarios', 'Impuestos', 'Otros gastos']
    },
    'actividad_empresarial': {
        ingresos: ['Ventas/Servicios', 'Otros ingresos'],
        egresos: ['Mantenimiento', 'Servicios', 'Administración', 'Honorarios', 'Impuestos', 'Gastos de Operación', 'Otros gastos']
    }
};

export const REGIME_LABELS: Record<string, string> = {
    'condominio_no_lucrativo': 'Condominio (No Lucrativo)',
    'arrendamiento': 'Arrendamiento',
    'actividad_empresarial': 'Actividad Empresarial'
};

export interface ReserveFund {
    id: string;
    condominium_id: string;
    balance: number;
    target_amount: number;
    contribution_type: 'percentage' | 'fixed';
    contribution_value: number;
    is_automated: boolean;
    created_at: string;
    updated_at: string;
}

export interface ReserveFundTransaction {
    id: string;
    fund_id: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    reason: string;
    description?: string;
    user_id?: string;
    created_at: string;
}
