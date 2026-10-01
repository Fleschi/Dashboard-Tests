// A single circular progress ring (Apple Watch "activity ring" style): a dim
// full-circle track in the same hue, with a rounded-cap arc drawn over it
// starting at 12 o'clock and sweeping clockwise to `percent`. Shared by the
// Win Rate widget (Overview) and the Win Rate stat card (Data tab) so both
// stay visually identical and only need fixing in one place.

export function RingProgress({ percent, color, size = 56, strokeWidth = 7, trackOpacity = "25" }) {
  const clamped = Math.max(0, Math.min(100, percent || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`${color}${trackOpacity}`} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}
