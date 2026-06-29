console.log(process.env.DATABASE_URL ? 'DATABASE_URL exists!' : 'DATABASE_URL is missing in process.env');
console.log('Keys in process.env:', Object.keys(process.env).filter(k => k.includes('DB') || k.includes('DATABASE') || k.includes('SUPABASE')));
