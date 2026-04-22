import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
  const tables = ['profiles', 'organization_users', 'organizations']
  for (const table of tables) {
    console.log(`\n--- TABLE: ${table} ---`)
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.error(`Error fetching ${table}:`, error.message)
      continue
    }
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]))
    } else {
      console.log('No data found to determine columns.')
      // Fallback: use RPC if available or just assume it's empty
    }
  }
}

check()
