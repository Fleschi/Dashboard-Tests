export const ghostBtn    = (D) => ({ padding: "8px 16px", background: "transparent", border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, fontSize: 13, fontWeight: 600, cursor: "pointer" });

export const dangerBtn   = (D) => ({ padding: "8px 16px", background: "transparent", border: `1px solid ${D.red}40`, borderRadius: 8, color: D.red, fontSize: 13, fontWeight: 600, cursor: "pointer" });

// Same footprint/shape as TimeRangePicker's calendar icon button, so the two
// sit together as one clean icon group.
export const iconToggleBtn = (D, active) => ({
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 40, height: 40, padding: 0,
  background: active ? `${D.blue}18` : "transparent",
  border: `1px solid ${active ? D.blue : D.border}`, borderRadius: 8,
  cursor: "pointer",
});
