import { RingProgress } from "../../shared/components/RingProgress";

export function StatCard({ label, value, sub, color, D, ring }) {
  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: D.radius ?? 4, padding: "20px 22px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 11, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 27, fontWeight: 700, color: color || D.text, letterSpacing: "-0.02em" }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: D.textMuted, marginTop: 4 }}>{sub}</div>}
        </div>
        {ring && <RingProgress percent={ring.percent} color={ring.color} size={48} strokeWidth={6} />}
      </div>
    </div>
  );
}
