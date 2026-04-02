import { Client } from 'pg';
import fs from 'fs';

const envPath = '.env.local';
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const [key, ...rest] = line.split('=');
    const value = rest.join('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

const dbUrl = envVars.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        await client.connect();
        console.log('Connected directly to Postgres');

        const sql = `
            create table if not exists package_notices (
                id uuid primary key default uuid_generate_v4(),
                organization_id uuid references organizations(id),
                unit_id uuid references units(id),
                resident_id uuid references profiles(id),
                courier text not null,
                tracking_number text,
                instructions text,
                status text default 'pending',
                created_at timestamp with time zone default timezone('utc'::text, now()) not null
            );

            alter table package_notices enable row level security;

            create policy "Users can view their own package notices"
              on package_notices for select
              using (resident_id = auth.uid() OR resident_id IN (
                  SELECT id FROM profiles WHERE id = auth.uid()
              ));

            create policy "Users can insert their own package notices"
              on package_notices for insert
              with check (resident_id = auth.uid() OR resident_id IN (
                  SELECT id FROM profiles WHERE id = auth.uid()
              ));

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
        `;
        console.log('Running SQL...');
        
        await client.query(sql);
        console.log('Migration executed successfully! package_notices table created.');
        
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

runMigration();
