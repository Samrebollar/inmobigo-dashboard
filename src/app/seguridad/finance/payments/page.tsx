import { createClient } from '@/utils/supabase/server'

export default async function PaymentsPage() {
  const supabase = await createClient()

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Pagos</h1>

      {payments?.length === 0 && (
        <p>No hay pagos registrados.</p>
      )}

      <div className="space-y-4">
        {payments?.map((payment) => (
          <div
            key={payment.id}
            className="p-4 rounded-lg bg-gray-800 border border-gray-700"
          >
            <p className="font-semibold">
              ${payment.amount}
            </p>

            <p className="text-sm text-gray-400">
              Método: {payment.provider}
            </p>

            <p className="text-sm text-gray-400">
              Fecha: {payment.created_at}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
