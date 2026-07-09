const TIERS = ["critical", "high", "moderate", "info"] as const;

export default function Tiles({
  tiers,
  active,
  onToggle,
}: {
  tiers: Record<string, number>;
  active: string | null;
  onToggle: (tier: string) => void;
}) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4" role="group" aria-label="Filter by severity">
      {TIERS.map((tier) => (
        <button
          key={tier}
          className={`tile tile-${tier}`}
          aria-pressed={active === tier}
          onClick={() => onToggle(tier)}
        >
          <div className="n">{tiers[tier] ?? 0}</div>
          <div className="lbl">{tier}</div>
        </button>
      ))}
    </div>
  );
}
