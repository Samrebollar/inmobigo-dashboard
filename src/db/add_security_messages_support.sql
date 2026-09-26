-- El módulo de "Ayuda" del guardia de seguridad (/seguridad) se reemplaza
-- por un chat directo con el administrador de su organización, igual al
-- que ya existe para residentes. Se reutiliza la tabla resident_messages
-- (con las mismas políticas de organización para el lado del admin) en
-- vez de crear una tabla paralela: resident_id pasa a ser opcional y se
-- agrega security_user_id para los hilos de un guardia.

ALTER TABLE resident_messages
    ALTER COLUMN resident_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS security_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE resident_messages
    ADD CONSTRAINT resident_messages_exactly_one_party CHECK (
        (resident_id IS NOT NULL AND security_user_id IS NULL) OR
        (resident_id IS NULL AND security_user_id IS NOT NULL)
    );

CREATE POLICY "Security users can view own thread"
ON resident_messages FOR SELECT
USING (security_user_id = auth.uid());

CREATE POLICY "Security users can send messages in own thread"
ON resident_messages FOR INSERT
WITH CHECK (
    sender_role = 'security'
    AND sender_id = auth.uid()
    AND security_user_id = auth.uid()
);

CREATE POLICY "Security users can mark their thread read"
ON resident_messages FOR UPDATE
USING (security_user_id = auth.uid())
WITH CHECK (security_user_id = auth.uid());

-- Las políticas "Org staff can view/send/mark org threads" ya existentes
-- son genéricas por organization_id (no exigen resident_id), así que el
-- lado del administrador funciona para estos hilos sin cambios.
--
-- resident_messages ya está en la publicación de Realtime (usada por el
-- chat de residentes), así que no hace falta agregarla de nuevo.
