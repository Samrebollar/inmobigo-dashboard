-- Amenities Table
create table if not exists amenities (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  description text,
  icon text,
  image_url text,
  base_price numeric(10, 2) default 0,
  deposit_required boolean default false,
  deposit_amount numeric(10, 2) default 0,
  capacity integer,
  rules text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Amenity Bookings Table
create table if not exists amenity_bookings (
  id uuid primary key default uuid_generate_v4(),
  amenity_id uuid references amenities(id) on delete cascade,
  resident_id uuid references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  booking_date date not null,
  start_time time,
  end_time time,
  status text check (status in ('pending', 'confirmed', 'cancelled')) default 'pending',
  total_price numeric(10, 2) default 0,
  deposit_paid boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table amenities enable row level security;
alter table amenity_bookings enable row level security;

-- RLS Policies
create policy "Anyone can view amenities in their organization"
  on amenities for select
  using (organization_id in (select organization_id from profiles where id = auth.uid()));

create policy "Admins can manage amenities"
  on amenities for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Residents can view bookings in their organization"
  on amenity_bookings for select
  using (organization_id in (select organization_id from profiles where id = auth.uid()));

create policy "Residents can create their own bookings"
  on amenity_bookings for insert
  with check (resident_id = auth.uid());

-- Insert some initial data for Torre Reforma
insert into amenities (name, description, icon, base_price, deposit_required, deposit_amount, capacity) 
values 
('Salón de Fiestas', 'Espacio elegante para eventos sociales con cocina equipada y mobiliario.', 'PartyPopper', 2500, true, 5000, 100),
('Alberca Infinity', 'Disfruta de una vista espectacular mientras te relajas en nuestra alberca climatizada.', 'Waves', 0, false, 0, 30),
('Gimnasio Pro', 'Equipamiento de última generación con equipo de cardio y pesas libres.', 'Dumbbell', 0, false, 0, 15),
('Área de Asadores', 'Perfecto para una tarde casual. Incluye asador de gas y zona de comedor.', 'Flame', 500, true, 1000, 12);
