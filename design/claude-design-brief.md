# Claude Design Meta Prompt — RxSweep UX/UI Exploration (PR #3 candidate)

How to use: open Claude Design. Attach these files first (context beats phrasing):
`design/styleguide/index.html`, one screenshot of the current dashboard, and
`design/comps/index.html`. Then paste Prompt 1. Iterate until the dashboard
direction satisfies you before pasting Prompt 2, then Prompt 3.

---

## Prompt 1 — the triage dashboard (the hero screen)

<role>
You are a senior product designer who ships regulated healthcare software. Your
portfolio bar: government-grade trust with modern craft. You design for skeptical
clinical professionals, not for dribbble.
</role>

<context>
Product: RxSweep, an open-source instrument that sweeps a pharmacy formulary CSV
against FDA recalls, drug shortages, and NDC-directory status, then gives a
pharmacist a severity-ranked worklist where every finding links to its FDA source
record. AI adjudicates only fuzzy matches; a pharmacist verifies everything; every
AI call is audit-logged with token cost shown to the user (they bring their own
API key).

User: "Dana," a medication-safety pharmacist. Journey: Prepare (upload CSV) →
Run (live progress) → Triage (worklist) → Verify (record detail vs FDA source) →
Act (exports: CSV, XLSX, Markdown, printable memorandum).

The attached style guide is the governing contract. Its decisions are final:
worklist-first (a verb-led "Required Actions" queue is the hero, never AI prose);
one sparse teal accent on true-neutral surfaces; severity strictly semantic
(red urgent, amber caution, green normal); square document language; Public Sans;
WCAG 2.1 AA minimum. Exact tokens:
light: paper #ffffff, ground #f3f4f4, ink #1b1b1b, line #a9aeb1, accent #0e7c6b,
critical #9a3a2e, moderate #8a5d0b, info #256b43.
dark: paper #1e2022, ground #16181a, ink #e6e7e8, accent #34b39c,
critical #db8377, moderate #d9a94f, info #5cb884.
</context>

<task>
Design the triage dashboard at desktop width (1440) in light mode, then the same
screen dark. Content to place: run docket line (file, items, window, model, AI
cost), Required Actions queue (7 verb-led items with severity tags and citation
numbers), findings register table (98 rows: citation, severity, item, NDC
monospace, source, match label, basis), severity filters with counts, registers
(manual review / quarantined / unchecked), export list (findings.csv,
findings.xlsx, findings.md, memo, audit.jsonl), and a docked assistant with
suggested actions ("Brief me for the huddle") plus a model/token/cost meter.
Use realistic pharmacy data: Cefazolin Sodium 0409-4058-01 Class I recall,
Sodium Chloride 0.9% 0338-0049-04 Class I (22 records), Lorazepam 0641-6001-25
active shortage exact NDC match.

Where your creative freedom lives: spatial composition, density rhythm, how the
queue and register relate, empty/loading states, a severity-distribution
visualization if it earns its place, micro-interactions, and how "government-grade
trust, contemporary craft" becomes memorable rather than merely clean.
</task>

<constraints>
Do NOT use: rounded-card SaaS grammar or drop-shadow card grids; purple/indigo
gradients; glassmorphism; emoji anywhere; AI-generated prose as a hero element;
brand-tinted backgrounds (surfaces stay neutral); more than one accent hue;
severity colors as decoration; pill badges on every attribute; centered
marketing layouts. Do not invent new brand colors. Do not use em dashes in any
UI copy; write copy in plain FDA drug-safety register ("Verify lots for X against
the recall record; quarantine affected stock.").
</constraints>

<format>
High-fidelity mockup on canvas, light then dark. Annotate the three decisions
you consider most opinionated and why they serve a skeptical pharmacist.
</format>

---

## Prompt 2 — supporting screens (paste after dashboard is approved)

Same role, context, constraints, and tokens as before. Design, in this order:
(1) Upload screen: drop zone with browse path, sweep options (recall lookback,
AI on/off with "your key, your cost" note), scope banner: "Informational tool.
A pharmacist verifies every finding before action. Not clinical advice." plus
openFDA's disclaimer line. (2) Run screen: indeterminate progress with live
counters (items read, FDA requests, AI calls) and the radar-sweep motif as the
single signature animation. (3) Verify drawer: right panel over the dashboard
showing one finding: severity, source, match label ("AI-matched: needs
verification" when applicable), why flagged, AI match reasoning beside the FDA
record fields, one-click "Open FDA source record."

## Prompt 3 — the memorandum (print artifact)

Same constraints. Design the exported report as an institutional memorandum:
letterhead (RxSweep wordmark, "Formulary surveillance, not clinical advice"),
TO/FROM/DATE/RE block, stamp elements (counts), Purpose paragraph, "Actions
required" numbered list, Exhibit A findings table, disclosures (quarantined rows,
unchecked items), a pharmacist verification signature line, and the openFDA
disclaimer in the footer. Serif (Georgia family) is permitted here only. It must
read as a document of record on screen and print cleanly to one letter-width PDF.

---

Downstream intent (for whoever implements): winning designs come back to the
repo as a new branch and PR #3, implemented against the existing React Aria
components and tokens; DECISIONS.md gets a D10 entry recording what Claude Design
changed and why. Immovable decisions: D6 (worklist-first, AI narrative
relocation), D8 (React Aria), D9 (neutral surfaces, single accent).
