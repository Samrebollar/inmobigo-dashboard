-- Supabase marcaba estas vistas como "Security Definer View" (CRITICAL): se
-- ejecutaban con los permisos de su dueño y se saltaban el RLS, y anon tenía
-- permiso de lectura (cualquiera con la clave pública podía leer todas las
-- facturas). Ahora respetan el RLS de quien consulta.
alter view public.resident_invoices set (security_invoker = true);
alter view public.bitacora_entries_view set (security_invoker = true);

-- Nadie sin sesión debe leerlas
revoke all on public.resident_invoices from anon;
revoke all on public.bitacora_entries_view from anon;
-- La bitácora solo se consulta desde el servidor (service_role)
revoke all on public.bitacora_entries_view from authenticated;
