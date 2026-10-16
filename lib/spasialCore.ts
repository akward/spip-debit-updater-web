/**
 * Browser + server safe Spasial aggregation (no Node-only APIs).
 * Used by client pre-parse and server fallback.
 *
 * Key mapping = notebook Spasial UE + KK Google Sheet:
 *   blank / "" / "0" / nan → "n/a" (also aliased as "0000")
 *   else first-4 digits zfill (LSBU: str[:4].zfill(4))
 * Instrumen/txn: spatial + LSBU; blank lokasi = spatial saja (tanpa LSBU)
 * Nom ATM/Debet (Google Sheet): sum(expr_2) / 1_000_000 TANPA LSBU
 * Nom UE: (sum(expr_2) + LSBU) / 1_000_000
 */
export type SpasialMode =
  | "kartu"
  | "kk_sum"
  | "mesin"
  | "vol"
  | "nom"
  | "col_raw"
  | "col_juta"
  | "reader";

export type SpasialTask = {
  label: string;
  fileHints: string[];
  spKey: string;
  mode: SpasialMode;
  valueCol?: string;
  valueCols?: string[];
  lsbuCodes?: string[];
  lsbuCols?: string[];
};

// NOTE: full file content is large — loaded from local patched copy
