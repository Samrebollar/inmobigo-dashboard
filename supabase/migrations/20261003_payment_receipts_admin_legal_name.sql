-- Razón social de la empresa administradora en el recibo (snapshot al emitirlo),
-- para mostrarla junto al nombre comercial en el PDF y en la verificación.
ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS admin_legal_name TEXT;

-- Recibos ya emitidos: se toma la razón social actual de la ficha
UPDATE payment_receipts r
SET admin_legal_name = p.legal_name
FROM admin_public_profiles p
WHERE p.organization_id = r.organization_id
  AND r.admin_type = 'empresa'
  AND r.admin_legal_name IS NULL
  AND p.legal_name IS NOT NULL;
