-- La tabla "payments" solo tenía una política de lectura basada en
-- organizations.owner_id (el dueño literal de la organización) y otra
-- basada en condominium_users (tabla que está vacía, 0 filas). Resultado:
-- cualquier admin/staff invitado a una organización que NO sea su dueño
-- original (es decir, cualquier fila real en organization_users) ve
-- /dashboard/finance/payments completamente vacío, aunque tenga acceso
-- admin a todo lo demás en la app.
--
-- Esta política agrega el mismo criterio que ya usa el resto de la app
-- (organization_users) sin tocar las políticas existentes.

CREATE POLICY "Payments by organization staff"
ON payments FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
);
