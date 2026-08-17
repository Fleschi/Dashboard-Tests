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

// ─── StatCard ────────────────────────────────────────────────────────────────

export function StatCard({ label, value, sub, color, design: D, onClick, active, trend }) {
  const isPositive = trend === "up";
  const isNegative = trend === "down";

  return (
    <GlowCard design={D} onClick={onClick} active={active} style={{ padding: 0 }}>
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 600 }}>
            {label}
          </div>
          {(isPositive || isNegative) && (
            <span style={{ fontSize: 11, fontWeight: 600, color: isPositive ? D.green : D.red }}>
              {isPositive ? "↑" : "↓"}
            </span>
          )}
        </div>
        <div style={{ fontSize: 23, fontWeight: 700, color: color || D.text, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: D.textMuted, marginTop: 6 }}>{sub}</div>}
      </div>
    </GlowCard>
  );
}
