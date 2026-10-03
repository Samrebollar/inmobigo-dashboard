-- La cuenta del portal de un propietario o gestor que se borra en Auth deja
-- de estar ligada (antes quedaba un user_id huérfano y ya no se reinvitaba).
UPDATE unit_contacts c SET user_id = NULL
WHERE user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id);

ALTER TABLE unit_contacts DROP CONSTRAINT IF EXISTS unit_contacts_user_id_fkey;
ALTER TABLE unit_contacts ADD CONSTRAINT unit_contacts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
