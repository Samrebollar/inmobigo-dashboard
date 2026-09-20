-- El botón "Guardar Cambios" en Perfil intentaba guardar el teléfono de
-- administradores en profiles, pero esa tabla no tenía columna "phone" —
-- el cambio se perdía silenciosamente para cualquier usuario sin fila en
-- "residents" (todos los administradores). Con esta columna, el teléfono
-- de administradores y residentes se guarda de forma consistente.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
