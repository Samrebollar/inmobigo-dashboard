
/**
 * Utility to manage simulated data for "Modo Demo" in localStorage.
 * This allows the demo experience to be persistent across refreshes and navigation
 * without ever touching the real Supabase database.
 */

const STORAGE_KEYS = {
    PROPERTIES: 'inmobigo_demo_properties',
    UNITS: 'inmobigo_demo_units',
    RESIDENTS: 'inmobigo_demo_residents',
    CONTRACTS: 'inmobigo_demo_contracts',
    INVENTORY: 'inmobigo_demo_inventory'
}

export const demoDb = {
    // ... existentes ...
    
    // Contracts
    getContracts: (): any[] => {
        if (typeof window === 'undefined') return []
        const stored = localStorage.getItem(STORAGE_KEYS.CONTRACTS)
        return stored ? JSON.parse(stored) : []
    },
    saveContract: (contract: any) => {
        const contracts = demoDb.getContracts()
        const exists = contracts.findIndex(c => c.id === contract.id)
        if (exists >= 0) {
            contracts[exists] = contract
        } else {
            contracts.unshift(contract)
        }
        localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts))
    },
    deleteContract: (id: string) => {
        const contracts = demoDb.getContracts().filter(c => c.id !== id)
        localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts))
    },

    // Inventory
    getInventory: (propertyId?: string): any[] => {
        if (typeof window === 'undefined') return []
        const stored = localStorage.getItem(STORAGE_KEYS.INVENTORY)
        const items = stored ? JSON.parse(stored) : []
        if (propertyId) {
            return items.filter((i: any) => i.property_id === propertyId)
        }
        return items
    },
    saveInventoryItem: (item: any) => {
        const items = demoDb.getInventory()
        const exists = items.findIndex(i => i.id === item.id)
        if (exists >= 0) {
            items[exists] = item
        } else {
            items.unshift(item)
        }
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items))
    },
    deleteInventoryItem: (id: string) => {
        const items = demoDb.getInventory().filter(i => i.id !== id)
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items))
    },

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
