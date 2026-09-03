import {
  buildValueMap,
  findBestFile,
  type Row,
} from "@/lib/parse";
import { updateMonthColumn } from "@/lib/sheets";
import { updateMesinAtmMatrix, updateEdcMatrix } from "@/lib/matrix";
import { type SheetJob } from "@/lib/tasks";
import {
  mergeLsbuDebit,
  mergeLsbuKkSumCols,
  KK_LSBU_MAP,
  mergeLsbuAcquirer,
  ACQUIRER_LSBU_JENIS,
  mergeLsbuUeByJenis,
  mergeLsbuFraudBank,
  mergeLsbuFraudPenyebab,
  mergeLsbuForma0303,
  mergeLsbuDebitTrx,
  lsbuMesinAtmRows,
  DEBIT_TRX_LSBU,
  UE_LSBU_MAP,
  ACQUIRER_0303_MAP,
  type LsbuKind,
} from "@/lib/lsbu";

const ENV_ALIASES: Record<string, string[]> = {
  SHEET_ACQUIRER_EDC: [
    "SHEET_ACQUIRER_TAHUN",
    "SHEET_ACQUIRER",
    "SHEET_ACQUIRER_MESIN",
    "SHEET_ACQUIRER_EDC",
  ],
  SHEET_ACQUIRER_TRX: [
    "SHEET_ACQUIRER_TRX",
    "SHEET_ACQUIRER_TRANSAKSI",
    "SHEET_ACQUIRER",
  ],
};

function resolveSpreadsheetId(primaryEnv: string): string | undefined {
  const keys = [primaryEnv, ...(ENV_ALIASES[primaryEnv] || [])];
  const seen = new Set<string>();
  for (const k of keys) {
    if (seen.has(k)) continue;
    seen.add(k);
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  return undefined;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function isQuotaError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /429|Quota exceeded|rate limit|Write requests per minute/i.test(msg);
}

function basename(name: string): string {
  return name.toLowerCase().replace(/\\/g, "/").split("/").pop() || "";
}

function pickUeTransferFile(
  parsed: { name: string; rows: Row[] }[],
  jobName: string
): { name: string; rows: Row[] } | undefined {
  const n = jobName.toLowerCase();
  if (n.includes("pemerintah")) {
    return parsed.find((p) => {
      const b = basename(p.name);
      return b.includes("pemerintah") || b.includes("transfer_pem");
    });
  }
  if (n.includes("rek")) {
    return parsed.find((p) => {
      const b = basename(p.name);
      return (
        b.includes("rekening") ||
        b.includes("transfer_rek") ||
        (b.includes("rek") && b.includes("transfer"))
      );
    });
  }
  if (n === "vol transfer" || n === "nom transfer") {
    return parsed.find((p) => {
      const b = basename(p.name);
      if (!b.includes("transfer")) return false;
      if (b.includes("rekening") || b.includes("transfer_rek")) return false;
      if (b.includes("pemerintah") || b.includes("transfer_pem")) return false;
      return true;
    });
  }
  return undefined;
}

export async function processOneJob(opts: {
  job: SheetJob;
  group: string;
  dryRun: boolean;
  monthLabel: string;
  parsed: { name: string; rows: Row[] }[];
  lsbuByKind: (k: LsbuKind) => Row[];
}): Promise<Record<string, unknown>[]> {
  const { job, group, dryRun, monthLabel, parsed, lsbuByKind } = opts;
  const outRows: Record<string, unknown>[] = [];

  let file =
    group === "ue" && job.name.toLowerCase().includes("transfer")
      ? pickUeTransferFile(parsed, job.name) || findBestFile(parsed, job.fileHints)
      : findBestFile(parsed, job.fileHints);

  let map = new Map<string, number>();
  let source: "csv" | "none" = "none";
  let matrixRows: Row[] | null = file ? file.rows : null;

  if (file) {
    source = "csv";
    map = buildValueMap(
      file.rows,
      job.valueColumn,
      job.divideBy,
      job.keyColumn,
      job.filterJenis,
      job.filterMesin
    );
  }

  if (group === "debit") {
    const r0302 = lsbuByKind("forma0302");
    if (r0302.length) {
      if (job.valueColumn === "jumlah") {
        if (job.name.includes("ATM+Debet")) {
          const m = mergeLsbuDebit(r0302, { kartuDebit: map });
          if (m.addedDebit)
            outRows.push({
              job: `${job.name} [LSBU 0302]`,
              status: "info",
              reason: `+${m.addedDebit} KARTU_ATM_DEBIT`,
            });
        } else if (job.name.includes("Kartu ATM")) {
          const m = mergeLsbuDebit(r0302, { kartuAtm: map });
          if (m.addedAtm)
            outRows.push({
              job: `${job.name} [LSBU 0302]`,
              status: "info",
              reason: `+${m.addedAtm} KARTU_ATM`,
            });
        }
      }
      for (const rule of DEBIT_TRX_LSBU) {
        if (rule.match.some((m) => job.name === m)) {
          const n = mergeLsbuDebitTrx(
            r0302,
            map,
            rule.jenis,
            (rule as any).valueCols || (rule as any).valueCol,
            rule.divideBy
          );
          if (n)
            outRows.push({
              job: `${job.name} [LSBU 0302]`,
              status: "info",
              reason: `+${n} ${rule.jenis.join("|")}`,
            });
        }
      }
      if (job.kind === "matrix-atm") {
        const extra = lsbuMesinAtmRows(r0302);
        if (extra.length) {
          matrixRows = [...(matrixRows || []), ...extra];
          outRows.push({
            job: `${job.name} [LSBU 121]`,
            status: "info",
            reason: `+${extra.length} id dari 121`,
          });
        }
      }
    }
  }

  if (group === "ue") {
    const r0302 = lsbuByKind("forma0302");
    if (r0302.length) {
      for (const rule of UE_LSBU_MAP) {
        if (!rule.match.some((m) => job.name === m)) continue;
        const n = mergeLsbuUeByJenis(r0302, map, rule.jenis, rule.valueCol, rule.divideBy);
        if (n)
          outRows.push({
            job: `${job.name} [LSBU 0302]`,
            status: "info",
            reason: `+${n} ${rule.jenis[0]}`,
          });
        break;
      }
    }
  }

  if (group === "kk") {
    const r = lsbuByKind("forma0301");
    if (r.length) {
      for (const rule of KK_LSBU_MAP) {
        if (job.name !== rule.match) continue;
        const n = mergeLsbuKkSumCols(r, map, rule.cols, rule.divideBy);
        if (n)
          outRows.push({
            job: `${job.name} [LSBU 0301]`,
            status: "info",
            reason: `+${n} ${rule.label}`,
          });
        break;
      }
    }
  }

  if (group === "acquirer") {
    const r0304 = lsbuByKind("forma0304");
    if (r0304.length && (file || job.kind === "matrix-edc")) {
      const isMerchant = job.name.startsWith("Merchant");
      const isEdcMatrix = job.kind === "matrix-edc";
      for (const rule of ACQUIRER_LSBU_JENIS) {
        const matchJob =
          (rule.hints.includes("debet") && job.name.includes("Debet")) ||
          (rule.hints.includes("kredit") && job.name.includes("Kredit")) ||
          (rule.hints.includes("ue") &&
            (job.name === "EDC UE" ||
              job.name === "Merchant UE" ||
              job.sheetName.includes("Uang Elektronik"))) ||
          (rule.hints.includes("gabungan") && job.name.includes("Gabungan"));
        if (!matchJob || !isEdcMatrix) continue;
        const field = isMerchant ? "JUMLAH_MERCHANT" : "JUMLAH_MESIN";
        const tmp = new Map<string, number>();
        const n = mergeLsbuAcquirer(r0304, rule.jenis, tmp, field);
        if (n) {
          const extra: Row[] = [...tmp.entries()].map(([id, v]) => ({
            idpelapor: id,
            statusmesin: "OL",
            expr_1: isMerchant ? "0" : String(v),
            expr_2: isMerchant ? String(v) : "0",
          }));
          matrixRows = [...(matrixRows || []), ...extra];
          outRows.push({
            job: `${job.name} [LSBU 0304]`,
            status: "info",
            reason: `+${n} ${rule.jenis} (${field})`,
          });
        }
      }
    }
    const r0303 = lsbuByKind("forma0303");
    if (r0303.length) {
      for (const rule of ACQUIRER_0303_MAP) {
        if (rule.match.some((m) => job.name === m)) {
          const n = mergeLsbuForma0303(r0303, map, rule.transaksi, rule.field, rule.divideBy);
          if (n)
            outRows.push({
              job: `${job.name} [LSBU 0303]`,
              status: "info",
              reason: `+${n} ${rule.transaksi}`,
            });
        }
      }
    }
  }

  if (group === "fraud_bank") {
    const r = lsbuByKind("forma0306");
    if (r.length) {
      const card = job.name.includes("Kredit")
        ? "100-Kartu Kredit"
        : job.name.includes("Debet") || job.name.includes("ATM")
          ? "200-Kartu ATM dan Debet"
          : job.name.includes("UE")
            ? "500-Uang Elektronik"
            : "";
      if (card) {
        const field =
          job.valueColumn === "expr_2" ? "NOMINAL_FRAUD_ACTUAL" : "VOLUME_FRAUD_ACTUAL";
        const n = mergeLsbuFraudBank(r, map, card, field, job.divideBy);
        if (n)
          outRows.push({
            job: `${job.name} [LSBU 0306]`,
            status: "info",
            reason: `+${n} ${card}`,
          });
      }
    }
  }

  if (group === "fraud_penyebab") {
    const r = lsbuByKind("forma0306");
    if (r.length) {
      const card = job.name.includes("Kredit")
        ? "100-Kartu Kredit"
        : job.name.includes("Debet") || job.name.includes("ATM")
          ? "200-Kartu ATM dan Debet"
          : job.name.includes("UE")
            ? "500-Uang Elektronik"
            : "";
      if (card) {
        const field =
          job.valueColumn === "expr_2" ? "NOMINAL_FRAUD_ACTUAL" : "VOLUME_FRAUD_ACTUAL";
        const n = mergeLsbuFraudPenyebab(r, map, card, field, job.divideBy);
        if (n)
          outRows.push({
            job: `${job.name} [LSBU 0306 map]`,
            status: "info",
            reason: `+${n} CP/PL/HD/TD/FA/X`,
          });
      }
    }
  }

  const spreadsheetId = resolveSpreadsheetId(job.spreadsheetEnv);
  if (!spreadsheetId) {
    const tried = ENV_ALIASES[job.spreadsheetEnv]
      ? [job.spreadsheetEnv, ...ENV_ALIASES[job.spreadsheetEnv]]
      : [job.spreadsheetEnv];
    outRows.push({
      job: job.name,
      status: "error",
      reason: `Env ${tried.join(" / ")} belum di-set`,
      ids: map.size,
      source,
    });
    return outRows;
  }

  if (dryRun) {
    let matrixSourceIds = 0;
    let matrixNonZero = 0;
    if ((job.kind === "matrix-edc" || job.kind === "matrix-atm") && matrixRows?.length) {
      const seen = new Set<string>();
      for (const r of matrixRows) {
        const id = String(r.idpelapor || r.SANDI_PELAPOR || "").trim();
        if (!id) continue;
        seen.add(id);
        const v1 = Number(String(r.expr_1 || r.jumlah || "0").replace(/,/g, ""));
        const v2 = Number(String(r.expr_2 || "0").replace(/,/g, ""));
        if (v1 || v2) matrixNonZero++;
      }
      matrixSourceIds = seen.size;
    }
    outRows.push({
      job: job.name,
      status:
        source === "none" && !map.size && !matrixSourceIds
          ? "dry-run-copy-previous"
          : "dry-run",
      sheet: job.sheetName,
      kind: job.kind || "column",
      file: file?.name || null,
      ids: job.kind?.startsWith("matrix") ? matrixSourceIds : map.size,
      matrixRows: matrixRows?.length || 0,
      matrixNonZero,
      monthLabel,
      source: matrixRows?.length ? (file ? "csv+lsbu" : "lsbu") : source,
      filterJenis: job.filterJenis || null,
      filterMesin: job.filterMesin || null,
      sample: [...map.entries()].slice(0, 3),
    });
    return outRows;
  }

  if (job.kind === "matrix-atm") {
    if (!matrixRows?.length) {
      outRows.push({
        job: job.name,
        status: "skip-matrix-no-data",
        reason: "Butuh CSV mesin_atm dan/atau LSBU 121",
      });
      return outRows;
    }
    const out = await updateMesinAtmMatrix({
      spreadsheetId,
      sheetName: job.sheetName,
      monthLabel,
      rows: matrixRows,
    });
    outRows.push({
      job: job.name,
      status: "ok",
      sheet: job.sheetName,
      file: file?.name || null,
      ...out,
    });
    return outRows;
  }

  if (job.kind === "matrix-edc") {
    if (!matrixRows?.length) {
      outRows.push({
        job: job.name,
        status: "skip-matrix-no-data",
        reason: "Butuh CSV EDC dan/atau LSBU 0304",
      });
      return outRows;
    }
    const out = await updateEdcMatrix({
      spreadsheetId,
      sheetName: job.sheetName,
      monthLabel,
      rows: matrixRows,
      valueField: job.valueColumn,
    });
    outRows.push({
      job: job.name,
      status: "ok",
      sheet: job.sheetName,
      file: file?.name || null,
      ...out,
    });
    return outRows;
  }

  const out = await updateMonthColumn({
    spreadsheetId,
    sheetName: job.sheetName,
    monthLabel,
    valuesById: map,
    copyIfEmpty: true,
  });
  outRows.push({
    job: job.name,
    status: out.mode === "write" ? "ok" : out.mode,
    sheet: job.sheetName,
    file: file?.name || null,
    ids: map.size,
    monthLabel,
    source,
    ...out,
  });
  return outRows;
}
