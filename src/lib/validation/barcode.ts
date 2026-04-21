/**
 * Barcode format validation.
 *
 * Real-world shop barcodes are not always checksum-perfect EAN-13 / UPC-A:
 * imported cosmetics often carry 8–14 digit codes, and shops sometimes use
 * their own internal codes. We accept any 8–14 digit numeric string so
 * manual entry and non-standard scanners both work. Scanners themselves
 * can produce any digit length depending on the symbology.
 */
export function isValidBarcodeFormat(raw: string): boolean {
  return /^\d{8,14}$/.test(raw);
}
