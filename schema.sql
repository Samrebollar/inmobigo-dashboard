-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Organizations (Condominiums/Tenants)
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles (Users linked to auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  organization_id uuid references organizations(id),
  role text check (role in ('admin', 'staff', 'resident')) default 'resident',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Properties / Units
create table units (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) not null,
  unit_number text not null,
  block text,
  floor text,
  owner_id uuid references profiles(id),
  tenant_id uuid references profiles(id),
  status text check (status in ('occupied', 'vacant', 'maintenance')) default 'occupied',
  monthly_fee numeric(10, 2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Invoices / Bills
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) not null,
  unit_id uuid references units(id),
  user_id uuid references profiles(id),
  amount numeric(10, 2) not null,
  description text,
  due_date date not null,
  status text check (status in ('pending', 'paid', 'overdue', 'cancelled')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Payments
create table payments (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) not null,
  invoice_id uuid references invoices(id),
  amount numeric(10, 2) not null,
  method text check (method in ('credit_card', 'bank_transfer', 'cash')),
  transaction_id text,
  status text check (status in ('succeeded', 'failed', 'pending')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table units enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;

-- RLS Policies

-- Organization Policies
create policy "Users can view their own organization"
  on organizations for select
  using (id in (select organization_id from profiles where profiles.id = auth.uid()));

-- Profile Policies
create policy "Users can view profiles in their organization"
  on profiles for select
  using (organization_id in (select organization_id from profiles where profiles.id = auth.uid()));

create policy "Users can update their own profile"
  on profiles for update
  using (id = auth.uid());

-- Unit Policies
create policy "Users can view units in their organization"
  on units for select
  using (organization_id in (select organization_id from profiles where profiles.id = auth.uid()));

create policy "Admins can manage units"
  on units for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.organization_id = units.organization_id
    )
  );

-- Invoice Policies
create policy "Users can view their own invoices"
  on invoices for select
  using (user_id = auth.uid());

create policy "Admins can view all invoices in organization"
  on invoices for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'staff')
      and profiles.organization_id = invoices.organization_id
    )
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'resident');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
