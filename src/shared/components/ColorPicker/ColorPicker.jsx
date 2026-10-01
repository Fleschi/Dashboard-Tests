// Shared colour picker -- ONE popup for every place the app lets you choose a
// colour (Settings, tag colours, editor text colour, ...). It copies the look
// and structure of the date-range picker (TimeRangePicker.jsx): the same card,
// border, 12px radius and shadow; a left column of modes ("Palette" / "Custom")
// with a muted footer action ("Default", like "All time"); and a right pane
// that shows the chosen mode.
//
//   Palette  a grid of preset swatches (only when `swatches` is given)
//   Custom   saturation/brightness square + hue slider + hex field
//
// <ColorPicker
//   D={design}
//   value="#22c55e"                    current colour (hex)
//   onChange={(hex, meta) => ...}      LIVE: fires on every change, including
//                                      while dragging in the Custom pane
//   onChangeEnd={(hex, meta) => ...}   COMMIT: fires once when a choice is
//                                      finished (swatch click, drag released,
//                                      Enter/blur in the hex field, reset) --
//                                      use this instead of onChange when each
//                                      change is expensive (e.g. a DB write)
//   swatches={[...]}                   optional presets. Each item is a hex
//                                      string, [label, hex] or [id, label, hex].
//                                      `meta` passed to the callbacks is
//                                      { source: "palette" | "custom" | "reset",
//                                        id?, label? }
//   onReset / resetLabel               optional footer action (e.g. "Default")
//   variant="field" | "dot"            built-in trigger (colour + hex + chevron,
//                                      or a round dot; `size`, `rainbow`)
//   renderTrigger={({ open, toggle, color }) => node}   or bring your own
//   open / onOpenChange                optional controlled open state
//   portal={false}                     render the popup inline (absolute)
//                                      instead of in <body> (fixed) -- needed
//                                      when it must stay inside another
//                                      popup's DOM, e.g. the editor's selection
//                                      menu, which hides if focus leaves it
//   align="left" | "right"             which edge of the trigger it lines up to
// />
//
// The popup closes on outside press or Escape (Escape is swallowed so it does
// not also close a parent popup), and choosing a palette swatch or resetting
// closes it, like picking a date does. Mouse presses inside it never steal
// focus from whatever had it (except into the hex field), so it can sit on top
// of a text editor.

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { FONT_FAMILY } from "../../../theme/fonts";

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const PANE_W = 220;
const RAINBOW = "conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #0ea5e9, #6366f1, #a855f7, #ef4444)";

// --- Colour maths (exported for tests) ---------------------------------------

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// "#fff" / "FFF" / "#22C55E" -> "#rrggbb" (lower case), or null if not a hex colour.
export function normalizeHex(value) {
  if (typeof value !== "string") return null;
  let s = value.trim();
  if (!s.startsWith("#")) s = "#" + s;
  if (!HEX_RE.test(s)) return null;
  if (s.length === 4) s = "#" + s.slice(1).split("").map(c => c + c).join("");
  return s.toLowerCase();
}

// h 0-360, s and v 0-1.
export function hexToHsv(hex) {
  const h6 = normalizeHex(hex) || "#000000";
  const r = parseInt(h6.slice(1, 3), 16) / 255;
  const g = parseInt(h6.slice(3, 5), 16) / 255;
  const b = parseInt(h6.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvToHex({ h, s, v }) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60)       [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else              [r, g, b] = [c, 0, x];
  const to = (n) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

// Accepts "#hex", [label, "#hex"] or [id, label, "#hex"] -> { id, label, color }.
function normalizeSwatches(list) {
  return (list || []).map(item => {
    if (Array.isArray(item)) {
      const [id, label, color] = item.length >= 3 ? item : [null, item[0], item[1]];
      return { id, label: label || color, color: normalizeHex(color) || color };
    }
    const color = normalizeHex(item) || item;
    return { id: null, label: color, color };
  }).filter(s => normalizeHex(s.color));
}

// --- Small pieces --------------------------------------------------------------

function ChevronIcon({ color, open }) {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.6))" }}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

// A pointer-draggable surface: reports the pointer as x/y fractions (0-1) of
// the element, on press and while dragging, and calls onEnd on release.
function DragArea({ onPoint, onEnd, style, children, ...rest }) {
  const dragging = useRef(false);
  const point = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    onPoint(clamp((e.clientX - r.left) / (r.width || 1)), clamp((e.clientY - r.top) / (r.height || 1)));
  };
  return (
    <div
      {...rest}
      style={{ touchAction: "none", cursor: "crosshair", position: "relative", ...style }}
      onPointerDown={e => {
        e.preventDefault();                     // keep focus where it was
        dragging.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        point(e);
      }}
      onPointerMove={e => { if (dragging.current) point(e); }}
      onPointerUp={e => { if (!dragging.current) return; dragging.current = false; point(e); onEnd(); }}
      onPointerCancel={() => { if (dragging.current) { dragging.current = false; onEnd(); } }}
    >
      {children}
    </div>
  );
}

const thumbStyle = (left, top, fill) => ({
  position: "absolute", left, top, width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: "50%",
  background: fill, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.4)",
  pointerEvents: "none",
});

// --- The picker ----------------------------------------------------------------

export default function ColorPicker({
  D, value, onChange, onChangeEnd, swatches, onReset, resetLabel = "Default",
  variant = "field", size = 24, rainbow = false, title, renderTrigger,
  open: openProp, onOpenChange, portal = true, align = "left", zIndex = 3000,
}) {
  const palette = normalizeSwatches(swatches);
  const hasPalette = palette.length > 0;

  // Current colour, kept as exact hex plus an HSV copy (HSV keeps the hue while
  // the colour is grey/black, where hex alone would forget it).
  const [hex, setHex] = useState(() => normalizeHex(value) || "#000000");
  const [hsv, setHsv] = useState(() => hexToHsv(normalizeHex(value) || "#000000"));
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  // Follow changes made from outside (reset, rollback after a failed save, ...).
  useEffect(() => {
    const n = normalizeHex(value);
    if (n && n !== hex) { setHex(n); setHsv(hexToHsv(n)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Open state: controlled when `open` is passed, otherwise internal.
  const [openState, setOpenState] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const setOpen = useCallback((next) => {
    if (!controlled) setOpenState(next);
    onOpenChange?.(next);
  }, [controlled, onOpenChange]);

  const [mode, setMode] = useState("custom");
  const [text, setText] = useState(hex);
  useEffect(() => { setText(t => (HEX_RE.test(t) ? hex : t)); }, [hex]);

  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const [pos, setPos] = useState(null);

  const toggle = () => {
    // Open on the pane that matches the current colour (like the date picker opens on its current mode).
    if (!open) setMode(palette.some(s => s.color === hex) ? "palette" : "custom");
    setOpen(!open);
  };

  // --- Choosing a colour ------------------------------------------------------
  const emit = (nextHex, meta, end) => {
    onChange?.(nextHex, meta);
    if (end) onChangeEnd?.(nextHex, meta);
  };

  // A specific hex (swatch, typed text, reset).
  const commitHex = (nextHex, meta, end = true) => {
    const n = normalizeHex(nextHex);
    if (!n) return;
    const parsed = hexToHsv(n);
    // Keep the old hue when the new colour has none (grey/black/white).
    const next = parsed.s === 0 || parsed.v === 0 ? { ...parsed, h: hsvRef.current.h } : parsed;
    hsvRef.current = next;
    setHsv(next); setHex(n); setText(n);
    emit(n, meta, end);
  };

  // A point in the Custom pane (square / hue slider).
  const commitHsv = (next, end = false) => {
    hsvRef.current = next;
    const n = hsvToHex(next);
    setHsv(next); setHex(n); setText(n);
    emit(n, { source: "custom" }, end);
  };
  // Drag released: onChange already fired live, so only the commit callback is left.
  const endDrag = () => onChangeEnd?.(hsvToHex(hsvRef.current), { source: "custom" });

  const pickSwatch = (sw) => {
    commitHex(sw.color, { source: "palette", id: sw.id || undefined, label: sw.label }, true);
    setOpen(false);
  };
  // The parent applies the default; the sync effect above then picks up the new `value`.
  const reset = () => { onReset?.(); setOpen(false); };

  const typeHex = (val) => {
    setText(val);
    const n = normalizeHex(val);
    // Live-preview only once a full #rrggbb is typed; shorter forms commit on Enter/blur.
    if (n && /^#[0-9a-f]{6}$/i.test(val.trim())) commitHex(n, { source: "custom" }, false);
  };
  const finishHex = () => {
    const n = normalizeHex(text);
    if (n) commitHex(n, { source: "custom" }, true);
    else setText(hex);
  };

  // --- Closing ----------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    // Capture phase + stopPropagation: Escape closes only this popup, not one it sits inside.
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, setOpen]);

  // --- Positioning (portal mode): under the trigger, flipped above / clamped to the window ---
  const place = useCallback(() => {
    const t = wrapRef.current, p = panelRef.current;
    if (!t || !p) return;
    const r = t.getBoundingClientRect();
    const pw = p.offsetWidth, ph = p.offsetHeight, m = 8;
    let left = align === "right" ? r.right - pw : r.left;
    left = Math.max(m, Math.min(left, window.innerWidth - pw - m));
    let top = r.bottom + 8;
    if (top + ph > window.innerHeight - m && r.top - 8 - ph > m) top = r.top - 8 - ph;
    setPos(prev => (prev && prev.left === left && prev.top === top ? prev : { left, top }));
  }, [align]);

  useLayoutEffect(() => { if (open && portal) place(); }, [open, portal, mode, hasPalette, place]);
  useEffect(() => {
    if (!open || !portal) return;
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, portal, place]);
  useEffect(() => { if (!open) setPos(null); }, [open]);

  // --- Trigger ----------------------------------------------------------------
  let trigger;
  if (renderTrigger) {
    trigger = renderTrigger({ open, toggle, color: hex });
  } else if (variant === "dot") {
    trigger = (
      <button
        type="button" title={title || "Change colour"} aria-label={title || "Change colour"}
        aria-haspopup="dialog" aria-expanded={open}
        onMouseDown={e => e.preventDefault()}       // don't pull focus out of a text field
        onClick={toggle}
        style={{
          width: size, height: size, borderRadius: "50%", padding: 0, flexShrink: 0, cursor: "pointer",
          background: rainbow ? RAINBOW : hex, border: `1px solid ${D.border}`,
          outline: open ? `2px solid ${D.blue}` : "none", outlineOffset: 1,
        }}
      />
    );
  } else {
    trigger = (
      <button
        type="button" onClick={toggle} title={title} aria-haspopup="dialog" aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "7px 14px 7px 7px", background: D.bg,
          border: `1px solid ${open ? D.blue : D.border}`, borderRadius: 10, cursor: "pointer", transition: "border-color 0.12s",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = D.textMuted; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = D.border; }}
      >
        <span style={{ width: 30, height: 30, borderRadius: 8, background: hex, border: `1px solid ${D.border}`, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: D.text, fontFamily: MONO, letterSpacing: "0.02em" }}>{hex.toUpperCase()}</span>
        <ChevronIcon color={D.textMuted} open={open} />
      </button>
    );
  }

  // --- Popup ------------------------------------------------------------------
  const navBtn = (id, label) => (
    <button
      key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id}
      style={{
        textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
        fontFamily: FONT_FAMILY, background: mode === id ? `${D.blue}18` : "transparent", color: mode === id ? D.blue : D.text,
      }}
    >{label}</button>
  );
  const showNav = hasPalette || !!onReset;
  const selectedSwatch = palette.find(s => s.color === hex);

  const paletteContent = (
    <div style={{ width: PANE_W }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {palette.map(sw => {
          const selected = sw.color === hex;
          return (
            <button
              key={`${sw.id || ""}${sw.color}`} type="button" title={sw.label} aria-label={`Colour ${sw.label}`} aria-pressed={selected}
              onClick={() => pickSwatch(sw)}
              style={{
                height: 42, padding: 0, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                background: D.bg, border: `1px solid ${selected ? D.blue : "transparent"}`,
              }}
            >
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: sw.color, border: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {selected && <CheckIcon />}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: D.textMuted }}>
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: hex, border: `1px solid ${D.border}`, flexShrink: 0 }} />
        <span style={{ color: D.text, fontWeight: 600 }}>{selectedSwatch ? selectedSwatch.label : "Custom"}</span>
        <span style={{ fontFamily: MONO }}>{hex.toUpperCase()}</span>
      </div>
    </div>
  );

  const step = (e) => (e.shiftKey ? 0.1 : 0.02);
  const customContent = (
    <div style={{ width: PANE_W, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Saturation (left to right) / brightness (bottom to top) */}
      <DragArea
        role="slider" tabIndex={0} aria-label="Saturation and brightness"
        aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        onPoint={(x, y) => commitHsv({ h: hsvRef.current.h, s: x, v: 1 - y })}
        onEnd={endDrag}
        onKeyDown={e => {
          const d = step(e), cur = hsvRef.current;
          const next =
            e.key === "ArrowRight" ? { ...cur, s: clamp(cur.s + d) } :
            e.key === "ArrowLeft"  ? { ...cur, s: clamp(cur.s - d) } :
            e.key === "ArrowUp"    ? { ...cur, v: clamp(cur.v + d) } :
            e.key === "ArrowDown"  ? { ...cur, v: clamp(cur.v - d) } : null;
          if (next) { e.preventDefault(); commitHsv(next, true); }
        }}
        style={{
          width: "100%", height: 140, borderRadius: 8, border: `1px solid ${D.border}`, overflow: "hidden", boxSizing: "border-box",
          background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
        }}
      >
        <span style={thumbStyle(`${hsv.s * 100}%`, `${(1 - hsv.v) * 100}%`, hex)} />
      </DragArea>

      {/* Hue */}
      <DragArea
        role="slider" tabIndex={0} aria-label="Hue" aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(hsv.h)}
        onPoint={(x) => commitHsv({ ...hsvRef.current, h: x * 360 })}
        onEnd={endDrag}
        onKeyDown={e => {
          const d = e.shiftKey ? 15 : 3, cur = hsvRef.current;
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            commitHsv({ ...cur, h: clamp(cur.h + (e.key === "ArrowRight" ? d : -d), 0, 360) }, true);
          }
        }}
        style={{
          width: "100%", height: 12, borderRadius: 6, border: `1px solid ${D.border}`, boxSizing: "border-box",
          background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
      >
        <span style={thumbStyle(`${(hsv.h / 360) * 100}%`, "50%", `hsl(${hsv.h}, 100%, 50%)`)} />
      </DragArea>

      {/* Preview + exact entry */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 8, background: hex, border: `1px solid ${D.border}`, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Hex code</div>
          <input
            type="text" value={text} spellCheck={false} maxLength={7} aria-label="Hex code"
            onChange={e => typeHex(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); finishHex(); } }}
            onFocus={e => { e.currentTarget.style.borderColor = D.blue; }}
            onBlur={e => { e.currentTarget.style.borderColor = D.border; finishHex(); }}
            style={{
              width: "100%", boxSizing: "border-box", padding: "7px 10px", background: D.bg, border: `1px solid ${D.border}`,
              borderRadius: 8, color: D.text, fontSize: 13, outline: "none", fontFamily: MONO, letterSpacing: "0.02em",
              transition: "border-color 0.12s",
            }}
          />
        </div>
      </div>
    </div>
  );

  const panelPosition = portal
    ? { position: "fixed", left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }
    : { position: "absolute", top: "calc(100% + 8px)", [align === "right" ? "right" : "left"]: 0 };

  const panel = open && (
    <div
      ref={panelRef} role="dialog" aria-label={title || "Colour picker"}
      // Presses inside must not move focus (except into the hex field) and, in portal mode,
      // must not look like an "outside press" to whatever popup this was opened from.
      onMouseDown={e => { e.stopPropagation(); if (e.target.tagName !== "INPUT") e.preventDefault(); }}
      style={{
        ...panelPosition, zIndex, boxSizing: "border-box", display: "flex", gap: 14, padding: 14,
        background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
        fontFamily: FONT_FAMILY, color: D.text, maxWidth: "calc(100vw - 16px)",
      }}
    >
      {showNav && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 104, borderRight: `1px solid ${D.border}`, paddingRight: 12 }}>
          {hasPalette && navBtn("palette", "Palette")}
          {navBtn("custom", "Custom")}
          {onReset && (
            <>
              <div style={{ height: 1, background: D.border, margin: "6px 0" }} />
              <button
                type="button" onClick={reset}
                style={{ textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: D.textMuted, background: "transparent", fontFamily: FONT_FAMILY }}
              >{resetLabel}</button>
            </>
          )}
        </div>
      )}
      <div>{mode === "palette" && hasPalette ? paletteContent : customContent}</div>
    </div>
  );

  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      {trigger}
      {panel && (portal ? createPortal(panel, document.body) : panel)}
    </span>
  );
}
