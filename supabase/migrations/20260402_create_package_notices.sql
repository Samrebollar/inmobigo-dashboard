-- Migration to create package_notices table for Resident Services

create table if not exists package_notices (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references organizations(id),
    unit_id uuid references units(id),
    resident_id uuid references profiles(id),
    courier text not null,
    tracking_number text,
    instructions text,
    status text check (status in ('pending', 'received', 'delivered')) default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table package_notices enable row level security;

create policy "Users can view their own package notices"
  on package_notices for select
  using (resident_id = auth.uid());

create policy "Users can insert their own package notices"
  on package_notices for insert
  with check (resident_id = auth.uid());

create policy "Admins can view all package notices"
  on package_notices for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'staff')
      and profiles.organization_id = package_notices.organization_id
    )
  );

create policy "Admins can update package notices"
  on package_notices for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'staff')
      and profiles.organization_id = package_notices.organization_id
    )
  );
