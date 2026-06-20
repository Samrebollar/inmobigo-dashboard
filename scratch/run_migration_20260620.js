const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
    console.error('.env.local file not found at:', envPath);
    process.exit(1);
}

const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return acc;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) return acc;
    const key = trimmed.substring(0, firstEquals).trim();
    const value = trimmed.substring(firstEquals + 1).trim();
    if (key && value) acc[key] = value;
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
        console.log('Connected to Database successfully!');

        const migrationPath = path.join(__dirname, '../supabase/migrations/20260620_referral_rewards.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        console.log('Reading migration file:', migrationPath);
        
        console.log('Executing SQL migration...');
        await client.query(sql);
        console.log('Migration executed successfully! Referral rewards tables and columns created/updated.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
