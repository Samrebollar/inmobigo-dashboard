const https = require('https');

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg';

const getAlerts = () => {
    return new Promise((resolve, reject) => {
        const url = `${supabaseUrl}/rest/v1/package_alerts?select=*`;
        const options = {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
};

getAlerts().then(data => {
    console.log('--- DATA IN package_alerts ---');
    console.log(JSON.stringify(data, null, 2));
}).catch(err => {
    console.error('Error:', err);
});
