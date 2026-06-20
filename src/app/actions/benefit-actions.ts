'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export type TrainingProgressPayload = {
    training_id: string
    organization_id: string
    progress: number
    completed: boolean
}

export type ReferralPayload = {
    organization_id: string
    referral_code_id: string
    referrer_organization_id: string
    referred_name: string
    referred_email: string
    referred_phone: string
}

// 1. Helper to generate unique referral code
function generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let suffix = ''
    for (let i = 0; i < 6; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `INM-${suffix}`
}

// 2. Main query action with auto-seeding
export async function getBenefitDataAction(organizationId: string) {
    if (!organizationId) {
        return { success: false, error: 'ID de organización no proporcionado' }
    }

    const admin = createAdminClient()

    try {
        console.log(`🎁 [getBenefitDataAction] Buscando datos de beneficios para la organización: ${organizationId}`)

        // 2a. Check if categories exist
        const { data: categories, error: catError } = await admin
            .from('benefit_training_categories')
            .select('*')
            .eq('organization_id', organizationId)
            .order('sort_order', { ascending: true })

        if (catError) {
            // Check if tables exist by inspecting the error code.
            // '42P01' is the standard PostgreSQL error code for "relation does not exist" (undefined_table)
            if (
                catError.code === '42P01' ||
                catError.code === 'PGRST116' ||
                (catError.message && (
                    catError.message.toLowerCase().includes('relation') ||
                    catError.message.toLowerCase().includes('does not exist') ||
                    catError.message.toLowerCase().includes('no existe la relación') ||
                    catError.message.toLowerCase().includes('no existe')
                ))
            ) {
                return { success: false, error: 'DB_NOT_READY', details: catError.message }
            }
            throw catError
        }

        // 2b. If no categories exist, auto-seed default data
        if (!categories || categories.length === 0) {
            console.log(`🌱 [getBenefitDataAction] No se encontraron categorías. Iniciando auto-seed...`)
            const seedResult = await seedDefaultBenefitsAction(organizationId)
            if (!seedResult.success) {
                return { success: false, error: 'Seeding failed', details: seedResult.error }
            }
            // Recurse once to load newly seeded data
            return getBenefitDataAction(organizationId)
        }

        // 2c. Fetch trainings
        const { data: trainings, error: trError } = await admin
            .from('benefit_trainings')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('created_at', { ascending: true })

        if (trError) throw trError

        // 2d. Fetch training progress
        const { data: progress, error: prError } = await admin
            .from('benefit_training_progress')
            .select('*')
            .eq('organization_id', organizationId)

        if (prError) throw prError

        // 2e. Fetch referral code
        let { data: referralCode, error: refCodeError } = await admin
            .from('benefit_referral_codes')
            .select('*')
            .eq('organization_id', organizationId)
            .maybeSingle()

        if (refCodeError) throw refCodeError

        // If no referral code exists, let's create it on-the-fly
        if (!referralCode) {
            console.log(`🌱 [getBenefitDataAction] Creando código de referido para la organización...`)
            const codeStr = generateReferralCode()
            const { data: newCode, error: insertCodeError } = await admin
                .from('benefit_referral_codes')
                .insert({
                    organization_id: organizationId,
                    code: codeStr,
                    is_active: true
                })
                .select()
                .single()

            if (insertCodeError) throw insertCodeError
            referralCode = newCode
        }

        // 2f. Fetch referrals — use a safe column set that doesn't depend on migration columns
        const { data: referrals, error: referralsError } = await admin
            .from('benefit_referrals')
            .select('id, organization_id, referral_code_id, referrer_organization_id, referred_name, referred_email, referred_phone, status, reward_amount, reward_paid, created_at')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })

        if (referralsError) {
            // If the table has a column mismatch (old schema), return DB_NOT_READY_REWARDS
            if (
                referralsError.code === '42703' || // undefined_column
                referralsError.code === '42P01' || // undefined_table
                (referralsError.message && referralsError.message.toLowerCase().includes('column'))
            ) {
                return { success: false, error: 'DB_NOT_READY_REWARDS', details: referralsError.message }
            }
            throw referralsError
        }

        // 2g. Check if benefit_reward_payments table and new columns exist (to detect if referral rewards migration was run)
        const { error: checkRewardsError } = await admin
            .from('benefit_reward_payments')
            .select('id')
            .limit(1)

        if (checkRewardsError) {
            if (
                checkRewardsError.code === '42P01' || // undefined_table
                (checkRewardsError.message && (
                    checkRewardsError.message.toLowerCase().includes('relation') ||
                    checkRewardsError.message.toLowerCase().includes('does not exist')
                ))
            ) {
                return { success: false, error: 'DB_NOT_READY_REWARDS', details: checkRewardsError.message }
            }
            throw checkRewardsError
        }

        return {
            success: true,
            data: {
                categories: categories || [],
                trainings: trainings || [],
                progress: progress || [],
                referralCode,
                referrals: referrals || []
            }
        }

    } catch (err: any) {
        // PostgREST/Supabase error objects may not be enumerable via spread.
        // Use JSON.stringify with a replacer to capture all own properties.
        const errDetails = (() => {
            try {
                return JSON.stringify(err, Object.getOwnPropertyNames(err))
            } catch {
                return String(err)
            }
        })()
        console.error('❌ [getBenefitDataAction] Excepción crítica:', {
            message: err?.message,
            code: err?.code,
            details: err?.details,
            hint: err?.hint,
            raw: errDetails
        })
        // Check if it's a table/column not found error (migration not applied)
        if (
            err?.code === '42P01' ||
            err?.code === '42703' ||
            (err?.message && (
                err.message.toLowerCase().includes('does not exist') ||
                err.message.toLowerCase().includes('no existe') ||
                err.message.toLowerCase().includes('relation') ||
                err.message.toLowerCase().includes('column')
            ))
        ) {
            return { success: false, error: 'DB_NOT_READY_REWARDS', details: err?.message }
        }
        return { success: false, error: err?.message || 'Error interno del servidor' }
    }
}

// 3. Seeder Action
export async function seedDefaultBenefitsAction(organizationId: string) {
    const admin = createAdminClient()

    try {
        console.log(`🌱 [seedDefaultBenefitsAction] Ejecutando inserción de datos iniciales para: ${organizationId}`)

        // 3a. Define categories
        const categoriesToInsert = [
            { organization_id: organizationId, name: '⚖️ Régimen Condominial', description: 'Aspectos legales de copropiedad', icon: 'Scroll', sort_order: 1 },
            { organization_id: organizationId, name: '🏛️ Asambleas', description: 'Organización de asambleas condominales', icon: 'Users', sort_order: 2 },
            { organization_id: organizationId, name: '📄 Asociación Civil', description: 'Manejo de A.C. en Quintana Roo', icon: 'Briefcase', sort_order: 3 }
        ]

        const { data: insertedCategories, error: catInsertError } = await admin
            .from('benefit_training_categories')
            .insert(categoriesToInsert)
            .select()

        if (catInsertError) throw catInsertError

        // Map category name to its inserted ID
        const catMap = insertedCategories.reduce((acc: Record<string, string>, cat: any) => {
            acc[cat.name] = cat.id
            return acc
        }, {})

        // 3b. Define trainings
        const trainingsToInsert = [
            {
                organization_id: organizationId,
                category_id: catMap['⚖️ Régimen Condominial'],
                title: 'Fundamentos del Régimen de Propiedad en Condominio',
                description: 'Aprende los conceptos legales básicos que todo administrador debe conocer sobre la propiedad en condominio, los derechos y obligaciones de los condóminos y las facultades de la administración.',
                thumbnail_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
                duration_minutes: 30,
                difficulty: 'PRINCIPIANTE',
                content_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                is_featured: true,
                is_active: true
            },
            {
                organization_id: organizationId,
                category_id: catMap['🏛️ Asambleas'],
                title: 'Cómo Realizar una Asamblea por Primera Vez',
                description: 'Aprende paso a paso cómo convocar, organizar y documentar una Asamblea General de Condóminos de manera profesional y conforme a la normativa aplicable en Quintana Roo.',
                thumbnail_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
                duration_minutes: 35,
                difficulty: 'PRINCIPIANTE',
                content_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                is_featured: false,
                is_active: true
            },
            {
                organization_id: organizationId,
                category_id: catMap['📄 Asociación Civil'],
                title: 'Constitución de una Asociación Civil para Condominios',
                description: 'Conoce cuándo es conveniente constituir una Asociación Civil y cuáles son los pasos básicos para su creación, administración y cumplimiento de obligaciones legales y fiscales.',
                thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
                duration_minutes: 40,
                difficulty: 'INTERMEDIO',
                content_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                is_featured: false,
                is_active: true
            }
        ]

        const { error: trInsertError } = await admin
            .from('benefit_trainings')
            .insert(trainingsToInsert)

        if (trInsertError) throw trInsertError

        console.log('✅ Seeding completed successfully.')
        return { success: true }

    } catch (err: any) {
        console.error('❌ [seedDefaultBenefitsAction] Error al sembrar datos:', err)
        return { success: false, error: err.message }
    }
}

// 4. Progress Update Action
export async function updateTrainingProgressAction(payload: TrainingProgressPayload) {
    if (!payload.training_id || !payload.organization_id) {
        return { success: false, error: 'Parámetros incompletos' }
    }

    const admin = createAdminClient()

    try {
        console.log(`🔄 [updateTrainingProgressAction] Guardando progreso (${payload.progress}%) para curso: ${payload.training_id}`)
        
        const completed_at = payload.completed ? new Date().toISOString() : null

        const { data, error } = await admin
            .from('benefit_training_progress')
            .upsert({
                organization_id: payload.organization_id,
                training_id: payload.training_id,
                progress: payload.progress,
                completed: payload.completed,
                completed_at,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'organization_id,training_id'
            })
            .select()
            .single()

        if (error) throw error

        return { success: true, data }

    } catch (err: any) {
        console.error('❌ [updateTrainingProgressAction] Error:', err)
        return { success: false, error: err.message }
    }
}

// 5. Referral Action
export async function createReferralAction(payload: ReferralPayload) {
    if (!payload.referred_name || !payload.referred_email) {
        return { success: false, error: 'El nombre y correo del referido son obligatorios' }
    }

    const admin = createAdminClient()

    try {
        console.log(`💰 [createReferralAction] Creando referido: ${payload.referred_name} (${payload.referred_email})`)

        const { data, error } = await admin
            .from('benefit_referrals')
            .insert({
                organization_id: payload.organization_id,
                referral_code_id: payload.referral_code_id,
                referrer_organization_id: payload.referrer_organization_id,
                referred_name: payload.referred_name,
                referred_email: payload.referred_email,
                referred_phone: payload.referred_phone || null,
                status: 'registered',
                reward_amount: 1000.00,
                reward_paid: false
            })
            .select()
            .single()

        if (error) throw error

        return { success: true, data }

    } catch (err: any) {
        console.error('❌ [createReferralAction] Error:', err)
        return { success: false, error: err.message }
    }
}

// 6. Action to simulate plan activation for testing referralls
export async function simulateReferralStatusAction(referralId: string, newStatus: string) {
    const admin = createAdminClient()

    try {
        console.log(`🔧 [simulateReferralStatusAction] Simulando cambio de estado para referido ${referralId} a: ${newStatus}`)
        
        const updates: any = { status: newStatus }
        
        if (newStatus === 'reward_paid') {
            updates.reward_paid = true
            updates.reward_paid_at = new Date().toISOString()
        } else if (newStatus === 'active_plan' || newStatus === 'reward_pending') {
            updates.reward_paid = false
            updates.reward_paid_at = null
        }

        const { data, error } = await admin
            .from('benefit_referrals')
            .update(updates)
            .eq('id', referralId)
            .select()
            .single()

        if (error) throw error

        // If status changed to active_plan/reward_paid, we could update totals in referral_codes
        if (referralId) {
            // Recalcular totales del código de referido
            const { data: ref } = await admin.from('benefit_referrals').select('referral_code_id, organization_id').eq('id', referralId).single()
            if (ref) {
                const { data: allRefs } = await admin.from('benefit_referrals').select('status, reward_amount').eq('referral_code_id', ref.referral_code_id)
                if (allRefs) {
                    const totalReferrals = allRefs.filter(r => ['active_plan', 'reward_pending', 'reward_paid'].includes(r.status)).length
                    const totalRewards = allRefs
                        .filter(r => ['active_plan', 'reward_pending', 'reward_paid'].includes(r.status))
                        .reduce((sum, r) => sum + Number(r.reward_amount || 0), 0)

                    await admin
                        .from('benefit_referral_codes')
                        .update({ total_referrals: totalReferrals, total_rewards: totalRewards })
                        .eq('id', ref.referral_code_id)
                }
            }
        }

        return { success: true, data }

    } catch (err: any) {
        console.error('❌ [simulateReferralStatusAction] Error:', err)
        return { success: false, error: err.message }
    }
}

// ============================================================================
// SISTEMA DE RECOMPENSAS — NUEVAS SERVER ACTIONS
// ============================================================================

export async function validateReferralCodeAction(code: string) {
    if (!code) return { success: false, valid: false, error: 'Código no proporcionado' }
    const admin = createAdminClient()
    try {
        const { data, error } = await admin
            .from('benefit_referral_codes')
            .select('id, organization_id, code, is_active')
            .eq('code', code.trim().toUpperCase())
            .eq('is_active', true)
            .maybeSingle()

        if (error) throw error
        if (!data) return { success: true, valid: false }
        return { success: true, valid: true, referralCode: data }
    } catch (err: any) {
        console.error('❌ [validateReferralCodeAction] Error:', err)
        return { success: false, valid: false, error: err.message }
    }
}

export async function registerReferredAdminAction(payload: {
    referral_code: string
    referred_organization_id: string
    referred_name: string
    referred_email: string
}) {
    if (!payload.referral_code || !payload.referred_organization_id) {
        return { success: false, error: 'Parámetros incompletos' }
    }
    const admin = createAdminClient()
    try {
        // 1. Buscar el código y su dueño (referrer)
        const { data: refCode, error: refCodeError } = await admin
            .from('benefit_referral_codes')
            .select('id, organization_id, code')
            .eq('code', payload.referral_code.trim().toUpperCase())
            .eq('is_active', true)
            .maybeSingle()

        if (refCodeError) throw refCodeError
        if (!refCode) return { success: false, error: 'Código de referido inválido o inactivo' }

        // 2. Verificar que la organización referida no tenga ya un registro
        const { data: existingRef, error: existingError } = await admin
            .from('benefit_referrals')
            .select('id')
            .eq('referred_organization_id', payload.referred_organization_id)
            .maybeSingle()

        if (existingError) throw existingError
        if (existingRef) {
            return { success: false, error: 'Esta organización ya ha sido referida anteriormente' }
        }

        // 3. INSERT en benefit_referrals
        const { data, error: insertError } = await admin
            .from('benefit_referrals')
            .insert({
                organization_id: refCode.organization_id, // El que recomendó
                referral_code_id: refCode.id,
                referrer_organization_id: refCode.organization_id,
                referred_organization_id: payload.referred_organization_id,
                referred_name: payload.referred_name,
                referred_email: payload.referred_email,
                referred_phone: '',
                status: 'registered',
                referred_registered_at: new Date().toISOString()
            })
            .select()
            .single()

        if (insertError) throw insertError

        return { success: true, data }
    } catch (err: any) {
        console.error('❌ [registerReferredAdminAction] Error:', err)
        return { success: false, error: err.message }
    }
}

export async function activatePlanReferralAction(referred_organization_id: string) {
    if (!referred_organization_id) return { success: false, error: 'ID de organización no proporcionado' }
    const admin = createAdminClient()
    try {
        // 1. Buscar en benefit_referrals por referred_organization_id con status='registered'
        const { data: referral, error: fetchError } = await admin
            .from('benefit_referrals')
            .select('*')
            .eq('referred_organization_id', referred_organization_id)
            .eq('status', 'registered')
            .maybeSingle()

        if (fetchError) throw fetchError
        if (!referral) return { success: true, message: 'Ningún referido registrado pendiente para esta organización' }

        const now = new Date().toISOString()

        // 2. Actualizar status='active_plan' en benefit_referrals
        const { data: updatedReferral, error: updateError } = await admin
            .from('benefit_referrals')
            .update({
                status: 'active_plan',
                plan_activated_at: now,
                reward_generated_at: now
            })
            .eq('id', referral.id)
            .select()
            .single()

        if (updateError) throw updateError

        // 3. Crear el pago de recompensa en benefit_reward_payments
        const { error: rewardError } = await admin
            .from('benefit_reward_payments')
            .insert({
                organization_id: referral.organization_id, // dueño de la recompensa
                referral_id: referral.id,
                referrer_organization_id: referral.organization_id,
                amount: 1000.00,
                status: 'pending',
                created_at: now
            })

        if (rewardError) throw rewardError

        return { success: true, data: updatedReferral }
    } catch (err: any) {
        console.error('❌ [activatePlanReferralAction] Error:', err)
        return { success: false, error: err.message }
    }
}

export async function getDetailedReferralStatsAction(organizationId: string) {
    if (!organizationId) return { success: false, error: 'ID de organización no proporcionado' }
    const admin = createAdminClient()
    try {
        // 1. Obtener todos los referidos de la organización
        const { data: referrals, error: refError } = await admin
            .from('benefit_referrals')
            .select('*')
            .eq('organization_id', organizationId)

        if (refError) throw refError

        // 2. Obtener todas las recompensas
        const { data: rewards, error: rewardError } = await admin
            .from('benefit_reward_payments')
            .select('*')
            .eq('referrer_organization_id', organizationId)

        if (rewardError) throw rewardError

        const totalReferrals = referrals ? referrals.length : 0
        const activePlans = referrals ? referrals.filter((r: any) => ['active_plan', 'reward_paid'].includes(r.status)).length : 0
        
        const totalEarned = rewards ? rewards.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0) : 0
        const totalPaid = rewards ? rewards.filter((r: any) => r.status === 'paid').reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0) : 0
        const totalPending = rewards ? rewards.filter((r: any) => ['pending', 'approved'].includes(r.status)).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0) : 0

        // 3. Leaderboard - Top 10 referentes de todo el sistema
        const { data: allReferrals, error: allRefsError } = await admin
            .from('benefit_referrals')
            .select('organization_id, status, organizations(name)')
            .in('status', ['active_plan', 'reward_paid'])

        let topReferrers: any[] = []
        if (allReferrals) {
            const counts: Record<string, { count: number, name: string }> = {}
            allReferrals.forEach((ref: any) => {
                const orgId = ref.organization_id
                // Use organizations name or a fallback
                const orgName = (ref.organizations as any)?.name || 'Administrador de InmobiGo'
                if (!counts[orgId]) {
                    counts[orgId] = { count: 0, name: orgName }
                }
                counts[orgId].count++
            })

            topReferrers = Object.entries(counts)
                .map(([id, info]) => ({
                    organization_id: id,
                    name: info.name,
                    count: info.count,
                    amount: info.count * 1000
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
        }

        return {
            success: true,
            data: {
                totalReferrals,
                activePlans,
                totalEarned,
                totalPaid,
                totalPending,
                topReferrers
            }
        }
    } catch (err: any) {
        console.error('❌ [getDetailedReferralStatsAction] Error:', err)
        return { success: false, error: err.message }
    }
}

// OWNER ACTIONS
export async function ownerApproveRewardAction(paymentId: string) {
    if (!paymentId) return { success: false, error: 'ID de pago no proporcionado' }
    const admin = createAdminClient()
    try {
        const { data, error } = await admin
            .from('benefit_reward_payments')
            .update({ status: 'approved' })
            .eq('id', paymentId)
            .select()
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (err: any) {
        console.error('❌ [ownerApproveRewardAction] Error:', err)
        return { success: false, error: err.message }
    }
}

export async function ownerMarkRewardPaidAction(
    paymentId: string,
    paymentMethod: string = 'Transferencia',
    paymentReference: string = '',
    notes: string = ''
) {
    if (!paymentId) return { success: false, error: 'ID de pago no proporcionado' }
    const admin = createAdminClient()
    try {
        const now = new Date().toISOString()
        
        // 1. Obtener la recompensa
        const { data: reward, error: getError } = await admin
            .from('benefit_reward_payments')
            .select('referral_id')
            .eq('id', paymentId)
            .single()

        if (getError) throw getError

        // 2. Actualizar el pago
        const { data: updatedPayment, error: payError } = await admin
            .from('benefit_reward_payments')
            .update({
                status: 'paid',
                paid_at: now,
                payment_method: paymentMethod,
                payment_reference: paymentReference,
                notes: notes
            })
            .eq('id', paymentId)
            .select()
            .single()

        if (payError) throw payError

        // 3. Actualizar benefit_referrals
        if (reward && reward.referral_id) {
            await admin
                .from('benefit_referrals')
                .update({
                    status: 'reward_paid',
                    reward_paid_at: now
                })
                .eq('id', reward.referral_id)
        }

        return { success: true, data: updatedPayment }
    } catch (err: any) {
        console.error('❌ [ownerMarkRewardPaidAction] Error:', err)
        return { success: false, error: err.message }
    }
}

export async function ownerCancelRewardAction(paymentId: string, notes: string) {
    if (!paymentId || !notes) return { success: false, error: 'Parámetros incompletos' }
    const admin = createAdminClient()
    try {
        // 1. Obtener la recompensa
        const { data: reward, error: getError } = await admin
            .from('benefit_reward_payments')
            .select('referral_id')
            .eq('id', paymentId)
            .single()

        if (getError) throw getError

        // 2. Actualizar el pago a cancelado
        const { data: updatedPayment, error: payError } = await admin
            .from('benefit_reward_payments')
            .update({
                status: 'cancelled',
                notes: notes
            })
            .eq('id', paymentId)
            .select()
            .single()

        if (payError) throw payError

        // 3. Actualizar benefit_referrals a cancelado
        if (reward && reward.referral_id) {
            await admin
                .from('benefit_referrals')
                .update({
                    status: 'cancelled'
                })
                .eq('id', reward.referral_id)
        }

        return { success: true, data: updatedPayment }
    } catch (err: any) {
        console.error('❌ [ownerCancelRewardAction] Error:', err)
        return { success: false, error: err.message }
    }
}

export async function ownerGetRewardPaymentsAction() {
    const admin = createAdminClient()
    try {
        const { data, error } = await admin
            .from('benefit_reward_payments')
            .select(`
                *,
                referrer:referrer_organization_id(id, name),
                referral:referral_id(
                    id,
                    referred_name,
                    referred_email,
                    referred_phone,
                    status,
                    referred_registered_at,
                    plan_activated_at
                )
            `)
            .order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (err: any) {
        console.error('❌ [ownerGetRewardPaymentsAction] Error:', err)
        return { success: false, error: err.message }
    }
}

