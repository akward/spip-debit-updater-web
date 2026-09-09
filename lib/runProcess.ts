import { NextRequest, NextResponse } from "next/server";
import { previousMonthLabel } from "@/lib/months";
import { parseCsvText, type Row } from "@/lib/parse";
import { GROUPS } from "@/lib/tasks";
import {
  parseLsbuXlsx,
  detectLsbuKind,
  type LsbuKind,
} from "@/lib/lsbu";
import { processOneJob, isQuotaError, sleep } from "@/lib/processJobs";
import { processSpasialGroup, spasialTasksForGroup } from "@/lib/spasial";
import { processSpasialPrecomputed } from "@/lib/spasialWrite";
import type { PrecomputedTask } from "@/lib/spasialCore";

export async function runProcess(req: NextRequest) {
  try {
    const form = await req.formData();
    const group = String(form.get("group") || "debit");
    const dryRun = String(form.get("dryRun") || "0") === "1";
    const wantStream = String(form.get("stream") || "1") === "1";
    const monthOverride = form.get("monthLabel");
    const monthLabel =
      (monthOverride && String(monthOverride).trim()) || previousMonthLabel();

    const isSpasial = group.startsWith("spasial_");

    const precomputedRaw = form.get("spasialPrecomputed");
    let precomputed: PrecomputedTask[] | null = null;
    if (precomputedRaw && typeof precomputedRaw === "string") {
      try {
        precomputed = JSON.parse(precomputedRaw) as PrecomputedTask[];
      } catch {
        return NextResponse.json(
          { ok: false, error: "spasialPrecomputed JSON tidak valid" },
          { status: 400 }
        );
      }
    }

    const jobs = isSpasial ? null : GROUPS[group];
    if (!isSpasial && !jobs) {
      return NextResponse.json(
        { ok: false, error: `Group tidak didukung: ${group}` },
        { status: 400 }
      );
    }
    if (isSpasial && !spasialTasksForGroup(group)) {
      return NextResponse.json(
        { ok: false, error: `Group spasial tidak didukung: ${group}` },
        { status: 400 }
      );
    }

    const files = form.getAll("files").filter((f) => f instanceof File) as File[];
    const spatialFiles = form
      .getAll("spatial")
      .filter((f) => f instanceof File && f.size > 0) as File[];
    const lsbuFiles = [...form.getAll("lsbu"), ...form.getAll("lsbu2")].filter(
      (f) => f instanceof File && f.size > 0
    ) as File[];

    const lsbuBundles: { name: string; kind: LsbuKind; rows: Row[] }[] = [];
    for (const f of lsbuFiles) {
      const buf = await f.arrayBuffer();
      const rows = parseLsbuXlsx(buf);
      lsbuBundles.push({ name: f.name, kind: detectLsbuKind(f.name, rows), rows });
    }
    const lsbuByKind = (k: LsbuKind) =>
      lsbuBundles.filter((b) => b.kind === k).flatMap((b) => b.rows);

    const parsed: { name: string; rows: Row[] }[] = [];
    for (const f of files) {
      parsed.push({ name: f.name, rows: parseCsvText(await f.text()) });
    }

    if (isSpasial) {
      if (precomputed && precomputed.length) {
        const tasks = spasialTasksForGroup(group)!;
        if (wantStream && !dryRun) {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              const send = (obj: Record<string, unknown>) => {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
                );
              };
              try {
                send({
                  type: "start",
                  group,
                  monthLabel,
                  dryRun,
                  totalJobs: tasks.length,
                  clientParse: true,
                });
                const out = await processSpasialPrecomputed({
                  group,
                  monthLabel,
                  dryRun: false,
                  precomputed: precomputed!,
                  onProgress: (msg, index, total) =>
                    send({ type: "progress", index, total, job: msg, message: msg }),
                });
                for (let i = 0; i < out.results.length; i++) {
                  const r = out.results[i];
                  send({ type: "job", index: i + 1, total: out.results.length, ...r });
                }
                send({
                  type: "done",
                  ok: true,
                  group,
                  monthLabel,
                  dryRun: false,
                  storage: "client-parse",
                  summary: out.summary,
                  results: out.results,
                });
              } catch (e) {
                send({
                  type: "error",
                  ok: false,
                  error: e instanceof Error ? e.message : String(e),
                });
              } finally {
                controller.close();
              }
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
            },
          });
        }
        const out = await processSpasialPrecomputed({
          group,
          monthLabel,
          dryRun,
          precomputed,
        });
        return NextResponse.json({
          ok: true,
          group,
          monthLabel,
          dryRun,
          storage: "client-parse",
          summary: out.summary,
          results: out.results,
        });
      }

      const spatialBufs: { name: string; buf: ArrayBuffer }[] = [];
      for (const f of spatialFiles.length ? spatialFiles : files) {
        const name = f.name.toLowerCase();
        if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
          spatialBufs.push({ name: f.name, buf: await f.arrayBuffer() });
        }
      }
      const lsbuRows = lsbuBundles.flatMap((b) => b.rows);
      const tasks = spasialTasksForGroup(group)!;

      if (wantStream && !dryRun) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const send = (obj: Record<string, unknown>) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
              );
            };
            try {
              send({
                type: "start",
                group,
                monthLabel,
                dryRun,
                totalJobs: tasks.length,
                files: spatialBufs.map((p) => ({ name: p.name, rows: 0 })),
                lsbu: lsbuBundles.map((b) => ({
                  name: b.name,
                  kind: b.kind,
                  rows: b.rows.length,
                })),
              });
              const out = await processSpasialGroup({
                group,
                monthLabel,
                dryRun: false,
                spatialFiles: spatialBufs,
                lsbuRows,
                onProgress: (msg, index, total) =>
                  send({ type: "progress", index, total, job: msg, message: msg }),
              });
              for (let i = 0; i < out.results.length; i++) {
                const r = out.results[i];
                send({ type: "job", index: i + 1, total: out.results.length, ...r });
              }
              send({
                type: "done",
                ok: true,
                group,
                monthLabel,
                dryRun: false,
                summary: out.summary,
                results: out.results,
                files: spatialBufs.map((p) => ({ name: p.name, rows: 0 })),
                lsbu: lsbuBundles.map((b) => ({
                  name: b.name,
                  kind: b.kind,
                  rows: b.rows.length,
                })),
              });
            } catch (e) {
              send({
                type: "error",
                error: e instanceof Error ? e.message : String(e),
              });
            } finally {
              controller.close();
            }
          },
        });
        return new NextResponse(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      }

      const out = await processSpasialGroup({
        group,
        monthLabel,
        dryRun,
        spatialFiles: spatialBufs,
        lsbuRows,
      });
      return NextResponse.json({
        ok: true,
        group,
        monthLabel,
        dryRun,
        summary: out.summary,
        results: out.results,
        files: spatialBufs.map((p) => ({ name: p.name, rows: 0 })),
        lsbu: lsbuBundles.map((b) => ({
          name: b.name,
          kind: b.kind,
          rows: b.rows.length,
        })),
      });
    }

    if (wantStream && !dryRun) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (obj: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
          };
          try {
            send({
              type: "start",
              group,
              monthLabel,
              dryRun,
              totalJobs: jobs!.length,
              files: parsed.map((p) => ({ name: p.name, rows: p.rows.length })),
              lsbu: lsbuBundles.map((b) => ({
                name: b.name,
                kind: b.kind,
                rows: b.rows.length,
              })),
            });

            const results: Record<string, unknown>[] = [];
            const gapMs = group === "acquirer" ? 1500 : 800;
            for (let i = 0; i < jobs!.length; i++) {
              const job = jobs![i];
              if (i > 0) await sleep(gapMs);
              send({
                type: "progress",
                index: i + 1,
                total: jobs!.length,
                job: job.name,
                message: `Menulis ${job.sheetName}…`,
              });
              let lastErr: unknown;
              let done = false;
              for (let attempt = 0; attempt < 4 && !done; attempt++) {
                try {
                  if (attempt > 0) {
                    send({
                      type: "progress",
                      index: i + 1,
                      total: jobs!.length,
                      job: job.name,
                      message: `Retry ${attempt} (quota)… tunggu ${attempt * 20}s`,
                    });
                    await sleep(attempt * 20_000);
                  }
                  const rows = await processOneJob({
                    job,
                    group,
                    dryRun,
                    monthLabel,
                    parsed,
                    lsbuByKind,
                  });
                  let hitQuota = false;
                  for (const r of rows) {
                    const reason = String((r as { reason?: string }).reason || "");
                    if (
                      (r as { status?: string }).status === "error" &&
                      isQuotaError(reason)
                    ) {
                      lastErr = new Error(reason);
                      hitQuota = true;
                      break;
                    }
                    results.push(r);
                    send({ type: "job", index: i + 1, total: jobs!.length, ...r });
                  }
                  if (hitQuota && attempt < 3) continue;
                  if (hitQuota) {
                    results.push({
                      job: job.name,
                      status: "error",
                      sheet: job.sheetName,
                      reason: String(lastErr),
                    });
                    send({
                      type: "job",
                      index: i + 1,
                      total: jobs!.length,
                      job: job.name,
                      status: "error",
                      sheet: job.sheetName,
                      reason: String(lastErr),
                    });
                  }
                  done = true;
                } catch (e) {
                  lastErr = e;
                  if (!isQuotaError(e) || attempt === 3) {
                    const err = {
                      job: job.name,
                      status: "error",
                      sheet: job.sheetName,
                      reason: e instanceof Error ? e.message : String(e),
                    };
                    results.push(err);
                    send({ type: "job", index: i + 1, total: jobs!.length, ...err });
                    done = true;
                  }
                }
              }
            }

            const errors = results.filter((r) => r.status === "error").length;
            send({
              type: "done",
              ok: true,
              group,
              monthLabel,
              dryRun,
              storage: "none — CSV/LSBU hanya memori",
              lsbu: lsbuBundles.map((b) => ({
                name: b.name,
                kind: b.kind,
                rows: b.rows.length,
              })),
              files: parsed.map((p) => ({ name: p.name, rows: p.rows.length })),
              summary: {
                total: results.length,
                errors,
                ok: results.filter(
                  (r) => r.status === "ok" || r.status === "copy-previous"
                ).length,
              },
              results,
            });
          } catch (e) {
            send({
              type: "error",
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const results: Record<string, unknown>[] = [];
    const gapMs = group === "acquirer" ? 1500 : 800;
    for (let i = 0; i < jobs!.length; i++) {
      const job = jobs![i];
      if (i > 0 && !dryRun) await sleep(gapMs);
      let pushed = false;
      for (let attempt = 0; attempt < 4 && !pushed; attempt++) {
        try {
          if (attempt > 0) await sleep(attempt * 20_000);
          const rows = await processOneJob({
            job,
            group,
            dryRun,
            monthLabel,
            parsed,
            lsbuByKind,
          });
          const quotaRow = rows.find(
            (r) => r.status === "error" && isQuotaError(String(r.reason || ""))
          );
          if (quotaRow && attempt < 3) continue;
          results.push(...rows);
          pushed = true;
        } catch (e) {
          if (isQuotaError(e) && attempt < 3) continue;
          results.push({
            job: job.name,
            status: "error",
            sheet: job.sheetName,
            reason: e instanceof Error ? e.message : String(e),
          });
          pushed = true;
        }
      }
    }

    const errors = results.filter((r) => r.status === "error").length;
    return NextResponse.json({
      ok: true,
      group,
      monthLabel,
      dryRun,
      storage: "none — CSV/LSBU hanya memori",
      lsbu: lsbuBundles.map((b) => ({
        name: b.name,
        kind: b.kind,
        rows: b.rows.length,
      })),
      files: parsed.map((p) => ({ name: p.name, rows: p.rows.length })),
      summary: {
        total: results.length,
        errors,
        ok: results.filter(
          (r) => r.status === "ok" || r.status === "copy-previous"
        ).length,
      },
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
