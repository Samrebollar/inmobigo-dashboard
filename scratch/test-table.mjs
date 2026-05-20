import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=')
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim()
  }
})

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY']
)

async function run() {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error(error)
  } else if (data && data.length > 0) {
    console.log('Columns in residents:', Object.keys(data[0]))
  } else {
    console.log('No residents found.')
  }
}

run()
