// utils/ui.js

export const C = {
  green: "#10e8a0", red: "#ff4d6d", yellow: "#fbbf24",
  blue: "#818cf8", purple: "#a78bfa",
  bg: "#0a0a0f", card: "#111118", border: "#1e1e2a",
  text: "#f1f1f3", textMuted: "#52525b",
};

// ─── GlowCard — glow effect removed ─────────────────────────────────────────

export function GlowCard({ children, style = {}, design, onClick, active, className }) {
  const D = design || C;

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        borderRadius: 12,
        border: `1px solid ${active ? D.blue : D.border}`,
        background: D.card,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.2s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

export function StatCard({ label, value, sub, color, design, onClick, active, trend }) {
  const D = design || C;
  const isPositive = trend === "up";
  const isNegative = trend === "down";

  return (
    <GlowCard design={D} onClick={onClick} active={active} style={{ padding: 0 }}>
      <div style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>
            {label}
          </div>
          {(isPositive || isNegative) && (
            <span style={{ fontSize: 11, fontWeight: 600, color: isPositive ? D.green : D.red }}>
              {isPositive ? "↑" : "↓"}
            </span>
          )}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: color || D.text, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: D.textMuted, marginTop: 6 }}>{sub}</div>}
      </div>
    </GlowCard>
  );
}