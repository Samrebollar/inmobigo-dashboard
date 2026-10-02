import type { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { getReceiptStampAction, type ReceiptStamp, type ReceiptStampLookup } from '@/app/actions/receipt-stamp-actions'

const BLOCK_HEIGHT = 66
const FOOTER_Y = 270

function formatIssuedAt(iso: string): string {
    return new Date(iso).toLocaleString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Mexico_City',
    })
}

/**
 * Dibuja el bloque "Recibido y validado por la administración" con el QR de
 * verificación, la firma del validador, su cargo, la administración (Empresa o
 * Comité), la matrícula SEDETUS y el sello digital. Devuelve la Y final.
 */
export async function drawReceiptStamp(doc: jsPDF, stamp: ReceiptStamp, startY: number): Promise<number> {
    let y = Math.max(startY, 150)
    if (y + BLOCK_HEIGHT + 14 > FOOTER_Y) {
        doc.addPage()
        y = 20
    }

    const x = 14
    const width = 182
    const canceled = stamp.status === 'cancelado'
    const pending = stamp.status === 'firma_pendiente'

    // Marco
    doc.setDrawColor(canceled ? 220 : 199, canceled ? 38 : 210, canceled ? 38 : 254)
    doc.setFillColor(canceled ? 254 : 248, canceled ? 242 : 250, canceled ? 242 : 255)
    doc.setLineWidth(0.4)
    doc.roundedRect(x, y, width, BLOCK_HEIGHT, 3, 3, 'FD')

    // Título
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(canceled ? 185 : 79, canceled ? 28 : 70, canceled ? 28 : 229)
    doc.text(canceled ? 'RECIBO CANCELADO' : 'RECIBIDO Y VALIDADO POR LA ADMINISTRACIÓN', x + 5, y + 7)

    // Firma
    const sigX = x + 5
    const sigY = y + 10
    if (stamp.signatureDataUrl && !canceled) {
        try {
            const props = doc.getImageProperties(stamp.signatureDataUrl)
            const maxW = 58
            const maxH = 19
            const scale = Math.min(maxW / props.width, maxH / props.height)
            doc.addImage(stamp.signatureDataUrl, 'PNG', sigX, sigY, props.width * scale, props.height * scale, undefined, 'FAST')
        } catch {
            // Si la imagen no se puede leer, el bloque sigue con nombre y sello
        }
    } else if (pending) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(180, 120, 20)
        doc.text('Firma pendiente: se estampará al registrarla', sigX, sigY + 12)
    }
    doc.setDrawColor(150, 150, 150)
    doc.setLineWidth(0.2)
    doc.line(sigX, y + 30, sigX + 70, y + 30)

    // Firmante y administración
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(30, 30, 30)
    doc.text(stamp.signerName, sigX, y + 35)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    const lines = [
        stamp.signerPosition,
        stamp.adminLabel ? `En nombre de: ${stamp.adminLabel}` : null,
        stamp.adminLegalName ? `Razón social: ${stamp.adminLegalName}` : null,
        `Matrícula SEDETUS: ${stamp.sedetusNumber || 'Sin registrar'}`,
        `Validado: ${formatIssuedAt(stamp.issuedAt)}${stamp.validationMode === 'automatico' ? ' (pago en línea confirmado)' : stamp.validationMode === 'historico' ? ' (recibo de un pago anterior)' : ''}`,
    ].filter(Boolean) as string[]
    lines.forEach((line, i) => doc.text(doc.splitTextToSize(line, 115)[0], sigX, y + 40 + i * 4.2))

    if (stamp.sealShort) {
        doc.setFont('courier', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(120, 120, 120)
        doc.text(`Sello digital: ${stamp.sealShort}`, sigX, y + 40 + lines.length * 4.2 + 1.5)
    }

    // QR de verificación
    const qrSize = 40
    const qrX = x + width - qrSize - 8
    const qrDataUrl = await QRCode.toDataURL(stamp.verifyUrl, { margin: 1, width: 300, errorCorrectionLevel: 'M' })
    doc.addImage(qrDataUrl, 'PNG', qrX, y + 9, qrSize, qrSize, undefined, 'FAST')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(30, 30, 30)
    doc.text(stamp.shortCode, qrX + qrSize / 2, y + 54, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(110, 110, 110)
    doc.text('Escanea para verificar', qrX + qrSize / 2, y + 58, { align: 'center' })

    // Marca de agua de cancelado
    if (canceled) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(40)
        doc.setTextColor(220, 38, 38)
        doc.text('CANCELADO', 105, 150, { align: 'center', angle: 25 })
    }

    // Leyenda
    const legendY = y + BLOCK_HEIGHT + 5
    const verifyBase = stamp.verifyUrl.replace(/\/verificar\/.*$/, '/verificar')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(110, 110, 110)
    doc.text(
        doc.splitTextToSize(
            `Este recibo fue emitido y validado electrónicamente por la administración del condominio. Verifique su autenticidad escaneando el código QR o en ${verifyBase} con el código ${stamp.shortCode}.`,
            182
        ),
        x,
        legendY
    )
    return legendY + 8
}

/**
 * Busca el recibo oficial del pago y, si existe, estampa su bloque de
 * validación. Si el pago aún no está validado (sin recibo), no dibuja nada.
 * Nunca lanza: el PDF se descarga aunque no se pueda estampar.
 */
export async function stampReceiptPdf(doc: jsPDF, lookup: ReceiptStampLookup, startY: number): Promise<boolean> {
    try {
        const stamp = await getReceiptStampAction(lookup)
        if (!stamp) return false
        await drawReceiptStamp(doc, stamp, startY)
        return true
    } catch (error) {
        console.error('[receipt-stamp] No se pudo estampar el recibo:', error)
        return false
    }
}
