import { useState, useCallback } from 'react'
import { propertiesService } from '@/services/properties-service'
import { Condominium, CreateCondominiumDTO } from '@/types/properties'
import { createClient } from '@/utils/supabase/client'
import { useDemoMode } from './use-demo-mode'
import { demoDb } from '@/utils/demo-db'

export function useProperties() {
    const [loading, setLoading] = useState(false)
    const [properties, setProperties] = useState<Condominium[]>([])
    const [error, setError] = useState<string | null>(null)
    const { isDemo } = useDemoMode()

    const fetchProperties = useCallback(async (orgId: string) => {
        setLoading(true)
        setError(null)
        try {
            const data = await propertiesService.getByOrganization(orgId)

            if (isDemo) {
                const demoProperties = demoDb.getProperties()
                // Evitar duplicados si por alguna razón ya están en la base de datos
                const nonDemoData = data.filter(d => !demoProperties.some(dp => dp.id === d.id))
                setProperties([...demoProperties, ...nonDemoData])
            } else {
                setProperties(data)
            }
        } catch (err: any) {
            console.error('fetchProperties error details (RAW):', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [isDemo])

    const createProperty = async (data: CreateCondominiumDTO) => {
        setLoading(true)
        setError(null)

        if (isDemo) {
            // Simulated creation
            return new Promise<Condominium>((resolve) => {
                setTimeout(() => {
                    const mockProperty: Condominium = {
                        id: `demo-${Math.random().toString(36).substr(2, 9)}`,
                        name: data.name,
                        type: data.type,
                        organization_id: data.organization_id,
                        status: 'active',
                        units_total: data.units_total,
                        city: data.city || 'Ciudad Demo',
                        state: data.state || 'Estado Demo',
                        country: data.country || 'México',
                        address: data.address || 'Calle Falsa 123',
                        slug: data.slug || data.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
                        billing_day: data.billing_day || 1,
                        currency: data.currency || 'MXN',
                        created_at: new Date().toISOString()
                    }
                    demoDb.saveProperty(mockProperty)
                    setProperties(prev => [mockProperty, ...prev])
                    setLoading(false)
                    resolve(mockProperty)
                }, 800)
            })
        }

        try {
            const newProperty = await propertiesService.create(data)
            setProperties(prev => [newProperty, ...prev])
            return newProperty
        } catch (err: any) {
            console.error('createProperty error details (RAW):', err)
            setError(err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    const updateProperty = async (id: string, data: Partial<CreateCondominiumDTO>) => {
        setLoading(true)
        setError(null)

        if (isDemo && id.startsWith('demo-')) {
            return new Promise<Condominium>((resolve) => {
                setTimeout(() => {
                    const existing = demoDb.getProperties().find(p => p.id === id)
                    const updated = { ...existing, ...data } as Condominium
                    demoDb.saveProperty(updated)
                    setProperties(prev => prev.map(p => p.id === id ? updated : p))
                    setLoading(false)
                    resolve(updated)
                }, 800)
            })
        }

        try {
            await propertiesService.update(id, data)
            setProperties(prev => prev.map(p => p.id === id ? { ...p, ...data } as Condominium : p))
            return true
        } catch (err: any) {
            console.error(err)
            setError(err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    const deactivateProperty = async (id: string) => {
        try {
            await propertiesService.deactivate(id)
            setProperties(prev => prev.filter(p => p.id !== id))
        } catch (err: any) {
            console.error(err)
            setError(err.message)
        }
    }

    const deleteProperty = async (id: string) => {
        setLoading(true)
        setError(null)
        try {
            if (isDemo && id.startsWith('demo-')) {
                demoDb.deleteProperty(id)
                setProperties(prev => prev.filter(p => p.id !== id))
                return
            }
            await propertiesService.delete(id)
            setProperties(prev => prev.filter(p => p.id !== id))
        } catch (err: any) {
            console.error(err)
            setError(err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    return {
        loading,
        properties,
        error,
        fetchProperties,
        createProperty,
        updateProperty,
        deactivateProperty,
        deleteProperty
    }
}
