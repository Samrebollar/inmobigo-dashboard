-- Propietario, ocupante, gestor y responsable de pago de cada unidad (etapa 1).
--
-- En Cancún es común que el dueño no viva en el condominio: renta su unidad
-- (a largo plazo o vacacional) y muchas veces un gestor la administra. Cada
-- unidad registra:
--   - occupancy_type: quién la ocupa (el propietario, un inquilino, renta
--     vacacional o nadie).
--   - payment_responsible: quién le paga la cuota al condominio. Por defecto el
--     propietario, que por ley está obligado aunque la unidad no esté habitada.
--   - owner / co_owner / manager: contactos del propietario, copropietario y
--     gestor (un mismo contacto puede estar en varias unidades).
-- En esta etapa solo se registran los datos; el cobro no cambia.

CREATE TABLE IF NOT EXISTS unit_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('propietario', 'gestor')),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    -- Cuenta del portal de propietarios y gestores (etapa 3)
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unit_contacts_org_kind ON unit_contacts(organization_id, kind);

-- Solo se lee/escribe desde el servidor (service role) tras validar el rol
ALTER TABLE unit_contacts ENABLE ROW LEVEL SECURITY;

ALTER TABLE units ADD COLUMN IF NOT EXISTS occupancy_type TEXT NOT NULL DEFAULT 'propietario'
    CHECK (occupancy_type IN ('propietario', 'inquilino', 'vacacional', 'desocupada'));
ALTER TABLE units ADD COLUMN IF NOT EXISTS payment_responsible TEXT NOT NULL DEFAULT 'propietario'
    CHECK (payment_responsible IN ('propietario', 'gestor', 'inquilino'));
ALTER TABLE units ADD COLUMN IF NOT EXISTS owner_contact_id UUID REFERENCES unit_contacts(id) ON DELETE SET NULL;
ALTER TABLE units ADD COLUMN IF NOT EXISTS co_owner_contact_id UUID REFERENCES unit_contacts(id) ON DELETE SET NULL;
ALTER TABLE units ADD COLUMN IF NOT EXISTS manager_contact_id UUID REFERENCES unit_contacts(id) ON DELETE SET NULL;
ALTER TABLE units ADD COLUMN IF NOT EXISTS manager_can_pay BOOLEAN NOT NULL DEFAULT FALSE;

-- Unidades existentes sin ningún residente activo quedan como desocupadas
UPDATE units u
SET occupancy_type = 'desocupada'
WHERE NOT EXISTS (
    SELECT 1 FROM residents r
    WHERE r.unit_id = u.id AND COALESCE(r.status, 'active') <> 'inactive'
);
