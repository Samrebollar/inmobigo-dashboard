import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkColumns() {
    try {
        const { data, error } = await supabase
            .from('condo_expenses')
            .select('*')
            .limit(1)

        if (error) {
            console.error('Error fetching condo_expenses:', error)
            return
        }

        if (data && data.length > 0) {
            console.log('Columns in condo_expenses:', Object.keys(data[0]))
        } else {
            console.log('No data in condo_expenses')
        }
    } catch (err) {
        console.error('Critical error:', err)
    }
}

checkColumns()
