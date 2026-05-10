export type OnlineFormState = {
  fieldErrors: Record<string, string>;
  formError: string | null;
};

export const emptyOnlineState: OnlineFormState = {
  fieldErrors: {},
  formError: null,
};

export type OnlineScanResult =
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
