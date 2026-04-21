/**
 * EAN-13 / UPC-A checksum validation.
 *
 * Scanners emit digits only. UPC-A is 12 digits, EAN-13 is 13 digits, both use
 * the same mod-10 checksum algorithm where the check digit makes the weighted
 * sum divisible by 10.
 */
export function isValidBarcodeFormat(raw: string): boolean {
  if (!/^\d+$/.test(raw)) return false;
  if (raw.length !== 12 && raw.length !== 13) return false;
  return hasValidChecksum(raw);
}

function hasValidChecksum(digits: string): boolean {
  const nums = digits.split("").map(Number);
  const check = nums[nums.length - 1];
  const body = nums.slice(0, -1);
  // EAN-13 weights are (1,3,1,3,...); UPC-A weights are (3,1,3,1,...).
  // Both normalize to: position from the right (excluding check digit) weighted
  // 3 for odd positions and 1 for even.
  const sum = body
    .reverse()
    .reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 3 : 1), 0);
  const computed = (10 - (sum % 10)) % 10;
  return computed === check;
}
