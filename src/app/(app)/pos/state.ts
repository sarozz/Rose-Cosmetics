export type CheckoutFormState = {
  fieldErrors: Record<string, string>;
  formError: string | null;
  saleRef?: string;
};

export const emptyCheckoutState: CheckoutFormState = {
  fieldErrors: {},
  formError: null,
};

export type ScanResult =
  | {
      ok: true;
      product: {
        id: string;
        name: string;
        brand: string | null;
        barcode: string | null;
        sku: string | null;
        sellPrice: string;
        currentStock: number;
      };
    }
  | { ok: false; error: string };
