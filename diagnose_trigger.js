const { Client } = require('pg');
const fs = require('fs');

const envPath = '.env.local';
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const [key, ...rest] = line.split('=');
    const value = (rest.join('=') || '').trim();
    if (key && value) acc[key.trim()] = value.replace(/^"(.*)"$/, '$1');
    return acc;
}, {});

const dbUrl = envVars.DATABASE_URL || envVars.DIRECT_URL;

if (!dbUrl) {
    console.error('DATABASE_URL or DIRECT_URL not found in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function diagnose() {
    try {
        await client.connect();
        console.log('--- DB DIAGNOSTIC (RAW SQL) ---');

        // 1. Check profiles table schema
        console.log('\nChecking public.profiles schema:');
        const resCols = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'profiles'
        `);
        console.table(resCols.rows);

        // 2. Check handle_new_user function content
        console.log('\nChecking public.handle_new_user() content:');
        const resFunc = await client.query(`
            SELECT prosrc 
            FROM pg_proc 
            JOIN pg_namespace n ON n.oid = pg_proc.pronamespace 
            WHERE n.nspname = 'public' AND proname = 'handle_new_user'
        `);
        if (resFunc.rows[0]) {
            console.log(resFunc.rows[0].prosrc);
        } else {
            console.log('Function not found!');
        }

        // 3. Check residents table schema
        console.log('\nChecking public.residents schema:');
        const resResidents = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'residents'
        `);
        console.table(resResidents.rows);

    } catch (err) {
        console.error('Diagnostic failed:', err.message);
    } finally {
        await client.end();
    }
}

diagnose();
