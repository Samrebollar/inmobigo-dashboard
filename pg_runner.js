const { Client } = require('pg');
const fs = require('fs');

const envPath = '.env.local';
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const [key, ...rest] = line.split('=');
    const value = rest.join('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

// Supabase session pooler connection string format typically is postgres://[user]:[password]@[host]:6543/postgres
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

        const sql = fs.readFileSync('supabase/migrations/20260317_create_tickets_table.sql', 'utf8');
        console.log('Running SQL...');
        
        await client.query(sql);
        console.log('Migration executed successfully! Tickets table created.');
        
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await client.end();
    }
}

runMigration();
