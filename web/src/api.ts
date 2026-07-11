// Typed client mirroring rxsweep.webapp.server JSON shapes.

export interface Finding {
  item_name: string;
  item_row: number;
  item_ndc: string | null;
  source: "recall" | "shortage" | "ndc";
  label: "exact_ndc" | "name_match" | "ai_matched";
  record: Record<string, unknown>;
  severity: "critical" | "high" | "moderate" | "info";
  severity_rationale: string;
  ai_rationale: string | null;
  citation: number;
}

export interface QuarantinedRow {
  row: number;
  reason: string;
}

export interface ManualReviewItem {
  item: { row: number; name: string };
  source: string;
  reason: string;
}

// A disposition audit event, exactly as stored in the run's audit.jsonl.
// Events accumulate append-only; reduceDispositions() derives current state.
export interface Disposition {
  ts: string;
  citation: number;
  action:
    | "quarantined"
    | "reviewed"
    | "escalated"
    | "confirmed"
    | "verified"
    | "dismissed"
    | "reopened";
  operator: string;
  note: string | null;
}

export interface SweepResultData {
  run_id: string;
  findings: Finding[];
  quarantined: QuarantinedRow[];
  manual_review: ManualReviewItem[];
  unchecked: string[];
  dispositions?: Disposition[];
  summary: string | null;
  meta: {
    csv_name: string;
    items_checked: number;
    run_ts: string;
    months_back: number;
    model: string;
    ai_available: boolean;
    audit_path: string;
    ai_usage: AiUsage;
  };
  tiers: Record<string, number>;
}

export interface AiUsage {
  model: string;
  input_tokens: number;
  output_tokens: number;
  est_cost_usd: number | null;
}

export interface SweepProgress {
  status: "running" | "done" | "error";
  phase: string;
  items: number;
  fda_requests: number;
  ai_calls: number;
  error: string | null;
  result?: SweepResultData;
}

export async function startSweep(
  file: File,
  monthsBack: number,
  useAi: boolean,
): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const resp = await fetch(
    `/api/sweeps?months_back=${monthsBack}&use_ai=${useAi}`,
    { method: "POST", body },
  );
  if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
  return (await resp.json()).sweep_id as string;
}

export async function getSweep(sweepId: string): Promise<SweepProgress> {
  const resp = await fetch(`/api/sweeps/${sweepId}`);
  if (!resp.ok) throw new Error(`Sweep lookup failed (${resp.status})`);
  return resp.json();
}

export async function postDisposition(
  sweepId: string,
  body: { citation: number; action: Disposition["action"]; operator: string; note?: string },
): Promise<Disposition> {
  const resp = await fetch(`/api/sweeps/${sweepId}/dispositions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const detail = (await resp.json().catch(() => null))?.detail;
    throw new Error(typeof detail === "string" ? detail : `Disposition failed (${resp.status})`);
  }
  return resp.json();
}

// Fold events in append order: the last event per citation wins, and
// `reopened` returns the row to Open (no entry). Nothing is ever deleted
// server-side; this is presentation only.
export function reduceDispositions(events: Disposition[]): Map<number, Disposition> {
  const current = new Map<number, Disposition>();
  for (const e of events) {
    if (e.action === "reopened") current.delete(e.citation);
    else current.set(e.citation, e);
  }
  return current;
}

export async function sendChat(
  sweepId: string,
  question: string,
  history: { role: string; content: string }[],
): Promise<{ ok: true; reply: string; usage: AiUsage } | { ok: false; detail: string }> {
  const resp = await fetch(`/api/sweeps/${sweepId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });
  if (!resp.ok) {
    const detail = (await resp.json().catch(() => null))?.detail ?? `Chat failed (${resp.status})`;
    return { ok: false, detail };
  }
  const body = await resp.json();
  return { ok: true, reply: body.reply as string, usage: body.usage as AiUsage };
}

export function sourceUrl(f: Finding): string | null {
  const rec = f.record as Record<string, string>;
  if (f.source === "recall" && rec.recall_number)
    return `https://api.fda.gov/drug/enforcement.json?search=${encodeURIComponent(`recall_number:"${rec.recall_number}"`)}`;
  if (f.source === "shortage" && rec.generic_name)
    return `https://api.fda.gov/drug/shortages.json?search=${encodeURIComponent(`generic_name:"${rec.generic_name}"`)}`;
  if (f.source === "ndc" && rec.product_ndc)
    return `https://api.fda.gov/drug/ndc.json?search=${encodeURIComponent(`product_ndc:"${rec.product_ndc}"`)}`;
  return null;
}
