import fs from 'fs'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

async function getDefinitions() {
    try {
        console.log("Fetching API Swagger definition from Supabase...")
        const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`)
        const spec = await res.json()
        
        const tables = spec.definitions || {}
        
        const output = {}
        for (const tableName of ['payment_agreements', 'agreement_installments']) {
            if (tables[tableName]) {
                output[tableName] = {
                    properties: Object.keys(tables[tableName].properties).reduce((acc, key) => {
                        acc[key] = tables[tableName].properties[key].type
                        return acc
                    }, {})
                }
            } else {
                output[tableName] = "NOT_FOUND"
            }
        }
        
        console.log("Found table definitions:")
        console.log(JSON.stringify(output, null, 2))
        fs.writeFileSync('scratch/table_definitions.json', JSON.stringify(output, null, 2))
    } catch (err) {
        console.error("Error:", err)
    }
}

getDefinitions()
