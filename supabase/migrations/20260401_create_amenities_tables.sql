-- Amenities Catalog Table
create table if not exists amenities (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references organizations(id) on delete cascade not null,
    name text not null,
    description text,
    icon_name text,
    base_price numeric(10, 2) default 0,
    deposit_required boolean default false,
    deposit_amount numeric(10, 2) default 0,
    capacity integer default 1,
    rules text,
    color text default 'from-zinc-600 to-zinc-800',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Amenity Reservations Table
create table if not exists amenity_reservations (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references organizations(id) on delete cascade not null,
    amenity_id uuid references amenities(id) on delete cascade not null,
    resident_id uuid references profiles(id) on delete cascade not null,
    reservation_date date not null,
    status text check (status in ('pending', 'approved', 'cancelled')) default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    unique (amenity_id, reservation_date) -- Prevents double booking on the same full day
);

-- RLS Policies for amenities
alter table amenities enable row level security;

create policy "Users can view amenities in their organization"
    on amenities for select
    using (organization_id in (select organization_id from profiles where profiles.id = auth.uid()));

create policy "Admins can manage amenities"
    on amenities for all
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
            and profiles.organization_id = amenities.organization_id
        )
    );

-- RLS Policies for amenity_reservations
alter table amenity_reservations enable row level security;

create policy "Users can view their own reservations"
    on amenity_reservations for select
    using (resident_id = auth.uid());

create policy "Users can view all reservations in their organization to check availability"
    on amenity_reservations for select
    using (organization_id in (select organization_id from profiles where profiles.id = auth.uid()));

create policy "Users can create their own reservations"
    on amenity_reservations for insert
    with check (resident_id = auth.uid() AND organization_id in (select organization_id from profiles where profiles.id = auth.uid()));

create policy "Users can update their own pending reservations"
    on amenity_reservations for update
    using (resident_id = auth.uid() AND status = 'pending');

create policy "Users can soft-delete/cancel their reservations"
    on amenity_reservations for delete
    using (resident_id = auth.uid() AND status in ('pending', 'cancelled'));

create policy "Admins can manage all reservations in organization"
    on amenity_reservations for all
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
            and profiles.organization_id = amenity_reservations.organization_id
        )
    );
