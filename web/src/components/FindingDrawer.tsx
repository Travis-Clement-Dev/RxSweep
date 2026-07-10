import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { sourceUrl, type Finding } from "../api";

// React Aria Modal + Dialog: focus trap, restore, Esc dismiss.
// https://react-aria.adobe.com/Modal · /Dialog
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
    <ModalOverlay
      className="overlay"
      isOpen={finding !== null}
      onOpenChange={(open) => !open && onClose()}
      isDismissable
    >
      <Modal className="drawer">
        <Dialog aria-label={finding ? `Finding ${finding.citation}: ${finding.item_name}` : "Finding details"}>
          {finding && (
            <>
              <div className="flex items-start justify-between gap-3">
                <Heading slot="title" className="m-0 text-lg font-extrabold">
                  [{finding.citation}] {finding.item_name}
                </Heading>
                <Button className="btn btn-quiet" onPress={onClose} aria-label="Close details">
                  Close
                </Button>
              </div>
              <p className="meta mt-1">
                Formulary row {finding.item_row}
                {finding.item_ndc ? <> · NDC <code>{finding.item_ndc}</code></> : ""}
              </p>

              <p className="mb-0 mt-2">
                <span className={`svt ${finding.severity}`}>{finding.severity}</span>
                <span className="mx-2 faint">·</span>
                <span className="chip chip-label">{finding.source}</span>{" "}
                {finding.label === "ai_matched" ? (
                  <span className="chip chip-verify">AI-matched: needs verification</span>
                ) : (
                  <span className="chip chip-label">
                    {finding.label === "exact_ndc" ? "exact NDC" : "name match"}
                  </span>
                )}
              </p>

              <h3>Why it's flagged</h3>
              <p className="mt-0 text-[13px]">{finding.severity_rationale}</p>

              {finding.ai_rationale && (
                <>
                  <h3>AI match reasoning</h3>
                  <p className="mt-0 text-[13px]">{finding.ai_rationale}</p>
                  <p className="meta mt-1 text-[11.5px]">
                    Verify this reasoning against the FDA record before acting.
                  </p>
                </>
              )}

              <h3>FDA record</h3>
              <dl>
                {(RECORD_FIELDS[finding.source] ?? []).map((key) => {
                  const value = finding.record[key];
                  if (value === undefined || value === null || value === "") return null;
                  return [
                    <dt key={`${key}-t`}>{key.replaceAll("_", " ")}</dt>,
                    <dd key={`${key}-d`}>{String(value)}</dd>,
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
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
