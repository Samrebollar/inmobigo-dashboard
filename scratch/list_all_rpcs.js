const fs = require('fs');

const openapi = JSON.parse(fs.readFileSync('openapi.json', 'utf8'));
const rpcs = Object.keys(openapi.paths)
    .filter(path => path.startsWith('/rpc/'))
    .map(path => path.replace('/rpc/', ''));

console.log('Available RPCs in openapi.json:');
console.log(rpcs);
