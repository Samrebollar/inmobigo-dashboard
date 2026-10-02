-- Cancelación y reemisión de recibos: un pago puede tener recibos cancelados y
-- a lo más UN recibo vigente (valido o firma_pendiente). Antes payment_id era
-- UNIQUE, lo que impedía emitir el recibo corregido de un pago.
ALTER TABLE payment_receipts DROP CONSTRAINT IF EXISTS payment_receipts_payment_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS payment_receipts_one_active_per_payment
    ON payment_receipts(payment_id) WHERE status <> 'cancelado';
CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment ON payment_receipts(payment_id);

-- Recibo que reemplaza a uno cancelado (para avisarlo en la verificación)
ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS replaced_by UUID REFERENCES payment_receipts(id);
