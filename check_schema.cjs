import fs from 'fs';
const spec = JSON.parse(fs.readFileSync('c:/DEV/inmobigo-dashboard/openapi.json', 'utf8'));

fs.writeFileSync('c:/DEV/inmobigo-dashboard/condos_schema.json', JSON.stringify({
  condos: spec.definitions.condos ? Object.keys(spec.definitions.condos.properties) : null,
  organizations: spec.definitions.organizations ? Object.keys(spec.definitions.organizations.properties) : null,
  package_notices: spec.definitions.package_notices ? Object.keys(spec.definitions.package_notices.properties) : null,
  residents: spec.definitions.residents ? Object.keys(spec.definitions.residents.properties) : null
}, null, 2));
