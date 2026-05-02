import { createClient } from '@/utils/supabase/client'
import { unitsService } from './units-service'
import { residentsService } from './residents-service'
import { CreateUnitDTO } from '@/types/units'
import { CreateResidentDTO } from '@/types/residents'
import { normalizeMexicanPhone } from '@/utils/phone-utils'

export interface UnifiedBulkRow {
    unit_number: string
    floor?: string
    unit_type?: 'house' | 'apartment' | 'commercial'
    monto_mensual?: number
    billing_day?: number
    resident_name?: string
    resident_email?: string
    resident_phone?: string
    resident_status?: 'active' | 'delinquent' | 'inactive'
    debt_amount?: number
    credit_amount?: number
    vehicle_plate?: string
    vehicle_brand?: string
}

export const bulkService = {
    async unifiedBulkUpload(condominiumId: string, rows: UnifiedBulkRow[]): Promise<{ success: number, errors: string[] }> {
        const errors: string[] = []
        let successCount = 0

        // 1. Fetch existing units to avoid duplicates and map IDs
        const existingUnits = await unitsService.getByCondominium(condominiumId)
        const unitMap = new Map(existingUnits.map(u => [u.unit_number.toLowerCase(), u.id]))

        for (const [index, row] of rows.entries()) {
            try {
                let unitId: string | undefined = unitMap.get(row.unit_number.toLowerCase())

                // 2. Create Unit if it doesn't exist
                if (!unitId) {
                    const unitPayload: CreateUnitDTO = {
                        condominium_id: condominiumId,
                        unit_number: row.unit_number,
                        floor: row.floor || '1',
                        type: row.unit_type || 'apartment',
                        status: row.resident_name ? 'occupied' : 'vacant',
                        monto_mensual: row.monto_mensual,
                        billing_day: row.billing_day
                    }
                    const newUnit = await unitsService.create(unitPayload)
                    unitId = newUnit.id
                    unitMap.set(row.unit_number.toLowerCase(), unitId)
                } else if (row.resident_name) {
                    // Update unit status to occupied if it was vacant
                    const existingUnit = existingUnits.find(u => u.id === unitId)
                    if (existingUnit && existingUnit.status === 'vacant') {
                        await unitsService.update(unitId, { status: 'occupied' })
                    }
                }

                // 3. Create Resident if info provided
                if (row.resident_name && row.resident_email) {
                    const nameParts = row.resident_name.trim().split(' ')
                    const firstName = nameParts[0]
                    const lastName = nameParts.slice(1).join(' ')

                    const vehicles = []
                    if (row.vehicle_plate) {
                        vehicles.push({
                            plate: row.vehicle_plate,
                            brand: row.vehicle_brand || '',
                            color: ''
                        })
                    }

                    const residentPayload: CreateResidentDTO = {
                        condominium_id: condominiumId,
                        unit_id: unitId,
                        first_name: firstName,
                        last_name: lastName,
                        email: row.resident_email,
                        phone: normalizeMexicanPhone(row.resident_phone || ''),
                        status: row.resident_status || 'active',
                        debt_amount: row.debt_amount || 0,
                        credit_amount: row.credit_amount || 0,
                        vehicles
                    }

                    try {
                        await residentsService.create(residentPayload)
                    } catch (err: any) {
                        const errMessage = JSON.stringify(err)
                        if (err?.code === '23505' || errMessage.includes('23505') || errMessage.includes('duplicate key')) {
                            // If resident exists, maybe update the unit_id link? 
                            // For now, we skip to avoid accidental re-assignments
                            console.warn(`Resident ${row.resident_email} already exists. Skipping resident creation.`)
                        } else {
                            throw err
                        }
                    }
                }

                successCount++
            } catch (err: any) {
                console.error(`Error in row ${index + 1}:`, err)
                errors.push(`Fila ${index + 1} (${row.unit_number}): ${err.message || 'Error desconocido'}`)
            }
        }

        return { success: successCount, errors }
    }
}
