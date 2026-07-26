import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchTables() {
  const tables = [
    'residents',
    'profiles',
    'users',
    'subscriptions',
    'organizations',
    'organization_users',
    'units',
    'invoices',
    'payments',
    'condos',
    'amenities',
    'tickets'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(100);
      if (error) {
        console.log(`Table ${table}: error (${error.message})`);
      } else if (data) {
        console.log(`Table ${table}: count ${data.length}`);
        const str = JSON.stringify(data);
        if (str.toLowerCase().includes('anarebollar')) {
          console.log(`>>> MATCH FOUND IN ${table}:`, data.filter(row => JSON.stringify(row).toLowerCase().includes('anarebollar')));
        }
      }
    } catch (e) {
      console.log(`Table ${table}: catch error`, e);
    }
  }
}

searchTables().catch(console.error);
