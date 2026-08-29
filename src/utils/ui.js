// ─── GlowCard ────────────────────────────────────────────────────────────────

export function GlowCard({ children, style = {}, design: D, onClick, active, className }) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        borderRadius: D.radius ?? 4,
        border: `1px solid ${active ? D.text : D.border}`,
        background: D.card,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

