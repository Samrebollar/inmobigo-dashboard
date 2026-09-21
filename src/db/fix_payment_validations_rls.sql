-- payment_validations tenía políticas RLS que permitían a CUALQUIER
-- usuario autenticado de la plataforma (no solo el residente dueño o el
-- staff de su organización) leer, aprobar/rechazar y borrar cualquier
-- comprobante de pago de cualquier condominio — el filtro real vivía solo
-- en el código de la app (y en la pantalla del residente, con un bug de
-- OR en vez de AND). Ya se agregó protección a nivel de aplicación en
-- payment-validation-actions.ts; este SQL cierra el mismo hueco a nivel
-- de base de datos, por si algo llega a llamar la tabla directamente.

DROP POLICY IF EXISTS "Allow public read for admins" ON payment_validations;
DROP POLICY IF EXISTS "Allow admins to update validations" ON payment_validations;
DROP POLICY IF EXISTS "Allow admins to delete validations" ON payment_validations;

CREATE POLICY "Residents and staff can view their own validations"
ON payment_validations FOR SELECT
TO authenticated
USING (
    resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid())
    OR condominium_id IN (
        SELECT c.id FROM condominiums c
        WHERE c.organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
);

CREATE POLICY "Staff can update validations in their organization"
ON payment_validations FOR UPDATE
TO authenticated
USING (
    condominium_id IN (
        SELECT c.id FROM condominiums c
        WHERE c.organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
);

CREATE POLICY "Residents and staff can delete validations"
ON payment_validations FOR DELETE
TO authenticated
USING (
    (status = 'pendiente' AND resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid()))
    OR condominium_id IN (
        SELECT c.id FROM condominiums c
        WHERE c.organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
            UNION
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    )
);
