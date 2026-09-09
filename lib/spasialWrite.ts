/**
 * Spasial Google Sheets writer - accepts client precomputed values
 * (avoids uploading large xlsx through Vercel 4.5MB limit).
 */
import { getSheetsClient } from "@/lib/sheets";
import {
  spasialTasksForGroup,
  spasialEnvForGroup,
  cleanKey,
  type PrecomputedTask,
  type SpasialMode,
} from "@/lib/spasialCore";

async function ensureMonthSheet(
  sheetsApi: Awaited<ReturnType<typeof getSheetsClient>>,
  spreadsheetId: string,
  monthLabel: string
): Promise<string> {
  const meta = await sheetsApi.spreadsheets.get({
    spreadsheetId,
    includeGridData: false,
  });
  const titles = (meta.data.sheets || []).map((s) => s.properties?.title || "");
  if (titles.includes(monthLabel)) return monthLabel;

  const template =
    titles.find((t) => /maret/i.test(t)) ||
    titles.find((t) => /\d{4}/.test(t)) ||
    titles[0];
  if (!template) throw new Error("Spreadsheet Spasial kosong (tidak ada sheet).");

  const src = (meta.data.sheets || []).find((s) => s.properties?.title === template);
  const sheetId = src?.properties?.sheetId;
  if (sheetId == null) throw new Error(`Sheet template '${template}' tidak ditemukan.`);

  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          duplicateSheet: {
            sourceSheetId: sheetId,
            insertSheetIndex: 0,
            newSheetName: monthLabel,
          },
        },
      ],
    },
  });
  return monthLabel;
}

function colToA1(colIdx: number): string {
  let n = colIdx + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function findColIdx(headersClean: string[], label: string): number {
  const labelClean = label.toLowerCase().replace(/[\s_\-]/g, "");
  let colIdx = headersClean.findIndex((h) => h === labelClean);
  if (colIdx < 0)
    colIdx = headersClean.findIndex(
      (h) => h.includes(labelClean) || labelClean.includes(h)
    );
  if (colIdx < 0) {
    const aliases: Record<string, string[]> = {
      jumlahue: ["jumlahue", "jumlahkartuue", "ueberedar", "kartuue"],
      registered: ["registered", "terdaftar"],
      unregistered: ["unregistered", "tdkterdaftar"],
      chipbased: ["chipbased", "chip", "uechip"],
      serverbased: ["serverbased", "server", "ueserver"],
      danafloat: ["danafloat", "float", "danauang"],
      mesinreader: ["mesinreader", "reader", "jumlahreader"],
      kartukredit: ["kartukredit", "jumlahkartukredit", "jumlahkk", "kk"],
      outstanding: ["outstanding", "nilaioutstanding"],
      npl: ["npl", "nilainpl"],
      voltunai: ["voltunai", "volumetunai"],
      nomtunai: ["nomtunai", "nominaltunai", "nilaitunai"],
      volbelanja: ["volbelanja", "volumebelanja"],
      nombelanja: ["nombelanja", "nominalbelanja", "nilaibelanja"],
      volbillpayment: ["volbillpayment", "volbill", "billpayment", "volumebill"],
      nombillpayment: ["nombillpayment", "nombill", "nominalbill", "nilaibill"],
    };
    const al = aliases[labelClean] || [];
    colIdx = headersClean.findIndex((h) =>
      al.some((a) => h.includes(a) || a.includes(h))
    );
  }
  return colIdx;
}

export async function processSpasialPrecomputed(opts: {
  group: string;
  monthLabel: string;
  dryRun: boolean;
  precomputed: PrecomputedTask[];
  onProgress?: (msg: string, index: number, total: number) => void;
}): Promise<{
  results: Array<Record<string, unknown>>;
  summary: { total: number; ok: number; errors: number };
}> {
  const tasks = spasialTasksForGroup(opts.group);
  if (!tasks) throw new Error(`Group spasial tidak dikenal: ${opts.group}`);

  const envKey = spasialEnvForGroup(opts.group);
  const spreadsheetId = process.env[envKey];
  if (!spreadsheetId) {
    return {
      results: opts.precomputed.map((t) => ({
        job: t.label,
        status: "error",
        reason: `Env ${envKey} belum di-set`,
      })),
      summary: { total: opts.precomputed.length, ok: 0, errors: opts.precomputed.length },
    };
  }

  // dry-run without sheet access: report file match stats only
  if (opts.dryRun) {
    const results = opts.precomputed.map((t) => ({
      job: t.label,
      status: t.file || Object.keys(t.values).length ? "ok" : "warn",
      file: t.file,
      spatialKeys: t.spatialKeys,
      lsbuKeys: t.lsbuKeys,
      nonzero: Object.values(t.values).filter((v) => v !== 0).length,
      // kartu diagnostics: harus sumExpr1 - sumExpr2
      sumExpr1: t.sumExpr1,
      sumExpr2: t.sumExpr2,
      exprCols: t.exprCols,
      formula:
        t.mode === "kartu"
          ? `sum(expr_1)-sum(expr_2)=${(t.sumExpr1 || 0) - (t.sumExpr2 || 0)}`
          : t.mode,
      mode: "dry-run-client-parse",
    }));
    return {
      results,
      summary: {
        total: results.length,
        ok: results.filter((r) => r.status === "ok").length,
        errors: 0,
      },
    };
  }

  const sheetsApi = await getSheetsClient();
  const sheetName = await ensureMonthSheet(sheetsApi, spreadsheetId, opts.monthLabel);

  const res = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName.replace(/'/g, "''")}'`,
    majorDimension: "ROWS",
  });
  const grid = (res.data.values || []) as string[][];
  if (!grid.length) throw new Error(`Sheet '${sheetName}' kosong.`);

  const headers = grid[0].map((h) => String(h ?? ""));
  const headersClean = headers.map((h) =>
    h.toLowerCase().replace(/[\s_\-]/g, "")
  );
  const keyByRow: string[] = [];
  for (let i = 1; i < grid.length; i++) keyByRow[i] = cleanKey(grid[i]?.[1]);

  const byLabel = new Map(opts.precomputed.map((p) => [p.label, p]));
  const results: Array<Record<string, unknown>> = [];
  let ok = 0;
  let errors = 0;

  for (let ti = 0; ti < tasks.length; ti++) {
    const task = tasks[ti];
    opts.onProgress?.(task.label, ti + 1, tasks.length);
    try {
      const pre = byLabel.get(task.label);
      if (!pre) {
        results.push({
          job: task.label,
          status: "warn",
          reason: "Tidak ada data precomputed",
        });
        continue;
      }
      const colIdx = findColIdx(headersClean, task.label);
      if (colIdx < 0) {
        results.push({
          job: task.label,
          status: "error",
          reason: `Kolom tidak ditemukan untuk '${task.label}'`,
          headersSample: headers.slice(0, 15),
        });
        errors++;
        continue;
      }

      const mode = pre.mode as SpasialMode;
      const data: { range: string; values: (string | number)[][] }[] = [];
      let written = 0;
      for (let r = 1; r < grid.length; r++) {
        const k = keyByRow[r];
        if (!k || k === "n/a") continue;
        const val = pre.values[k] ?? 0;
        const cell =
          mode === "nom" || mode === "col_juta"
            ? Math.round(val * 100) / 100
            : Math.round(val);
        const a1 = `'${sheetName.replace(/'/g, "''")}'!${colToA1(colIdx)}${r + 1}`;
        data.push({ range: a1, values: [[cell]] });
        written++;
      }
      for (let i = 0; i < data.length; i += 400) {
        const chunk = data.slice(i, i + 400);
        await sheetsApi.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: { valueInputOption: "USER_ENTERED", data: chunk },
        });
      }

      results.push({
        job: task.label,
        status: "ok",
        file: pre.file,
        column: headers[colIdx],
        sheet: sheetName,
        written,
        spatialKeys: pre.spatialKeys,
        lsbuKeys: pre.lsbuKeys,
        mode: "write-client-parse",
      });
      ok++;
    } catch (e) {
      results.push({
        job: task.label,
        status: "error",
        reason: e instanceof Error ? e.message : String(e),
      });
      errors++;
    }
  }

  return { results, summary: { total: tasks.length, ok, errors } };
}
