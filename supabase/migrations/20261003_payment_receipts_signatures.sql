-- Recibos de pago validados por la administración (con firma, matrícula
-- SEDETUS y sello digital) + firma autógrafa digitalizada de cada integrante
-- del equipo.
--
-- Cada pago registrado en resident_invoice_payments emite un recibo oficial
-- en payment_receipts. El recibo guarda una "foto" (snapshot) de quién lo
-- firmó y en nombre de qué administración, para que no cambie aunque el
-- comité o la empresa cambien después. El sello digital (HMAC-SHA256 con una
-- clave del servidor) permite detectar si alguien alteró sus datos.
--
-- Todo se lee/escribe desde el servidor con service role (RLS sin políticas).

-- 1. Firma autógrafa digitalizada de cada usuario del equipo
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature_path TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature_updated_at TIMESTAMPTZ;

-- Bucket privado: las firmas nunca se exponen con URL pública
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('signatures', 'signatures', FALSE, 1048576, ARRAY['image/png'])
ON CONFLICT (id) DO NOTHING;

-- 2. Recibos oficiales
CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL UNIQUE REFERENCES resident_invoice_payments(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    condominium_id UUID,
    resident_id UUID,
    invoice_id UUID,

    -- Datos del pago (snapshot)
    folio TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT,
    concept TEXT,
    paid_at TIMESTAMPTZ,
    resident_name TEXT,
    unit_number TEXT,
    condominium_name TEXT,

    -- Verificación
    verify_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    short_code TEXT NOT NULL UNIQUE,
    seal TEXT,
    seal_version SMALLINT NOT NULL DEFAULT 1,

    -- Quién lo validó (snapshot)
    validation_mode TEXT NOT NULL CHECK (validation_mode IN ('manual', 'automatico', 'historico')),
    signer_user_id UUID,
    signer_name TEXT,
    signer_position TEXT,
    signer_signature_path TEXT,
    admin_type TEXT,
    admin_display_name TEXT,
    sedetus_registration_number TEXT,
    sedetus_expiry_date DATE,

    -- valido | firma_pendiente (el firmante aún no sube su firma) | cancelado
    status TEXT NOT NULL DEFAULT 'valido' CHECK (status IN ('valido', 'firma_pendiente', 'cancelado')),
    canceled_at TIMESTAMPTZ,
    canceled_by UUID,
    cancel_reason TEXT,

    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_org ON payment_receipts(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_resident ON payment_receipts(resident_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_pending_signer ON payment_receipts(signer_user_id) WHERE status = 'firma_pendiente';

ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
