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

const dbUrl = envVars.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to PG');

        // Query view definition of financial_dashboard_v
        const dashRes = await client.query(`
            SELECT view_definition 
            FROM information_schema.views 
            WHERE table_name = 'financial_dashboard_v'
        `);
        console.log('--- financial_dashboard_v DEFINITION ---');
        console.log(dashRes.rows[0] ? dashRes.rows[0].view_definition : 'Not found');

        // Query view definition of resident_debt_aging_v
        const agingRes = await client.query(`
            SELECT view_definition 
            FROM information_schema.views 
            WHERE table_name = 'resident_debt_aging_v'
        `);
        console.log('--- resident_debt_aging_v DEFINITION ---');
        console.log(agingRes.rows[0] ? agingRes.rows[0].view_definition : 'Not found');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
