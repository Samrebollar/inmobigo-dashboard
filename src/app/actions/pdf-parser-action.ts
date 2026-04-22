'use server'

import { PDFParse } from 'pdf-parse'
import path from 'path'
import { pathToFileURL } from 'url'

export interface PDFExtractedData {
    success: boolean;
    data?: {
        total: number;
        subtotal: number;
        iva: number;
        fecha: string;
        emisor: string;
        description: string;
    };
    error?: string;
}

// Configuramos el worker para evitar errores en Next.js SSR (Windows requiere file://)
const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
PDFParse.setWorker(pathToFileURL(workerPath).href);

export async function parseInvoicePDF(formData: FormData): Promise<PDFExtractedData> {
    try {
        const file = formData.get('file') as File;
        if (!file) return { success: false, error: 'No file provided' };

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        const text = result.text;

        console.log('PDF Text extracted:', text.substring(0, 500)); // Debug

        // --- EXTRACTOR LÓGICA (ROBUSTA V3 - FISCAL MEXICO) ---
        
        const cleanText = text.replace(/\s+/g, ' ');
        
        // 1. Extraer TODOS los montos posibles del documento ($ XX.XX o XX.XX)
        const allAmounts = text.match(/[\d,]+\.\d{2}/g)?.map(a => parseFloat(a.replace(/,/g, ''))) || [];
        const sortedAmounts = [...new Set(allAmounts)].sort((a, b) => b - a); // Únicos y descendentes

        // 2. Emisor (Búsqueda multilineal)
        let emisor = '';
        const emisorMatch = text.match(/Nombre emisor:\s*([^\n\r]*)/i) || 
                           text.match(/Emisor:\s*([^\n\r]*)/i) ||
                           text.match(/RFC emisor:\s*[A-Z0-9]{12,13}\s+([^\n\r]*)/i) ||
                           text.match(/Razón Social:\s*([^\n\r]*)/i);
        if (emisorMatch) emisor = emisorMatch[1].trim().split('RFC:')[0].trim();

        // 3. Fecha
        let fecha = new Date().toISOString().split('T')[0];
        const fechaMatch = text.match(/(\d{4}-\d{2}-\d{2})/g) || 
                          text.match(/(\d{2}\/\d{2}\/\d{4})/g);
        if (fechaMatch) {
            const rawDate = fechaMatch[0];
            if (rawDate.includes('/')) {
                const [d, m, y] = rawDate.split('/');
                fecha = `${y}-${m}-${d}`;
            } else {
                fecha = rawDate;
            }
        }

        // 4. Lógica de Montos "Ultra Smart"
        const findAmountCloseTo = (label: string) => {
            // Buscamos la etiqueta y el primer número con decimales que le siga (saltando palabras, símbolos, etc.)
            // Permitimos porcentajes como "16%" o "8%" entre la etiqueta y el monto
            const regex = new RegExp(`\\b${label}\\b[^\\d]*?([\\d,]+\\.\\d{2})`, 'i');
            const match = cleanText.match(regex);
            return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
        };

        let total = findAmountCloseTo('Total');
        let subtotal = findAmountCloseTo('Subtotal') || findAmountCloseTo('Sub-Total') || findAmountCloseTo('Base');
        let iva = 0;

        // Búsqueda específica de IVA (002, 16%, etc)
        const ivaRegex = /(?:IVA|16\.00%|16%|Traslado|Impuesto 002)[^\d]*?([\d,]+\.\d{2})/i;
        const ivaMatch = cleanText.match(ivaRegex);
        if (ivaMatch) iva = parseFloat(ivaMatch[1].replace(/,/g, ''));

        // --- VALIDACIÓN CRUZADA Y RECONSTRUCCIÓN ---
        
        // Si no detectamos el Total explícitamente, tomamos el monto más alto
        if (total === 0 && sortedAmounts.length > 0) {
            total = sortedAmounts[0]; 
        }

        // Caso: Tenemos Total y Subtotal, pero no IVA
        if (total > 0 && subtotal > 0 && iva === 0) {
            const diff = total - subtotal;
            if (diff > 0) iva = diff;
        }

        // Caso: Tenemos Total e IVA, pero no Subtotal
        if (total > 0 && iva > 0 && subtotal === 0) {
            subtotal = total - iva;
        }

        // Caso: "SaaS Smart Guess" para México (16% IVA)
        // Si IVA parece incorrecto (como el 6 reportado), verificamos si existe un 16% real en los montos descargados
        const expectedIva = total * (0.16 / 1.16);
        const expectedSubtotal = total / 1.16;

        // Si el IVA encontrado no cuadra con el 16%, buscamos en allAmounts si hay uno que sí cuadre
        if (total > 0 && Math.abs(iva - (total - expectedSubtotal)) > 1) {
             const matchingIva = sortedAmounts.find(a => Math.abs(a - (total - expectedSubtotal)) < 1);
             if (matchingIva) {
                 iva = matchingIva;
                 subtotal = total - iva;
             }
        }

        // Saneamiento final
        if (total > 0 && subtotal === 0) subtotal = total - iva;
        if (subtotal > total) {
            const tmp = total;
            total = subtotal;
            subtotal = tmp;
        }

        let description = emisor ? `Gasto: ${emisor}` : 'Gasto por factura PDF';

        if (total === 0) {
            return { success: false, error: 'No se detectaron montos válidos. ¿El PDF es una imagen o escaneo?' };
        }

        return {
            success: true,
            data: {
                total,
                subtotal,
                iva,
                fecha,
                emisor,
                description
            }
        };
    } catch (error: any) {
        console.error('Error parsing PDF:', error);
        return { success: false, error: 'Error al procesar el PDF: ' + error.message };
    }
}
