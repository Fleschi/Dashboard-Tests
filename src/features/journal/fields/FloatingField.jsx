import { useState } from "react";
import { FONT_FAMILY } from "../../../theme/fonts";

// Matches App.js's FONT_FAMILY — the full-screen editor is portaled straight to
// <body>, outside the app shell that normally sets this, so it has to be
// applied again here or the editor would silently fall back to the browser
// default font instead of matching the rest of the dashboard.

// Shared floating label for the editor's header fields.
// Two fixed-style copies of the label crossfade instead of one label that
// morphs: the "resting" one (inside the field, 14px, normal case) fades up and
// out while the "floating" one (top of the field, 11px, uppercase) fades in.
// Neither copy ever has its own font-size, weight, case or letter-spacing
// animated — only opacity and position — so the browser never has to
// re-resolve the font mid-animation, which is what made the text briefly
// render in a different face. Both are always mounted, so both font faces are
// loaded before the first animation.
const LABEL_MS = "0.14s";

export function FloatingLabel({ label, active, D }) {
  const base = {
    position: "absolute", left: 14, pointerEvents: "none", whiteSpace: "nowrap",
    fontFamily: FONT_FAMILY, color: D.textMuted,
    transition: `opacity ${LABEL_MS} ease, transform ${LABEL_MS} ease`,
  };
  return (
    <>
      <label style={{
        ...base, top: "50%", fontSize: 14, fontWeight: 500,
        opacity: active ? 0 : 1,
        transform: active ? "translateY(calc(-50% - 8px))" : "translateY(-50%)",
      }}>
        {label}
      </label>
      <span aria-hidden="true" style={{
        ...base, top: 8, fontSize: 11, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.06em",
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(8px)",
      }}>
        {label}
      </span>
    </>
  );
}

export const floatingBoxStyle = (D, active) => ({
  width: "100%", boxSizing: "border-box", height: 58,
  borderRadius: 10, border: `1px solid ${D.border}`,
  background: D.bg, color: D.text, outline: "none",
  padding: active ? "22px 14px 8px" : "0 14px",
  fontSize: 14, fontFamily: FONT_FAMILY,
  transition: "padding 0.12s ease",
});

export function FloatingField({ label, value, onChange, type = "text", D, style, ...rest }) {
  const [focused, setFocused] = useState(false);
  const active = focused || (value !== "" && value != null);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...floatingBoxStyle(D, active), ...style }}
        {...rest}
      />
      <FloatingLabel label={label} active={active} D={D} />
    </div>
  );
}
