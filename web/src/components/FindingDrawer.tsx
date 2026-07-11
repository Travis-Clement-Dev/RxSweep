import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { sourceUrl, type Finding } from "../api";

// React Aria Modal + Dialog: focus trap, restore, Esc dismiss.
// https://react-aria.adobe.com/Modal · /Dialog
const RECORD_FIELDS: Record<string, string[]> = {
  recall: ["recall_number", "classification", "status", "product_description", "reason_for_recall", "code_info", "recalling_firm", "distribution_pattern", "report_date"],
  shortage: ["generic_name", "status", "package_count", "therapeutic_category"],
  ndc: ["product_ndc", "generic_name", "brand_name", "labeler_name", "marketing_category", "listing_expiration_date"],
};

const SRC_LABEL: Record<Finding["source"], string> = {
  recall: "Recall",
  shortage: "Shortage",
  ndc: "NDC status",
};

const MATCH: Record<Finding["label"], { label: string; cls: string }> = {
  exact_ndc: { label: "Exact NDC", cls: "exact" },
  name_match: { label: "Name match", cls: "name" },
  ai_matched: { label: "AI: verify", cls: "ai" },
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
            <div className="pad">
              <div className="head">
                <span className="label">Finding record</span>
                <Button className="btn-tint" onPress={onClose} aria-label="Close details">
                  Close
                </Button>
              </div>
              {/* Heading renders an h2, picking up the drawer's title style. */}
              <Heading slot="title">
                <span className="cite">[{finding.citation}]</span>
                {finding.item_name}
              </Heading>
              <div className="docket">
                Formulary row {finding.item_row}
                {finding.item_ndc ? ` · NDC ${finding.item_ndc}` : ""}
              </div>

              <div className="sevline">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span className={`svdot ${finding.severity}`} aria-hidden="true" />
                  <span className={`svt ${finding.severity}`} style={{ fontSize: 11.5, letterSpacing: ".08em" }}>
                    {finding.severity}
                  </span>
                </span>
                <span className="srcname">{SRC_LABEL[finding.source]}</span>
                <span className={`matchtag ${MATCH[finding.label].cls}`}>
                  {MATCH[finding.label].label}
                </span>
              </div>

              <h3>Why it's flagged</h3>
              <p className="prose">{finding.severity_rationale}</p>

              {finding.ai_rationale && (
                <>
                  <h3>AI match reasoning</h3>
                  <p className="prose">{finding.ai_rationale}</p>
                  <div className="caution" role="note">
                    AI-matched: needs verification. Confirm this reasoning against the FDA record
                    below before acting.
                  </div>
                </>
              )}

              <h3>FDA record</h3>
              <div className="kvgrid">
                {(RECORD_FIELDS[finding.source] ?? []).map((key) => {
                  const value = finding.record[key];
                  if (value === undefined || value === null || value === "") return null;
                  return (
                    <div className="kvrow" key={key}>
                      <div className="k">{key.replaceAll("_", " ")}</div>
                      <div className="v">{String(value)}</div>
                    </div>
                  );
                })}
              </div>

              {url && (
                <a className="fdalink" href={url} target="_blank" rel="noreferrer">
                  Open FDA source record ↗
                </a>
              )}
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
