/**
 * Ingresos del mes con la misma definición que la tarjeta "Ingresos del Mes"
 * de Finanzas (flujo de caja: todo lo que entró en el mes por fecha de pago,
 * incluida la recuperación de meses anteriores). Se usa en el dashboard de
 * inicio para que ambas tarjetas siempre muestren el mismo número.
 */
export async function fetchCashIncome(organizationId: string, condominiumId?: string) {
    const nowMx = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    const [y, m] = nowMx.slice(0, 7).split('-').map(Number)
    const prevKey = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`

    const load = async (month?: string) => {
        const params = new URLSearchParams()
        if (condominiumId) params.set('condominium_id', condominiumId)
        else params.set('organization_id', organizationId)
        if (month) params.set('month', month)
        const res = await fetch(`/api/finance/metrics?${params.toString()}`)
        if (!res.ok) throw new Error('No se pudieron cargar los ingresos')
        return res.json()
    }

    const [cur, prev] = await Promise.all([load(), load(prevKey)])
    return {
        current: Number(cur.ingresos_mes || 0),
        previous: Number(prev.ingresos_mes || 0),
        // Desglose para cuadrar con "Recaudado" de Gestión de Cobranza (solo cuotas del mes)
        breakdown: {
            delMes: Number(cur.ingresos_del_mes || 0),
            recuperacion: Number(cur.ingresos_recuperacion || 0),
            adelantos: Number(cur.ingresos_adelantos || 0),
        },
    }
}
