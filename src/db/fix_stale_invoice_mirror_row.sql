-- CORRECCIÓN: este archivo reemplaza la versión anterior, que tenía la
-- dirección del arreglo AL REVÉS. No la ejecutes si no la corriste ya
-- (y si la corriste, no tuvo efecto porque el trigger de la BD la bloqueó
-- con el error "Paid invoices cannot change status" — ese trigger evitó
-- que se dañara un pago real).
--
-- Investigación: la factura resident_invoices.id = 2a850b28-5fd8-46dd-ba08-65a65b6000f7
-- (Panchita, Las Palmas, unidad B-202) SÍ fue pagada en efectivo el
-- 21-jun-2026 — su espejo en "invoices" tiene el registro real del pago
-- (payment_provider = 'Efectivo', paid_amount = 1000, paid_at con
-- timestamp exacto). Pero esa fila en "resident_invoices" (la fuente de
-- verdad que usan Residentes, Morosos y el reporte de morosidad) nunca
-- se actualizó a "paid" — se quedó en "overdue" y el cron de recargos la
-- fue marcando vencida con el tiempo. Resultado: Panchita aparece
-- debiendo $1,000 que en realidad ya pagó, en todas las pantallas que
-- leen resident_invoices (el dashboard de inicio no se ve afectado
-- porque ese lee directo de "invoices", que sí estaba correcto).
--
-- Esta corrección actualiza resident_invoices para que coincida con el
-- pago real ya registrado en invoices, en vez de intentar revertir un
-- pago legítimo.

UPDATE resident_invoices ri
SET
    status = 'paid',
    balance_due = 0,
    paid_amount = i.paid_amount,
    paid_at = i.paid_at,
    updated_at = now()
FROM invoices i
WHERE i.external_payment_id = ri.id::text
  AND ri.id = '2a850b28-5fd8-46dd-ba08-65a65b6000f7';
