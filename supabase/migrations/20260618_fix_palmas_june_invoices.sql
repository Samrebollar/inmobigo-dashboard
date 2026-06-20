-- Migration: Corregir facturas de Las Palmas - Junio 2026
-- Problema 1: Descripción en inglés ("June") → Español ("Junio")
-- Problema 2: Factura de Dex Uc (A-101) marcada como 'paid' incorrectamente → 'overdue'
-- Ejecutado: 2026-06-18

-- Paso 1: Corregir descripción de AMBAS facturas (quitar espacios extra y poner "Junio")
UPDATE resident_invoices
SET description = 'Cuota de mantenimiento Junio 2026'
WHERE condominium_id = '810a13c4-8474-44cf-8d8e-2366875ceacc'
  AND invoice_type = 'maintenance'
  AND due_date >= '2026-06-01'
  AND due_date <= '2026-06-30';

-- Paso 2: Cambiar status de la factura de A-101 (Dex Uc) de 'paid' a 'overdue'
-- y restaurar balance_due al monto original ($1,000)
-- Esta factura fue marcada 'paid' incorrectamente por un script de prueba/seed
UPDATE resident_invoices
SET
    status      = 'overdue',
    balance_due = amount
WHERE id = 'a4aa12ef-38be-4395-bd95-30ef9490e2f1';

-- Verificación: mostrar el resultado final
SELECT
    ri.id,
    r.first_name || ' ' || r.last_name AS residente,
    u.unit_number                       AS unidad,
    ri.status,
    ri.amount,
    ri.balance_due,
    ri.due_date,
    ri.description
FROM resident_invoices ri
LEFT JOIN residents r ON r.id = ri.resident_id
LEFT JOIN units u     ON u.id = ri.unit_id
WHERE ri.condominium_id = '810a13c4-8474-44cf-8d8e-2366875ceacc'
  AND ri.invoice_type   = 'maintenance'
  AND ri.due_date      >= '2026-06-01'
  AND ri.due_date      <= '2026-06-30'
ORDER BY ri.created_at;
