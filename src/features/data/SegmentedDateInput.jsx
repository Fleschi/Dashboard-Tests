import { useRef } from "react";

export function SegmentedDateInput({ parts, onChange, D, size = "default" }) {
  const refs = { dd: useRef(), mm: useRef(), yy: useRef(), hh: useRef(), mn: useRef() };
  const ORDER = ["dd","mm","yy","hh","mn"];
  const big = size === "big";

  const box = {
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: "none",
    padding: 0, height: big ? 56 : 38, gap: 0,
  };
  const seg = {
    background: "transparent", border: "none", outline: "none",
    color: D.text, fontFamily: "monospace", fontWeight: big ? 700 : 400,
    fontSize: big ? 28 : 13,
    width: big ? 40 : 22, textAlign: "center", padding: 0,
    caretColor: D.blue,
  };
  const sep = { color: D.textMuted, fontSize: big ? 28 : 13, userSelect: "none", padding: big ? "0 3px" : "0 1px" };

  const handleKey = (key, e) => {
    const idx = ORDER.indexOf(key);

    if (e.key === "Backspace") {
      e.preventDefault();
      if (parts[key] && parts[key].length > 0) {
        onChange({ ...parts, [key]: parts[key].slice(0, -1) });
      } else if (idx > 0) {
        const prevKey = ORDER[idx - 1];
        refs[prevKey].current?.focus();
        if (parts[prevKey]) {
          onChange({ ...parts, [prevKey]: parts[prevKey].slice(0, -1) });
        }
      }
      return;
    }

    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const cur = parts[key] || "";
      if (cur.length >= 2) {
        const next = cur.slice(1) + e.key;
        onChange({ ...parts, [key]: next });
      } else {
        const next = cur + e.key;
        onChange({ ...parts, [key]: next });
        if (next.length === 2 && idx < ORDER.length - 1) {
          refs[ORDER[idx + 1]].current?.focus();
        }
      }
      return;
    }

    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault(); refs[ORDER[idx - 1]].current?.focus();
    } else if (e.key === "ArrowRight" && idx < ORDER.length - 1) {
      e.preventDefault(); refs[ORDER[idx + 1]].current?.focus();
    }
  };

  const handleChange = () => {};

  return (
    <div style={box}>
      {["dd","mm","yy"].map((k, i) => (
        <span key={k} style={{ display:"flex", alignItems:"center" }}>
          <input ref={refs[k]} value={parts[k]||""} maxLength={2}
            onChange={handleChange} onKeyDown={e => handleKey(k, e)}
            placeholder={["DD","MM","YY"][i]}
            style={{ ...seg }} />
          {i < 2 && <span style={sep}>/</span>}
        </span>
      ))}
      <span style={{ ...sep, padding: big ? "0 10px" : "0 4px" }}>·</span>
      {["hh","mn"].map((k, i) => (
        <span key={k} style={{ display:"flex", alignItems:"center" }}>
          <input ref={refs[k]} value={parts[k]||""} maxLength={2}
            onChange={handleChange} onKeyDown={e => handleKey(k, e)}
            placeholder={["HH","MM"][i]}
            style={{ ...seg }} />
          {i === 0 && <span style={sep}>:</span>}
        </span>
      ))}
    </div>
  );
}
