// Simulation of the improved extraction logic from pdf-parser-action.ts
const simulateExtraction = (text) => {
    const cleanText = text.replace(/\s+/g, ' ');
    const allAmounts = text.match(/[\d,]+\.\d{2}/g)?.map(a => parseFloat(a.replace(/,/g, ''))) || [];
    const sortedAmounts = [...new Set(allAmounts)].sort((a, b) => b - a);

    const findAmountCloseTo = (label) => {
        const regex = new RegExp(`\\b${label}\\b[^\\d]*?([\\d,]+\\.\\d{2})`, 'i');
        const match = cleanText.match(regex);
        return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
    };

    let total = findAmountCloseTo('Total');
    let subtotal = findAmountCloseTo('Subtotal') || findAmountCloseTo('Sub-Total') || findAmountCloseTo('Base');
    let iva = 0;

    const ivaRegex = /(?:IVA|16\.00%|16%|Traslado|Impuesto 002)[^\d]*?([\d,]+\.\d{2})/i;
    const ivaMatch = cleanText.match(ivaRegex);
    if (ivaMatch) iva = parseFloat(ivaMatch[1].replace(/,/g, ''));

    if (total === 0 && sortedAmounts.length > 0) total = sortedAmounts[0]; 
    if (total > 0 && subtotal > 0 && iva === 0) iva = total - subtotal;
    if (total > 0 && iva > 0 && subtotal === 0) subtotal = total - iva;

    // Smart Guess
    const expectedIva = total * (0.16 / 1.16);
    const expectedSubtotal = total / 1.16;
    if (total > 0 && Math.abs(iva - (total - expectedSubtotal)) > 1) {
         const matchingIva = sortedAmounts.find(a => Math.abs(a - (total - expectedSubtotal)) < 1);
         if (matchingIva) {
             iva = matchingIva;
             subtotal = total - iva;
         }
    }

    if (total > 0 && subtotal === 0) subtotal = total - iva;
    if (subtotal > total) [total, subtotal] = [subtotal, total];

    return { total, subtotal, iva };
};

// Test Cases
const testCases = [
    {
        name: "User Reported Case: Total 116, Subtotal 100, IVA 16 (but noise causes 6)",
        // In the reported case, noise caused IVA to be 6 and Subtotal to be 110.
        // Let's assume the text has all amounts.
        text: "Factura Folio IVA-6.00-X Subtotal 100.00 Traslado 16.00 Total 116.00",
        expected: { total: 116, subtotal: 100, iva: 16 }
    },
    {
        name: "Case with 16% label",
        text: "IVA 16% 16.00 Base 100.00 Total 116.00",
        expected: { total: 116, subtotal: 100, iva: 16 }
    },
    {
        name: "Case with no IVA label but 116 total",
        text: "Subtotal: 100.00 Total a pagar: 116.00",
        expected: { total: 116, subtotal: 100, iva: 16 }
    }
];

testCases.forEach(tc => {
    const result = simulateExtraction(tc.text);
    const pass = result.total === tc.expected.total && 
                 result.subtotal === tc.expected.subtotal && 
                 result.iva === tc.expected.iva;
    console.log(`${pass ? '✅' : '❌'} ${tc.name}`);
    if (!pass) console.log("   Result:", result, "Expected:", tc.expected);
});
