
/**
 * Utility to manage simulated data for "Modo Demo" in localStorage.
 * This allows the demo experience to be persistent across refreshes and navigation
 * without ever touching the real Supabase database.
 */

const STORAGE_KEYS = {
    PROPERTIES: 'inmobigo_demo_properties',
    UNITS: 'inmobigo_demo_units',
    RESIDENTS: 'inmobigo_demo_residents'
}

export const demoDb = {
    // Properties
    getProperties: (): any[] => {
        if (typeof window === 'undefined') return []
        const stored = localStorage.getItem(STORAGE_KEYS.PROPERTIES)
        return stored ? JSON.parse(stored) : []
    },
    saveProperty: (property: any) => {
        const properties = demoDb.getProperties()
        const exists = properties.findIndex(p => p.id === property.id)
        if (exists >= 0) {
            properties[exists] = property
        } else {
            properties.unshift(property)
        }
        localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(properties))
    },
    deleteProperty: (id: string) => {
        const properties = demoDb.getProperties().filter(p => p.id !== id)
        localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(properties))
        // Also cleanup units and residents for this property
        const units = demoDb.getUnits().filter(u => u.condominium_id !== id)
        localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(units))
        const residents = demoDb.getResidents().filter(r => r.condominium_id !== id)
        localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(residents))
    },

    // Units
    getUnits: (condominiumId?: string): any[] => {
        if (typeof window === 'undefined') return []
        const stored = localStorage.getItem(STORAGE_KEYS.UNITS)
        const units = stored ? JSON.parse(stored) : []
        if (condominiumId) {
            return units.filter((u: any) => u.condominium_id === condominiumId)
        }
        return units
    },
    saveUnit: (unit: any) => {
        const units = demoDb.getUnits()
        const exists = units.findIndex(u => u.id === unit.id)
        if (exists >= 0) {
            units[exists] = unit
        } else {
            units.unshift(unit)
        }
        localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(units))
    },
    deleteUnit: (id: string) => {
        const units = demoDb.getUnits().filter(u => u.id !== id)
        localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(units))
    },

    // Residents
    getResidents: (condominiumId?: string): any[] => {
        if (typeof window === 'undefined') return []
        const stored = localStorage.getItem(STORAGE_KEYS.RESIDENTS)
        const residents = stored ? JSON.parse(stored) : []
        if (condominiumId) {
            return residents.filter((r: any) => r.condominium_id === condominiumId)
        }
        return residents
    },
    saveResident: (resident: any) => {
        const residents = demoDb.getResidents()
        const exists = residents.findIndex(r => r.id === resident.id)
        if (exists >= 0) {
            residents[exists] = resident
        } else {
            residents.unshift(resident)
        }
        localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(residents))
    },
    deleteResident: (id: string) => {
        const residents = demoDb.getResidents().filter(r => r.id !== id)
        localStorage.setItem(STORAGE_KEYS.RESIDENTS, JSON.stringify(residents))
    }
}
