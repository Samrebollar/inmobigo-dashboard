'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Bell, Search, FileText, BookOpenText, Receipt, FileSignature, ChevronRight, HelpCircle } from 'lucide-react'

type DocItem = {
    id: string
    title: string
    subtitle: string
    icon: any
    action: () => void
}

export default function MobileDocumentosClient({ reglamentoUrl }: { reglamentoUrl: string | null }) {
    const [query, setQuery] = useState('')

    const docs: DocItem[] = useMemo(
        () => [
            {
                id: 'estado-cuenta',
                title: 'Estado de Cuenta',
                subtitle: 'Historial completo de pagos y saldos',
                icon: FileText,
                action: () => {
                    window.location.href = '/mobile/pagos'
                },
            },
            {
                id: 'reglamento',
                title: 'Reglamento',
                subtitle: reglamentoUrl ? 'Normas y políticas de tu condominio' : 'Aún no disponible',
                icon: BookOpenText,
                action: () => {
                    if (reglamentoUrl) {
                        window.open(reglamentoUrl, '_blank', 'noreferrer')
                    } else {
                        toast.info('Tu administración aún no ha subido el reglamento del condominio.')
                    }
                },
            },
            {
                id: 'recibos',
                title: 'Recibos',
                subtitle: 'Descarga los recibos de tus pagos',
                icon: Receipt,
                action: () => {
                    window.location.href = '/mobile/pagos'
                },
            },
            {
                id: 'contratos',
                title: 'Contratos',
                subtitle: 'Aún no disponible',
                icon: FileSignature,
                action: () => {
                    toast.info('Tu administración aún no ha subido contratos.')
                },
            },
        ],
        [reglamentoUrl]
    )

    const filtered = docs.filter(
        (d) =>
            d.title.toLowerCase().includes(query.toLowerCase()) ||
            d.subtitle.toLowerCase().includes(query.toLowerCase())
    )

    return (
        <div className="mx-auto max-w-[480px]">
            <header className="sticky top-0 z-30 flex items-center justify-between bg-[rgba(248,249,250,0.9)] px-5 py-4 backdrop-blur-[6px]">
                <h1 className="text-[20px] font-semibold leading-[28px] text-[#004AC6]">Documentos</h1>
                <Link href="/mobile/avisos" className="flex h-10 w-10 items-center justify-center rounded-full">
                    <Bell size={18} className="text-[#191C1D]" />
                </Link>
            </header>

            <main className="flex flex-col gap-6 px-5 pb-24 pt-2">
                <div className="relative flex h-12 items-center rounded-xl border border-[#c3c6d7] bg-white px-4">
                    <Search size={16} className="shrink-0 text-[#434655]" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar documentos..."
                        className="ml-3 w-full bg-transparent text-[14px] text-[#191C1D] placeholder-[#6b7280] focus:outline-none"
                    />
                </div>

                <div className="flex flex-col gap-4">
                    <h2 className="text-[14px] font-bold uppercase tracking-[1.4px] text-[#434655]">Tus documentos</h2>

                    {filtered.length === 0 ? (
                        <div className="rounded-[20px] border border-[#c3c6d7] bg-white p-8 text-center text-[13px] text-[#434655]">
                            No se encontraron documentos.
                        </div>
                    ) : (
                        filtered.map((doc) => (
                            <button
                                key={doc.id}
                                onClick={doc.action}
                                className="flex w-full items-center justify-between rounded-[20px] border border-[#c3c6d7] bg-white p-[17px] text-left shadow-[0px_4px_20px_rgba(0,0,0,0.03)]"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(0,74,198,0.05)]">
                                        <doc.icon size={20} className="text-[#004AC6]" />
                                    </span>
                                    <div className="flex flex-col">
                                        <p className="text-[14px] font-semibold text-[#191C1D]">{doc.title}</p>
                                        <p className="text-[12px] text-[#434655]">{doc.subtitle}</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="shrink-0 text-[#434655]" />
                            </button>
                        ))
                    )}
                </div>

                <Link
                    href="/residente/help"
                    className="flex w-full items-center justify-between rounded-[20px] bg-[#f3f4f5] p-4"
                >
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e1e3e4]">
                            <HelpCircle size={18} className="text-[#434655]" />
                        </span>
                        <div className="flex flex-col">
                            <p className="text-[12px] font-semibold tracking-[0.24px] text-[#191C1D]">¿Necesitas ayuda?</p>
                            <p className="text-[11px] font-medium text-[#434655]">Escríbele directo a tu administrador</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-[#434655]" />
                </Link>
            </main>
        </div>
    )
}
