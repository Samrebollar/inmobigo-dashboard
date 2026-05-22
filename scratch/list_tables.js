import fs from 'fs'

const spec = JSON.parse(fs.readFileSync('openapi.json', 'utf8'))
console.log("All tables in OpenAPI:", Object.keys(spec.definitions || {}))
