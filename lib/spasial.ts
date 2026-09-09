/**
 * Spasial server processor — falls back to buffer path when client precomputed is absent.
 * Aggregation helpers live in spasialCore (browser-safe).
 */
import { getSheetsClient } from "@/lib/sheets";
import {
  spasialTasksForGroup,
  spasialEnvForGroup,
  cleanKey,
  aggregateSpatial,
  aggregateLsbu,
  finalValues,
  type SpasialTask,
  type Row,
} from "@/lib/spasialCore";
import * as XLSX from "xlsx";

export { spasialTasksForGroup, spasialEnvForGroup };

function rowsFromXlsxBuf(buf: ArrayBuffer): Row[] {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];
  if (!aoa.length) return [];
  const headers = (aoa[0] || []).map((h) => String(h ?? "").trim());
  const rows: Row[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i] || [];
    const obj: Row = {};
    let empty = true;
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `col_${c}`;
      const val = r[c];
      if (val !== "" && val != null) empty = false;
      obj[key] = val;
      obj[key.toLowerCase()] = val;
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}

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
  return colIdx;
}

export async function processSpasialGroup(opts: {
  group: string;
  monthLabel: string;
  dryRun: boolean;
  spatialFiles: { name: string; buf: ArrayBuffer }[];
  lsbuRows: Row[];
  onProgress?: (msg: string, index: number, total: number) => void;
}): Promise<{
  results: Array<Record<string, unknown>>;
  summary: { total: number; ok: number; errors: number };
}> {
  const tasks = spasialTasksForGroup(opts.group);
  if (!tasks) throw new Error(`Group spasial tidak dikenal: ${opts.group}`);

  const parsed = opts.spatialFiles.map((f) => ({
    name: f.name,
    rows: rowsFromXlsxBuf(f.buf),
  }));

  if (opts.dryRun) {
    const results = tasks.map((t) => {
      const file = parsed.find((p) =>
        t.fileHints.some((h) =>
          p.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").includes(
            h.toLowerCase().replace(/[^a-z0-9]+/g, "_")
          )
        )
      );
      const sp = file ? aggregateSpatial(file.rows, t) : {};
      const lsbu = aggregateLsbu(opts.lsbuRows, t);
      return {
        job: t.label,
        status: file || Object.keys(sp).length ? "ok" : "warn",
        file: file?.name || null,
        spatialKeys: Object.keys(sp).length,
        lsbuKeys: Object.keys(lsbu).length,
        mode: "dry-run-server",
      };
    });
    return {
      results,
      summary: {
        total: results.length,
        ok: results.filter((r) => r.status === "ok").length,
        errors: 0,
      },
    };
  }

  const envKey = spasialEnvForGroup(opts.group);
  const spreadsheetId = process.env[envKey];
  if (!spreadsheetId) {
    return {
      results: tasks.map((t) => ({
        job: t.label,
        status: "error",
        reason: `Env ${envKey} belum di-set`,
      })),
      summary: { total: tasks.length, ok: 0, errors: tasks.length },
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

  const results: Array<Record<string, unknown>> = [];
  let ok = 0;
  let errors = 0;

  for (let ti = 0; ti < tasks.length; ti++) {
    const task = tasks[ti];
    opts.onProgress?.(task.label, ti + 1, tasks.length);
    try {
      const file = parsed.find((p) =>
        task.fileHints.some((h) =>
          p.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").includes(
            h.toLowerCase().replace(/[^a-z0-9]+/g, "_")
          )
        )
      );
      const sp = file ? aggregateSpatial(file.rows, task) : {};
      const lsbu = aggregateLsbu(opts.lsbuRows, task);
      const values = finalValues(sp, lsbu, task);

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

      const data: { range: string; values: (string | number)[][] }[] = [];
      let written = 0;
      for (let r = 1; r < grid.length; r++) {
        const k = keyByRow[r];
        if (!k || k === "n/a") continue;
        const val = values[k] ?? 0;
        const cell =
          task.mode === "nom" || task.mode === "col_juta"
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
        file: file?.name || null,
        column: headers[colIdx],
        sheet: sheetName,
        written,
        spatialKeys: Object.keys(sp).length,
        lsbuKeys: Object.keys(lsbu).length,
        mode: "write-server",
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
