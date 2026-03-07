'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save } from 'lucide-react'
import { propertiesService } from '@/services/properties-service'
import { Condominium, UpdateCondominiumDTO } from '@/types/properties'

export function SettingsTab() {
    const params = useParams()
    const condominiumId = params.id as string

    const [loading, setLoading] = useState(false)
    const [condo, setCondo] = useState<Condominium | null>(null)

    // Local state for form
    const [formData, setFormData] = useState<Partial<UpdateCondominiumDTO>>({})

    useEffect(() => {
        fetchCondo()
    }, [condominiumId])

    const fetchCondo = async () => {
        const data = await propertiesService.getById(condominiumId)
        if (data) {
            setCondo(data)
            setFormData({
                name: data.name,
                billing_day: data.billing_day,
                units_total: data.units_total,
                // Add other editable fields
            })
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: name === 'billing_day' || name === 'units_total' ? Number(value) : value
        }))
    }

    const handleSave = async () => {
        try {
            setLoading(true)
            await propertiesService.update(condominiumId, formData)
            await fetchCondo() // Refresh
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (!condo) return <div className="p-4 text-zinc-400">Cargando configuración...</div>

    return (
        <div className="space-y-6 max-w-4xl">
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle>Configuración General</CardTitle>
                    <CardDescription>Ajustes principales del condominio.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Nombre del Condominio"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                        />
                        <Input
                            label="Día de Corte"
                            type="number"
                            name="billing_day"
                            value={formData.billing_day || ''}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Total Unidades Estimadas"
                            type="number"
                            name="units_total"
                            value={formData.units_total || ''}
                            onChange={handleChange}
                        />
                        <Input label="Moneda" defaultValue={condo.currency} disabled />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle>Notificaciones</CardTitle>
                    <CardDescription>Configura los recordatorios automáticos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                        <div>
                            <p className="font-medium text-white">Recordatorio de Pago</p>
                            <p className="text-sm text-zinc-500">Enviar email 3 días antes de la fecha de corte.</p>
                        </div>
                        <div className="h-6 w-11 rounded-full bg-indigo-600 relative cursor-pointer">
                            <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                        <div>
                            <p className="font-medium text-white">Aviso de Morosidad</p>
                            <p className="text-sm text-zinc-500">Enviar email al día siguiente del vencimiento.</p>
                        </div>
                        <div className="h-6 w-11 rounded-full bg-indigo-600 relative cursor-pointer">
                            <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                >
                    {loading ? <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" /> : <Save className="h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </div>
        </div>
    )
}
