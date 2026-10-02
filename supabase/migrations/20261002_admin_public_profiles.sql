-- Ficha pública del administrador de una organización.
--
-- El administrador de un condominio puede ser una EMPRESA administradora
-- (razón social, RFC, representante legal...) o un COMITÉ de vecinos
-- (integrantes con cargo, periodo de gestión, acta de asamblea...). Esta tabla
-- guarda esa información y el token del código QR que la publica en
-- /administrador/<public_token>.
--
-- Solo se lee/escribe desde el servidor (server actions y la página pública)
-- con el service role, después de validar el rol del usuario; por eso RLS se
-- activa sin políticas para anon/authenticated.

CREATE TABLE IF NOT EXISTS admin_public_profiles (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    admin_type TEXT CHECK (admin_type IN ('empresa', 'comite')),

    -- Token del QR. Se puede regenerar para invalidar los QR ya impresos.
    public_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    is_public BOOLEAN NOT NULL DEFAULT TRUE,

    -- Nombre visible: nombre comercial (empresa) o nombre del comité
    display_name TEXT,
    logo_url TEXT,

    -- Empresa
    legal_name TEXT,
    rfc TEXT,
    legal_representative TEXT,
    fiscal_address TEXT,
    website TEXT,

    -- Comité
    committee_period_start DATE,
    committee_period_end DATE,
    assembly_date DATE,
    committee_members JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Contacto (ambos)
    contact_phone TEXT,
    contact_email TEXT,
    office_address TEXT,
    office_hours TEXT,
    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_public_profiles ENABLE ROW LEVEL SECURITY;
