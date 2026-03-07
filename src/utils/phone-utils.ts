/**
 * Normalizes a phone number for Mexican mobile format.
 * - Removes non-numeric characters.
 * - If 10 digits, prepends 521.
 * - If 12 digits starting with 52, inserts 1 after 52 (making it 521...).
 * - If already starts with 521 and is 13 digits, returns it as is (after cleaning).
 */
export function normalizeMexicanPhone(phone: string): string {
    if (!phone) return ''

    // Remove all non-numeric characters
    const clean = phone.replace(/\D/g, '')

    // If it's a 10-digit number (local Mexico mobile), prepend 521
    if (clean.length === 10) {
        return `521${clean}`
    }

    // If it's 12 digits and starts with 52, it might be 52 + 10 digits.
    // In Mexico, mobile international format is 52 + 1 + 10 digits = 13 digits.
    // Sometimes users skip the '1'.
    if (clean.length === 12 && clean.startsWith('52')) {
        return `521${clean.substring(2)}`
    }

    return clean
}
