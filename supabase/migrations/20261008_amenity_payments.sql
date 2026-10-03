-- Cobro de reservas de amenidades: cuota de uso + depósito en garantía.
--
-- Al aprobar una reserva con costo se generan dos cargos en resident_invoices
-- ligados a la reserva (reservation_id):
--   invoice_type 'amenity_fee'     → cuota de uso (ingreso del condominio)
--   invoice_type 'amenity_deposit' → depósito en garantía reembolsable (NO es
--                                     ingreso ni morosidad; se devuelve o se
--                                     retiene después del evento)
-- Se pagan en línea antes de payment_due_at (48 h antes del evento); si no,
-- la reserva se cancela sola y libera el día.

-- resident_invoices es una vista sobre invoices (invoice_scope = 'resident')
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES amenity_reservations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_reservation ON invoices(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE OR REPLACE VIEW resident_invoices WITH (security_invoker = true) AS
 SELECT id, condominium_id, subscription_id, amount, currency, status, due_date, paid_at, payment_provider, external_payment_id,
    period_start, period_end, created_at, updated_at, paid_amount, invoice_type, balance_due, closed_at, external_invoice_id,
    payment_link, organization_id, unit_id, description, folio, reminder_sent, user_id, resident_id, last_reminder_sent,
    last_morosity_sent, recargo_aplicado, payment_method, invoice_scope, evidence_url, notes, reservation_id
   FROM invoices
  WHERE invoice_scope = 'resident'::text;

ALTER TABLE amenity_reservations
    ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
    -- none | pendiente_pago | en_resguardo | devuelto | retenido_parcial | retenido
    ADD COLUMN IF NOT EXISTS deposit_status TEXT NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS deposit_refunded_amount NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS deposit_retained_amount NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS deposit_refund_method TEXT,
    ADD COLUMN IF NOT EXISTS deposit_settled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deposit_settled_by UUID,
    ADD COLUMN IF NOT EXISTS deposit_notes TEXT,
    ADD COLUMN IF NOT EXISTS deposit_photo_url TEXT;

ALTER TABLE amenity_reservations DROP CONSTRAINT IF EXISTS amenity_reservations_deposit_status_check;
ALTER TABLE amenity_reservations ADD CONSTRAINT amenity_reservations_deposit_status_check
    CHECK (deposit_status IN ('none', 'pendiente_pago', 'en_resguardo', 'devuelto', 'retenido_parcial', 'retenido'));

CREATE INDEX IF NOT EXISTS idx_ar_payment_due ON amenity_reservations(payment_due_at) WHERE paid_at IS NULL AND status IN ('pending', 'approved');
