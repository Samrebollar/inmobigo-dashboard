import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
    const supabase = await createClient();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id param missing' });

    const { data: invoices } = await supabase.from('invoices').select('*').eq('condominium_id', id);
    const { data: units } = await supabase.from('units').select('id, name, status').eq('condominium_id', id);
    const { data: residents } = await supabase.from('residents').select('id, first_name').eq('condominium_id', id);

    return NextResponse.json({ invoices, units, residents });
}
