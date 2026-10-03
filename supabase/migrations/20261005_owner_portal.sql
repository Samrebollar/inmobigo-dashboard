-- Portal de Propietarios y Gestores (etapa 3): el middleware busca en cada
-- navegación si la cuenta es propietario o gestor (unit_contacts.user_id).
CREATE INDEX IF NOT EXISTS idx_unit_contacts_user ON unit_contacts(user_id) WHERE user_id IS NOT NULL;
