-- La factura resident_invoices.id = 2a850b28-5fd8-46dd-ba08-65a65b6000f7 está
-- "overdue" con $1,000 pendientes (fuente de verdad), pero su espejo en
-- "invoices" (usado por n8n y por el home del admin en /dashboard/inicio-condominio
-- para sumar "totalCobrado") quedó marcado como "paid"/$0 por un fallo de
-- sincronización puntual. Esto corrige solo esa fila para que ambas tablas
-- vuelvan a coincidir, sin tocar ninguna otra factura.

UPDATE invoices i
SET
    status = ri.status,
    balance_due = ri.balance_due,
    paid_amount = GREATEST(0, ri.amount - ri.balance_due),
    paid_at = CASE WHEN ri.status = 'paid' THEN i.paid_at ELSE NULL END,
    updated_at = now()
FROM resident_invoices ri
WHERE i.external_payment_id = ri.id::text
  AND ri.id = '2a850b28-5fd8-46dd-ba08-65a65b6000f7';
