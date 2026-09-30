-- Al eliminar una propiedad se eliminan también sus datos propios. Estas tres
-- llaves no tenían ON DELETE y bloqueaban el borrado del condominio
-- ("violates foreign key constraint payment_accounts_condominium_id_fkey").
alter table public.payment_accounts drop constraint if exists payment_accounts_condominium_id_fkey;
alter table public.payment_accounts add constraint payment_accounts_condominium_id_fkey
    foreign key (condominium_id) references public.condominiums(id) on delete cascade;

alter table public.reserve_fund drop constraint if exists reserve_fund_condominium_id_fkey;
alter table public.reserve_fund add constraint reserve_fund_condominium_id_fkey
    foreign key (condominium_id) references public.condominiums(id) on delete cascade;

alter table public.resident_complaints drop constraint if exists resident_complaints_condominium_id_fkey;
alter table public.resident_complaints add constraint resident_complaints_condominium_id_fkey
    foreign key (condominium_id) references public.condominiums(id) on delete cascade;
