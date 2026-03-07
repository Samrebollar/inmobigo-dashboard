-- Create subscriptions table
create table if not exists public.subscriptions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    organization_id uuid references public.organizations(id) not null,
    plan_name text not null,
    price numeric not null,
    unit_limit integer not null,
    billing_cycle text default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
    subscription_status text not null default 'pending' check (subscription_status in ('pending', 'active', 'cancelled', 'expired')),
    mercado_subscription_id text,
    mercado_customer_id text,
    last_payment_date timestamptz,
    next_payment_date timestamptz,
    amount_paid numeric,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Index for fast lookups by MercadoPago ID (used in webhooks)
create index if not exists idx_subscriptions_mercado_id on public.subscriptions(mercado_subscription_id);

-- Enable Row Level Security
alter table public.subscriptions enable row level security;

-- RLS Policies
create policy "Users can view their own subscriptions"
on public.subscriptions for select
using (auth.uid() = user_id);

create policy "Users can create their own pending subscriptions"
on public.subscriptions for insert
with check (auth.uid() = user_id);

-- Note: Webhook updates will use the service_role key to bypass RLS
