'use server'

/**
 * Premium Services Actions
 * Prepared for future n8n/WhatsApp integration
 */

export async function preparePremiumLead(data: {
    serviceName: string;
    category: string;
    userName: string;
}) {
    // 1. Generate dynamic message
    const message = `Hola, quiero cotizar el servicio de ${data.serviceName} para mi condominio. ¿Me puedes dar más información?${data.userName ? ` Mi nombre es ${data.userName}.` : ''}`;

    // 2. Prepare Payload for n8n
    const payload = {
        timestamp: new Date().toISOString(),
        service_name: data.serviceName,
        category: data.category,
        user_name: data.userName,
        message,
        source: 'InmobiGo Dashboard'
    };

    // 3. Log for now (n8n preparation)
    console.group('🚀 [n8n Lead Preparation]');
    console.log('Payload Data:', payload);
    console.groupEnd();

    // 4. Return success (infrastructure ready)
    return {
        success: true,
        message: 'Lead preparado correctamente para n8n.',
        dynamicMessage: message
    };
}
