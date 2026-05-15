import { useState, useRef } from "react";
import { saveTrade, saveForwardTrade, deleteTrade, updateTrade, updateForwardTrade, deleteForwardTrade } from "../utils/supabase";
import { C } from "../utils/ui";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const convertDate = ({ dd, mm, yy, hh, mn }) => {
  if (!dd || !mm || !yy) return null;
  return `20${yy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}T${(hh||"00").padStart(2,"0")}:${(mn||"00").padStart(2,"0")}`;
};

const isoToParts = (iso) => {
  if (!iso) return { dd:"", mm:"", yy:"", hh:"", mn:"" };
  const [datePart="", timePart=""] = iso.split("T");
  const [y="",m="",d=""] = datePart.split("-");
  const [hh="",mn2=""] = timePart.split(":");
  return { dd:d.slice(0,2), mm:m.slice(0,2), yy:y.slice(2,4), hh:hh.slice(0,2), mn:mn2.slice(0,2) };
};

const EMPTY_PARTS = () => ({ dd:"", mm:"", yy:"", hh:"", mn:"" });

// ─── SegmentedDateInput ───────────────────────────────────────────────────────

function SegmentedDateInput({ parts, onChange, D }) {
  const refs = { dd: useRef(), mm: useRef(), yy: useRef(), hh: useRef(), mn: useRef() };
  const ORDER = ["dd","mm","yy","hh","mn"];

  const box = {
    display: "flex", alignItems: "center",
    background: D.bg, border: `1px solid ${D.border}`,
    borderRadius: 8, padding: "0 10px", height: 38, gap: 0,
  };
  const seg = {
    background: "transparent", border: "none", outline: "none",
    color: D.text, fontFamily: "monospace", fontSize: 13,
    width: 22, textAlign: "center", padding: 0,
    caretColor: D.blue,
  };
  const sep = { color: D.textMuted, fontSize: 13, userSelect: "none", padding: "0 1px" };

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
      <span style={{ ...sep, padding:"0 4px" }}>·</span>
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DataEntry({ trades, onTradesChange, design, mode = "backtesting" }) {
  const D = design || C;
  const [form, setForm]     = useState({ ...EMPTY_PARTS(), rr:"", pnl:"" });
  const [saving, setSaving] = useState(false);
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [selected, setSelected] = useState(new Set());
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_PARTS(), rr:"", pnl:"" });

  const numStyle = (border) => ({ padding:"8px 12px", background:D.bg, border:`1px solid ${border||D.border}`, borderRadius:8, color:D.text, fontSize:13, width:"100%", outline:"none" });
  const labelStyle = { fontSize:11, color:D.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:4 };
  const outcomeColor = pnl => pnl > 0 ? D.green : pnl < 0 ? D.red : D.yellow;
  const outcomeLabel = pnl => pnl > 0 ? "WIN" : pnl < 0 ? "LOSS" : "BE";

  const submit = async () => {
    if (form.pnl === "") return;
    const isoDate = convertDate(form);
    if (!isoDate) return;
    setSaving(true);
    try {
      const pnl = parseFloat(form.pnl)||0, rr = parseFloat(form.rr)||0;
      let saved;
      if (mode === "forward") {
        saved = await saveForwardTrade({ date:isoDate, time_entered:"", pnl, rr, risk:250, direction:"", continuation:"", sl_management:"", tp_management:"", location:"", notes:"", learnings:"", fees:0, screenshot_url:null });
      } else {
        saved = await saveTrade({ date:isoDate, pnl, rr, mode });
      }
      onTradesChange(prev => [...prev, { date:isoDate, pnl, rr, id:saved.id }].sort((a,b) => new Date(a.date)-new Date(b.date)));
      setForm({ ...EMPTY_PARTS(), rr:"", pnl:"" });
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const remove = async (id) => {
    try {
      if (mode === "forward") {
        await deleteForwardTrade(id);
      } else {
        await deleteTrade(id);
      }
      onTradesChange(prev => prev.filter(t => t.id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch(e) { console.error(e); }
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    try {
      const deleteFn = mode === "forward" ? deleteForwardTrade : deleteTrade;
      await Promise.all([...selected].map(id => deleteFn(id)));
      onTradesChange(prev => prev.filter(t => !selected.has(t.id)));
      setSelected(new Set());
    } catch(e) { console.error(e); }
  };

  const startEdit = (t) => {
    setEditId(t.id);
    setEditForm({ ...isoToParts(t.date), rr:String(t.rr||""), pnl:String(t.pnl||"") });
  };

  const saveEdit = async () => {
    try {
      const isoDate = convertDate(editForm);
      const pnl = parseFloat(editForm.pnl)||0, rr = parseFloat(editForm.rr)||0;
      if (mode === "forward") {
        await updateForwardTrade(editId, { date:isoDate, pnl, rr });
      } else {
        await updateTrade(editId, { date:isoDate, pnl, rr });
      }
      onTradesChange(prev => prev.map(t => t.id === editId ? { ...t, date:isoDate, pnl, rr } : t));
      setEditId(null);
    } catch(e) { console.error(e); }
  };

  const exportCSV = () => {
    const csv = [["Date","Outcome","RR","PnL"],...trades.map(t=>[t.date,t.pnl>0?"win":t.pnl<0?"loss":"be",t.rr,t.pnl])].map(r=>r.join(",")).join("\n");
    const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="trades.csv"; a.click();
  };

  const sorted = [...trades].sort((a,b) => {
    let av=a[sortCol], bv=b[sortCol];
    if (sortCol==="date") { av=new Date(av); bv=new Date(bv); }
    if (sortCol==="pnl"||sortCol==="rr") { av=parseFloat(av); bv=parseFloat(bv); }
    return sortDir==="asc"?(av>bv?1:-1):(av<bv?1:-1);
  });

  const toggleSort = col => { if(sortCol===col) setSortDir(d=>d==="asc"?"desc":"asc"); else { setSortCol(col); setSortDir("desc"); } };
  const toggleSelect = id => setSelected(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const allSelected = sorted.length>0 && sorted.every(t=>selected.has(t.id));
  const toggleAll = () => {
    if (allSelected) setSelected(prev=>{ const n=new Set(prev); sorted.forEach(t=>n.delete(t.id)); return n; });
    else setSelected(prev=>{ const n=new Set(prev); sorted.forEach(t=>n.add(t.id)); return n; });
  };

  // Pinterest-inspired spacing
  const COLS = "40px 1.2fr 0.8fr 1fr 0.9fr 100px";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

      {/* Form */}
      <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:12, padding:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:600, color:D.text }}>
            New Trade
            <span style={{ fontSize:11, padding:"3px 10px", borderRadius:6, background:`${D.border}40`, color:D.textMuted, marginLeft:10, fontWeight:500 }}>
              {mode==="backtesting"?"Backtesting":"Forward Testing"}
            </span>
          </div>
          <button onClick={exportCSV} disabled={!trades.length} style={{ padding:"6px 14px", background:"transparent", border:`1px solid ${D.border}`, borderRadius:8, color:D.textMuted, cursor:"pointer", fontSize:12, fontWeight:500 }}>Export CSV</button>
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"flex-end", flexWrap:"wrap" }}>
          <div>
            <label style={labelStyle}>Date & Time</label>
            <SegmentedDateInput parts={form} onChange={p=>setForm(f=>({...f,...p}))} D={D} />
          </div>
          <div style={{ width:90 }}>
            <label style={labelStyle}>RR</label>
            <input type="number" step="0.1" value={form.rr} onChange={e=>setForm(f=>({...f,rr:e.target.value}))} style={numStyle()} />
          </div>
          <div style={{ width:110 }}>
            <label style={labelStyle}>PnL</label>
            <input type="number" value={form.pnl} onChange={e=>setForm(f=>({...f,pnl:e.target.value}))}
              style={numStyle(form.pnl!==""?outcomeColor(parseFloat(form.pnl)):undefined)} />
          </div>
          <button onClick={submit} disabled={saving||form.pnl===""} style={{ padding:"8px 20px", background:D.text, color:D.bg, borderRadius:8, border:"none", fontWeight:700, fontSize:13, cursor:"pointer", opacity:(saving||form.pnl==="")?0.4:1, flexShrink:0 }}>
            {saving?"Saving...":"Add"}
          </button>
        </div>
        <div style={{ marginTop:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:D.textMuted, fontWeight:500 }}>{trades.length} trades total</span>
          {selected.size>0 && (
            <button onClick={deleteSelected} style={{ padding:"5px 14px", background:`${D.red}18`, border:`1px solid ${D.red}40`, borderRadius:6, color:D.red, cursor:"pointer", fontSize:12, fontWeight:600 }}>
              Delete {selected.size}
            </button>
          )}
        </div>
      </div>

      {/* Trade list - Pinterest style */}
      {trades.length>0 && (
        <div style={{ display:"flex", flexDirection:"column", background:D.card, border:`1px solid ${D.border}`, borderRadius:12, overflow:"hidden" }}>
          {/* Header */}
          <div style={{ display:"grid", gridTemplateColumns:COLS, alignItems:"center", padding:"14px 20px", background:`${D.bg}80` }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor:"pointer", accentColor:D.text, width:16, height:16 }} />
            {[["date","Date"],["rr","RR"],["pnl","PnL"],["outcome","Status"]].map(([col,lbl])=>(
              <div key={col} onClick={()=>col!=="outcome"&&toggleSort(col)}
                style={{ fontSize:11, fontWeight:600, color:sortCol===col?D.text:D.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", cursor:col!=="outcome"?"pointer":"default", userSelect:"none" }}>
                {lbl} {sortCol===col?(sortDir==="asc"?" ↑":" ↓"):""}
              </div>
            ))}
            <div style={{ fontSize:11, fontWeight:600, color:D.textMuted, textTransform:"uppercase", letterSpacing:"0.06em" }}>Actions</div>
          </div>

          {/* Rows */}
          {sorted.map((t,i) => {
            const isEditing = editId===t.id;
            const color = outcomeColor(t.pnl);
            const isSelected = selected.has(t.id);

            if (isEditing) return (
              <div key={t.id||i} style={{ display:"grid", gridTemplateColumns:COLS, alignItems:"center", padding:"10px 20px", background:`${D.border}25`, gap:8 }}>
                <input type="checkbox" checked={isSelected} onChange={()=>toggleSelect(t.id)} style={{ cursor:"pointer", accentColor:D.text, width:16, height:16 }} />
                <SegmentedDateInput parts={editForm} onChange={p=>setEditForm(f=>({...f,...p}))} D={D} />
                <input type="number" step="0.1" value={editForm.rr} onChange={e=>setEditForm(f=>({...f,rr:e.target.value}))} style={{ ...numStyle(), padding:"6px 10px", fontSize:12 }} />
                <input type="number" value={editForm.pnl} onChange={e=>setEditForm(f=>({...f,pnl:e.target.value}))} style={{ ...numStyle(), padding:"6px 10px", fontSize:12 }} />
                <div style={{ fontSize:11, fontWeight:700, color:outcomeColor(parseFloat(editForm.pnl)), textTransform:"uppercase", letterSpacing:"0.05em" }}>{outcomeLabel(parseFloat(editForm.pnl))}</div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={saveEdit} style={{ padding:"4px 10px", background:D.text, color:D.bg, border:"none", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:700 }}>Save</button>
                  <button onClick={()=>setEditId(null)} style={{ padding:"4px 10px", background:"transparent", border:`1px solid ${D.border}`, borderRadius:6, cursor:"pointer", fontSize:11, color:D.textMuted }}>✕</button>
                </div>
              </div>
            );

            return (
              <div key={t.id||i} style={{ display:"grid", gridTemplateColumns:COLS, alignItems:"center", padding:"16px 20px", background:isSelected?`${D.border}20`:"transparent", transition:"background 0.15s" }}>
                <div onClick={()=>toggleSelect(t.id)}>
                  <input type="checkbox" checked={isSelected} onChange={()=>toggleSelect(t.id)} style={{ cursor:"pointer", accentColor:D.text, width:16, height:16 }} />
                </div>
                <div style={{ fontFamily:"monospace", fontSize:12, color:D.text, fontWeight:500 }}>
                  {t.date?new Date(t.date).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}):"—"}
                </div>
                <div style={{ fontFamily:"monospace", fontSize:13, color:D.textMuted, fontWeight:500 }}>
                  {t.rr>0?`${parseFloat(t.rr).toFixed(1)}R`:"—"}
                </div>
                <div style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color }}>
                  {t.pnl>=0?`+$${t.pnl.toLocaleString()}`:`-$${Math.abs(t.pnl).toLocaleString()}`}
                </div>
                <div>
                  <span style={{ display:"inline-block", padding:"4px 12px", borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:"0.05em", background:`${color}15`, color, border:`1px solid ${color}30` }}>
                    {outcomeLabel(t.pnl)}
                  </span>
                </div>
                <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                  <button onClick={()=>startEdit(t)} style={{ background:"transparent", border:"none", color:D.textMuted, cursor:"pointer", fontSize:12, padding:"4px 8px", fontWeight:500 }}>Edit</button>
                  <button onClick={()=>remove(t.id)} style={{ background:"transparent", border:"none", color:D.textMuted, cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}