-- Eliminar un residente fallaba ("Error al eliminar el residente") cuando tenía
-- cuotas o quejas: invoices y resident_complaints apuntaban a residents sin
-- regla ON DELETE, así que la base de datos bloqueaba el borrado.

-- 1) Antes de borrar al residente, sus cuotas sin pagar se cancelan para que no
--    queden como deuda huérfana inflando la morosidad del condominio.
create or replace function public.cancel_unpaid_invoices_of_resident()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.invoices
    set status = 'cancelled', updated_at = now()
    where resident_id = old.id
      and status in ('pending', 'overdue');
    return old;
end;
$$;

drop trigger if exists trg_cancel_unpaid_invoices_on_resident_delete on public.residents;
create trigger trg_cancel_unpaid_invoices_on_resident_delete
    before delete on public.residents
    for each row execute function public.cancel_unpaid_invoices_of_resident();

-- 2) Las cuotas se conservan como historial contable (sin residente ligado).
alter table public.invoices drop constraint if exists invoices_resident_id_fkey;
alter table public.invoices
    add constraint invoices_resident_id_fkey
    foreign key (resident_id) references public.residents(id) on delete set null;

-- 3) Quejas: las que presentó el residente se eliminan; las que son sobre él se
--    conservan sin la liga.
alter table public.resident_complaints drop constraint if exists resident_complaints_reporter_resident_id_fkey;
alter table public.resident_complaints
    add constraint resident_complaints_reporter_resident_id_fkey
    foreign key (reporter_resident_id) references public.residents(id) on delete cascade;

alter table public.resident_complaints drop constraint if exists resident_complaints_subject_resident_id_fkey;
alter table public.resident_complaints
    add constraint resident_complaints_subject_resident_id_fkey
    foreign key (subject_resident_id) references public.residents(id) on delete set null;
