import { describe, expect, it } from "vitest";
import { isValidBarcodeFormat } from "@/lib/validation/barcode";

describe("isValidBarcodeFormat", () => {
  it("accepts a 13-digit EAN", () => {
    expect(isValidBarcodeFormat("9780201379624")).toBe(true);
  });

  it("accepts a 12-digit UPC", () => {
    expect(isValidBarcodeFormat("036000291452")).toBe(true);
  });

  it("accepts shorter codes (8 digits)", () => {
    expect(isValidBarcodeFormat("12345678")).toBe(true);
  });

  it("accepts 14-digit GTIN codes", () => {
    expect(isValidBarcodeFormat("12345678901234")).toBe(true);
  });

  it("rejects non-digits", () => {
    expect(isValidBarcodeFormat("03600029145A")).toBe(false);
    expect(isValidBarcodeFormat("abc-def")).toBe(false);
  });

  it("rejects too short or too long", () => {
    expect(isValidBarcodeFormat("123")).toBe(false);
    expect(isValidBarcodeFormat("123456789012345")).toBe(false);
  });

  it("rejects the empty string", () => {
    expect(isValidBarcodeFormat("")).toBe(false);
  });
});
