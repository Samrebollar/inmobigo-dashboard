-- Arqueos de caja: conteo físico del efectivo que cobró una persona en un día,
-- comparado contra lo registrado en el sistema (faltante / sobrante).
create table if not exists public.cash_counts (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    condominium_id uuid references public.condominiums(id) on delete set null,
    count_date date not null,
    counted_by uuid references auth.users(id) on delete set null,
    counted_for uuid references auth.users(id) on delete set null,
    expected_amount numeric(12,2) not null default 0,
    counted_amount numeric(12,2) not null default 0,
    difference numeric(12,2) generated always as (counted_amount - expected_amount) stored,
    status text not null check (status in ('cuadrado', 'faltante', 'sobrante')),
    denominations jsonb not null default '{}'::jsonb,
    payments_count integer not null default 0,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists cash_counts_org_date_idx on public.cash_counts (organization_id, count_date desc);
create index if not exists cash_counts_counted_for_idx on public.cash_counts (counted_for, count_date desc);

-- Solo se opera desde la API del servidor (valida permisos); sin acceso directo del cliente.
alter table public.cash_counts enable row level security;

comment on table public.cash_counts is 'Arqueos de caja: efectivo contado vs esperado por persona y día.';
