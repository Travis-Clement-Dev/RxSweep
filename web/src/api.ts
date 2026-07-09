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

export interface SweepResultData {
  run_id: string;
  findings: Finding[];
  quarantined: QuarantinedRow[];
  manual_review: ManualReviewItem[];
  unchecked: string[];
  summary: string | null;
  meta: {
    csv_name: string;
    items_checked: number;
    run_ts: string;
    months_back: number;
    model: string;
    ai_available: boolean;
    audit_path: string;
  };
  tiers: Record<string, number>;
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

export async function sendChat(
  sweepId: string,
  question: string,
  history: { role: string; content: string }[],
): Promise<{ ok: true; reply: string } | { ok: false; detail: string }> {
  const resp = await fetch(`/api/sweeps/${sweepId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });
  if (!resp.ok) {
    const detail = (await resp.json().catch(() => null))?.detail ?? `Chat failed (${resp.status})`;
    return { ok: false, detail };
  }
  return { ok: true, reply: (await resp.json()).reply as string };
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
