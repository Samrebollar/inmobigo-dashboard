import { createClient } from '@/utils/supabase/server'

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Facturas</h1>

      {invoices?.length === 0 && (
        <p>No hay facturas registradas.</p>
      )}

      <div className="space-y-4">
        {invoices?.map((invoice) => (
          <div
            key={invoice.id}
            className="p-4 rounded-lg bg-gray-800 border border-gray-700"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-lg">
                  ${invoice.amount} {invoice.currency}
                </p>

                <p className="text-sm text-gray-400">
                  Periodo: {invoice.period_start} - {invoice.period_end}
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  invoice.status === 'paid'
                    ? 'bg-green-600'
                    : 'bg-yellow-600'
                }`}
              >
                {invoice.status === 'paid' ? 'Pagado' : 'Pendiente'}
              </span>
            </div>

            {invoice.status !== 'paid' && invoice.payment_link && (
              <a
                href={invoice.payment_link}
                target="_blank"
                className="inline-block mt-4 bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-500"
              >
                Pagar ahora
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}