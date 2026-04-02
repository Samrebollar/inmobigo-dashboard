import fs from 'fs'
const spec = JSON.parse(fs.readFileSync('./openapi.json', 'utf8'))
console.log(Object.keys(spec.definitions).filter(k => k.toLowerCase().includes('deliv') || k.toLowerCase().includes('cour')))
