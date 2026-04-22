/**
 * Utility to parse Mexican CFDI (XML) files version 4.0
 */
export interface CFDI_Data {
    total: number;
    subtotal: number;
    iva: number;
    fecha: string; // YYYY-MM-DD
    emisor: string;
    moneda: string;
    version: string;
}

export function parse_CFDI_XML(xmlString: string): CFDI_Data | null {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        
        // CFDI 4.0 Namespace may vary, but localName is consistent
        const comprobante = xmlDoc.getElementsByTagNameNS("*", "Comprobante")[0] || 
                            xmlDoc.getElementsByTagName("cfdi:Comprobante")[0];

        if (!comprobante) return null;

        const total = parseFloat(comprobante.getAttribute("Total") || "0");
        const subtotal = parseFloat(comprobante.getAttribute("SubTotal") || "0");
        const fechaFull = comprobante.getAttribute("Fecha") || "";
        const fecha = fechaFull.split('T')[0];
        const moneda = comprobante.getAttribute("Moneda") || "MXN";
        const version = comprobante.getAttribute("Version") || "4.0";

        // Extract Emisor
        const emisorNode = xmlDoc.getElementsByTagNameNS("*", "Emisor")[0] || 
                           xmlDoc.getElementsByTagName("cfdi:Emisor")[0];
        const emisor = emisorNode?.getAttribute("Nombre") || "";

        // Extract IVA (Impuestos Trasladados)
        let iva = 0;
        const impuestosNode = xmlDoc.getElementsByTagNameNS("*", "Impuestos")[0];
        if (impuestosNode) {
            const totalTrasladados = impuestosNode.getAttribute("TotalImpuestosTrasladados");
            if (totalTrasladados) {
                iva = parseFloat(totalTrasladados);
            } else {
                // Fallback: search in Traslados
                const traslados = xmlDoc.getElementsByTagNameNS("*", "Traslado");
                for (let i = 0; i < traslados.length; i++) {
                    const impuesto = traslados[i].getAttribute("Impuesto");
                    if (impuesto === "002") { // 002 is IVA in SAT catalog
                        iva += parseFloat(traslados[i].getAttribute("Importe") || "0");
                    }
                }
            }
        }

        // final fallback: if iva is 0 but total > subtotal, use the difference
        if (iva === 0 && total > subtotal) {
            iva = total - subtotal;
        }

        return {
            total,
            subtotal,
            iva,
            fecha,
            emisor,
            moneda,
            version
        };
    } catch (error) {
        console.error("Error parsing CFDI XML:", error);
        return null;
    }
}
