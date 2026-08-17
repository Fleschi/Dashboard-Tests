// ─── Design ───────────────────────────────────────────────────────────────────

export const DEFAULT_DESIGN = {
  bg: "#0a0a0a", card: "#111111", border: "#242424", sidebar: "#000000",
  green: "#2dd888", red: "#ff5470", blue: "#f5f5f5", purple: "#f5f5f5",
  yellow: "#f5f5f5", text: "#f5f5f5", textMuted: "#5c5c5c",
  radius: 4,
  background: "none", radialColor: "#a78bfa",
};

// ─── Navigation ───────────────────────────────────────────────────────────────

export const MODULES = [
  { id: "overview",   label: "Overview",    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "propfirm",   label: "Prop Firm",   icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { id: "montecarlo", label: "Monte Carlo", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: "data",       label: "Data",        icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
  { id: "notebook",   label: "Journal",     icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
];

export const SETTINGS_MODULE = {
  id: "settings", label: "Settings",
  icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
};

// ─── Layout ───────────────────────────────────────────────────────────────────

export const BOTTOM_NAV_H      = 56;
export const MOBILE_BREAKPOINT = 768;

// ─── Backgrounds ─────────────────────────────────────────────────────────────

export const BACKGROUNDS = [
  {
    id: "none",
    label: "Solid",
    preview: (bg) => ({ background: bg }),
    render: () => null,
  },
  {
    id: "radial-dual",
    label: "Dual Radial",
    preview: (bg, rc = "#a78bfa") => ({
      background: `radial-gradient(circle at 20% 80%, ${rc}45, transparent 50%), radial-gradient(circle at 80% 20%, ${rc}35, transparent 50%), ${bg}`,
    }),
    render: (D) => (
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `radial-gradient(circle 700px at 15% 85%, ${D.radialColor || "#a78bfa"}22, transparent), radial-gradient(circle 700px at 85% 15%, ${D.radialColor || "#a78bfa"}18, transparent), ${D.bg}`,
      }} />
    ),
  },
  {
    id: "radial-multi",
    label: "Multi Gradient",
    preview: (bg) => ({
      background: `radial-gradient(circle at 50% 120%, #a78bfa40, transparent 35%), radial-gradient(circle at 50% 110%, #ffffff20, transparent 40%), ${bg}`,
    }),
    render: (D) => (
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle 900px at 50% 120%, ${D.multiColor1 || "#a78bfa"}${Math.round((D.multiOpacity1 || 0.25) * 255).toString(16).padStart(2, "0")}, transparent), radial-gradient(circle 800px at 50% 115%, ${D.multiColor2 || "#ffffff"}${Math.round((D.multiOpacity2 || 0.15) * 255).toString(16).padStart(2, "0")}, transparent), ${D.bg}`,
          filter: "blur(60px)",
        }} />
      </div>
    ),
  },
  {
    id: "mesh-gradient",
    label: "Mesh Gradient",
    preview: (bg) => ({
      background: `radial-gradient(circle at 100% 0%, #6366f140, transparent 50%), radial-gradient(circle at 0% 100%, #8b5cf640, transparent 50%), radial-gradient(circle at 100% 100%, #3b82f630, transparent 50%), ${bg}`,
    }),
    render: (D) => (
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(circle 800px at 100% 0%, ${D.meshColor1 || "#6366f1"}${Math.round((D.meshOpacity1 || 0.35) * 255).toString(16).padStart(2, "0")}, transparent),
            radial-gradient(circle 700px at 0% 100%, ${D.meshColor2 || "#8b5cf6"}${Math.round((D.meshOpacity2 || 0.35) * 255).toString(16).padStart(2, "0")}, transparent),
            radial-gradient(circle 600px at 100% 100%, ${D.meshColor3 || "#3b82f6"}${Math.round((D.meshOpacity3 || 0.25) * 255).toString(16).padStart(2, "0")}, transparent),
            radial-gradient(circle 500px at 0% 0%, ${D.meshColor4 || "#1e1b4b"}${Math.round((D.meshOpacity4 || 0.4) * 255).toString(16).padStart(2, "0")}, transparent),
            ${D.bg}
          `,
          filter: "blur(80px)",
        }} />
      </div>
    ),
  },
];