import * as Dialog from "@radix-ui/react-dialog";
import { sourceUrl, type Finding } from "../api";

const RECORD_FIELDS: Record<string, string[]> = {
  recall: ["recall_number", "classification", "status", "product_description", "reason_for_recall", "code_info", "recalling_firm", "distribution_pattern", "report_date"],
  shortage: ["generic_name", "status", "package_count", "therapeutic_category"],
  ndc: ["product_ndc", "generic_name", "brand_name", "labeler_name", "marketing_category", "listing_expiration_date"],
};

export default function FindingDrawer({
  finding,
  onClose,
}: {
  finding: Finding | null;
  onClose: () => void;
}) {
  const url = finding ? sourceUrl(finding) : null;
  return (
    <Dialog.Root open={finding !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0"
          style={{ background: "rgba(20, 30, 26, 0.45)" }}
        />
        <Dialog.Content
          className="fixed right-0 top-0 h-full w-full max-w-[480px] overflow-y-auto p-6"
          style={{ background: "var(--card)", borderLeft: "1px solid var(--line)", boxShadow: "var(--shadow)" }}
          aria-describedby={undefined}
        >
          {finding && (
            <>
              <div className="flex items-start justify-between gap-3">
                <Dialog.Title className="display m-0 text-lg font-semibold">
                  [{finding.citation}] {finding.item_name}
                </Dialog.Title>
                <Dialog.Close className="btn btn-quiet" aria-label="Close details">
                  Close
                </Dialog.Close>
              </div>
              <p className="meta mt-1">
                Formulary row {finding.item_row}
                {finding.item_ndc ? ` · NDC ${finding.item_ndc}` : ""}
              </p>

              <div className="mb-4 flex gap-2 flex-wrap">
                <span className={`chip sev-${finding.severity}`}>{finding.severity}</span>
                <span className="chip chip-label">{finding.source}</span>
                <span className={`chip ${finding.label === "ai_matched" ? "chip-verify" : "chip-label"}`}>
                  {finding.label === "ai_matched" ? "AI-matched: needs verification" : finding.label}
                </span>
              </div>

              <h3 className="mb-1 mt-4 text-sm font-semibold">Why it's flagged</h3>
              <p className="mt-0 text-[0.92rem]">{finding.severity_rationale}</p>

              {finding.ai_rationale && (
                <>
                  <h3 className="mb-1 mt-4 text-sm font-semibold">AI match reasoning</h3>
                  <p className="mt-0 text-[0.92rem]">{finding.ai_rationale}</p>
                  <p className="meta mt-1 text-[0.8rem]">
                    Verify this reasoning against the FDA record before acting.
                  </p>
                </>
              )}

              <h3 className="mb-1 mt-4 text-sm font-semibold">FDA record</h3>
              <dl className="m-0 grid grid-cols-[minmax(120px,auto)_1fr] gap-x-4 gap-y-1 text-[0.85rem]">
                {(RECORD_FIELDS[finding.source] ?? []).map((key) => {
                  const value = finding.record[key];
                  if (value === undefined || value === null || value === "") return null;
                  return [
                    <dt key={`${key}-t`} className="faint">
                      {key.replaceAll("_", " ")}
                    </dt>,
                    <dd key={`${key}-d`} className="m-0">
                      {String(value)}
                    </dd>,
                  ];
                })}
              </dl>

              {url && (
                <p className="mt-5">
                  <a className="btn btn-quiet" href={url} target="_blank" rel="noreferrer">
                    Open FDA source record
                  </a>
                </p>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
