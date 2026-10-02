-- Los residentes pueden LEER (solo SELECT) los avisos activos de su condominio.
-- visibility guarda 'Todos' o el nombre del condominio; target_id, si existe, es una unidad.
-- No cambia ni elimina las políticas existentes de administradores.
create policy "Residents can view announcements of their condominium"
on public.announcements
for select
to authenticated
using (
  is_active
  and exists (
    select 1
    from public.residents r
    join public.condominiums c on c.id = r.condominium_id
    where r.user_id = (select auth.uid())
      and c.organization_id = announcements.organization_id
      and (
        lower(coalesce(announcements.visibility, 'todos')) = 'todos'
        or lower(announcements.visibility) = lower(c.name)
      )
      and (announcements.target_id is null or announcements.target_id = r.unit_id)
  )
);
