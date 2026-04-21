import { describe, expect, it } from "vitest";
import { isValidBarcodeFormat } from "@/lib/validation/barcode";

describe("isValidBarcodeFormat", () => {
  it("accepts a valid EAN-13", () => {
    // 978020137962 + check digit 3 = "9780201379624" (example ISBN-EAN)
    expect(isValidBarcodeFormat("9780201379624")).toBe(true);
  });

  it("accepts a valid UPC-A", () => {
    // 03600029145 + check digit 2 = "036000291452" (classic example)
    expect(isValidBarcodeFormat("036000291452")).toBe(true);
  });

  it("rejects a wrong check digit", () => {
    expect(isValidBarcodeFormat("036000291450")).toBe(false);
  });

  it("rejects non-digits", () => {
    expect(isValidBarcodeFormat("03600029145A")).toBe(false);
    expect(isValidBarcodeFormat("abc-def")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidBarcodeFormat("123")).toBe(false);
    expect(isValidBarcodeFormat("12345678901234")).toBe(false);
  });

  it("rejects the empty string", () => {
    expect(isValidBarcodeFormat("")).toBe(false);
  });
});
