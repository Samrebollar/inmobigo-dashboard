
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDates() {
    const { data: anns } = await supabase.from('announcements').select('title, created_at').order('created_at', { ascending: false })
    
    let output = "--- Date Debug ---\n"
    output += `Current local time (system): ${new Date().toString()}\n`
    output += `Current ISO time: ${new Date().toISOString()}\n\n`
    
    anns?.forEach(a => {
        output += `Title: ${a.title}\n`
        output += `Raw created_at: ${a.created_at}\n`
        output += `JS parsed: ${new Date(a.created_at).toString()}\n`
        output += `JS parsed ISO: ${new Date(a.created_at).toISOString()}\n`
        output += `------------------\n`
    })

    fs.writeFileSync('c:\\DEV\\inmobigo-dashboard\\date_check.log', output)
    console.log("Check complete, see date_check.log")
}

checkDates()
