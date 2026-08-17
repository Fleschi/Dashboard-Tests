// ─── GlowCard ────────────────────────────────────────────────────────────────
// Shared card surface used across every module. Kept intentionally quiet —
// a single hairline border and a flat fill — so content stays the focus.

export function GlowCard({ children, style = {}, design: D, onClick, active, className }) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        borderRadius: 16,
        border: `1px solid ${active ? D.blue : D.border}`,
        background: D.card,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
