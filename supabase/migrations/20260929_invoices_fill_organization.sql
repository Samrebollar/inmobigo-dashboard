-- Facturas sin organization_id quedaban invisibles para el panel del
-- administrador (RLS de invoices filtra por organización): descuadraban
-- Contabilidad, Cobranza y los totales del condominio. Se completa la
-- organización a partir del condominio al insertar/actualizar, y se corrigen
-- las filas existentes.

create or replace function public.fill_invoice_organization_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.organization_id is null and new.condominium_id is not null then
        select c.organization_id into new.organization_id
        from public.condominiums c
        where c.id = new.condominium_id;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_fill_invoice_organization on public.invoices;
create trigger trg_fill_invoice_organization
    before insert or update of condominium_id, organization_id on public.invoices
    for each row execute function public.fill_invoice_organization_id();

update public.invoices i
set organization_id = c.organization_id
from public.condominiums c
where c.id = i.condominium_id
  and i.organization_id is null;
