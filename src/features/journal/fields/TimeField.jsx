import { useEffect, useState } from "react";
import { FloatingLabel, floatingBoxStyle } from "./FloatingField";

// Time input for the editor's two time fields. A plain text input with HH:MM
// auto-formatting instead of the browser's native time control: the native one
// renders its digits through internal browser elements, which is what briefly
// showed a different font while the label animated. This one is an ordinary
// input, so it always uses the font we give it — and it has no "--:--"
// placeholder or clock button to hide in the first place.
// `onChange` only ever receives a complete "HH:MM" or "" — never a partial
// value — so autosave can't send half a time to the database.
function formatTimeDigits(raw) {
  let d = String(raw).replace(/\D/g, "").slice(0, 4);
  if (d.length === 1 && Number(d) > 2) d = "0" + d;           // "9" -> "09"
  if (d.length >= 2 && Number(d.slice(0, 2)) > 23) d = "23" + d.slice(2);
  if (d.length >= 3 && Number(d[2]) > 5) d = d.slice(0, 2);   // minutes tens digit <= 5
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

export function TimeField({ label, value, onChange, D }) {
  const [text, setText] = useState(value || "");
  const [focused, setFocused] = useState(false);
  const active = focused || text !== "";

  // Follow the stored value when it changes from outside (opening another entry).
  useEffect(() => { setText(value || ""); }, [value]);

  const handleChange = (e) => {
    const next = formatTimeDigits(e.target.value);
    setText(next);
    if (next === "") onChange("");
    else if (/^\d{2}:\d{2}$/.test(next)) onChange(next);
  };

  // Leaving the field completes a partial entry ("9" -> "09:00", "09:3" -> "09:30").
  const handleBlur = () => {
    setFocused(false);
    const d = text.replace(/\D/g, "");
    if (!d || d.length === 4) return;
    const full = d.length <= 2 ? `${d.padStart(2, "0")}:00` : `${d.slice(0, 2)}:${d.slice(2)}0`;
    setText(full);
    onChange(full);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text" inputMode="numeric" autoComplete="off" maxLength={5}
        value={text}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        style={{ ...floatingBoxStyle(D, active), fontFamily: "monospace" }}
      />
      <FloatingLabel label={label} active={active} D={D} />
    </div>
  );
}
