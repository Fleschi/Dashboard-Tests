import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deleteTrade, saveTrade, updateTrade } from "../../services/supabase/trades";
import TimeRangePicker from "../../shared/components/TimeRangePicker";
import { fmt, fmtPct } from "../../shared/utils/format";
import { filterTradesByRange } from "../../shared/utils/timeRange";
import { calcStats } from "../../shared/utils/tradeStats";
import { StatCard } from "./StatCard";
import { TradePanel } from "./TradePanel";
import { EMPTY_PARTS, convertDate, fmtDateDisplay, isoToParts } from "./dateParts";

export default function DataPage({ trades, onTradesChange, design, topBarSlot, active, jumpDate, onJumpHandled, timeRange, onTimeRangeChange }) {
  const D = design;

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState("add"); // "add" | "edit"
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState({ ...EMPTY_PARTS(), rr:"", pnl:"" });
  const [saving, setSaving]       = useState(false);

  const [sortCol, setSortCol]     = useState("date");
  const [sortDir, setSortDir]     = useState("desc");
  const [selected, setSelected]   = useState(new Set());
  const [search, setSearch]       = useState("");

  // ─── Jump-to-date (triggered by clicking a day on the Overview calendar) ──
  const [highlightIds, setHighlightIds] = useState(new Set());
  const rowRefs = useRef({});

  useEffect(() => {
    if (!jumpDate) return;
    // Clear anything that could hide the target trade(s) from the table.
    // Note: the *range* itself is no longer touched here — App.js now drives
    // a temporary "inspect this day" override that sits on top of whatever
    // range was already selected, instead of this effect permanently
    // overwriting it to "All time". See App.js's `dataAllTimeOverride`.
    setSearch("");

    const y = jumpDate.getFullYear(), m = jumpDate.getMonth(), d = jumpDate.getDate();
    const matches = trades.filter(t => {
      if (!t.date) return false;
      const td = new Date(t.date);
      return td.getFullYear() === y && td.getMonth() === m && td.getDate() === d;
    });
    setHighlightIds(new Set(matches.map(t => t.id)));

    // Give the table a moment to re-render with filters cleared before scrolling.
    const scrollTimer = setTimeout(() => {
      const firstId = matches[0]?.id;
      if (firstId != null) rowRefs.current[firstId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);

    // Only tell App to clear jumpDate once the highlight has run its course —
    // doing it earlier would null the prop, re-run this effect, and its
    // cleanup would cancel scrollTimer above before it ever fires.
    const fadeTimer = setTimeout(() => {
      setHighlightIds(new Set());
      onJumpHandled?.();
    }, 3000);

    return () => { clearTimeout(scrollTimer); clearTimeout(fadeTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpDate]);

  const outcomeColor = pnl => pnl > 0 ? D.green : pnl < 0 ? D.red : D.yellow;
  const outcomeLabel = pnl => pnl > 0 ? "WIN" : pnl < 0 ? "LOSS" : "BE";

  // ─── Filtering (range + date search) & sorting ──────────────────────────
  // rangeFiltered is defined up here (rather than down by the table) because
  // the summary stats above the table are now driven by the same shared
  // range as everything else, not by the full unfiltered trade list.

  const rangeFiltered = useMemo(() => filterTradesByRange(trades, timeRange), [trades, timeRange]);

  // Summary stats reflect the shared date range — the same range selected in
  // Overview — so Net PnL/Winrate/etc. here always match what's shown there.
  const stats = useMemo(() => (rangeFiltered.length ? calcStats(rangeFiltered) : null), [rangeFiltered]);

  // ─── Panel open/close ────────────────────────────────────────────────────

  const openAddPanel = () => {
    setPanelMode("add");
    setEditId(null);
    setForm({ ...EMPTY_PARTS(), rr:"", pnl:"" });
    setPanelOpen(true);
  };

  const openEditPanel = (t) => {
    setPanelMode("edit");
    setEditId(t.id);
    setForm({ ...isoToParts(t.date), rr: String(t.rr || ""), pnl: String(t.pnl || "") });
    setPanelOpen(true);
  };

  const closePanel = () => setPanelOpen(false);

  // ─── Mutators (reusing existing supabase logic) ─────────────────────────

  const submit = async () => {
    if (form.pnl === "") return;
    const isoDate = convertDate(form);
    if (!isoDate) return;
    setSaving(true);
    try {
      const pnl = parseFloat(form.pnl) || 0, rr = parseFloat(form.rr) || 0;
      if (panelMode === "edit" && editId != null) {
        await updateTrade(editId, { date: isoDate, pnl, rr });
        onTradesChange(prev => prev.map(t => t.id === editId ? { ...t, date: isoDate, pnl, rr } : t));
      } else {
        const saved = await saveTrade({ date: isoDate, pnl, rr, mode: "backtesting" });
        onTradesChange(prev => [...prev, { date: isoDate, pnl, rr, id: saved.id }].sort((a,b) => new Date(a.date)-new Date(b.date)));
      }
      setPanelOpen(false);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const remove = async (id) => {
    try {
      await deleteTrade(id);
      onTradesChange(prev => prev.filter(t => t.id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch(e) { console.error(e); }
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    try {
      await Promise.all([...selected].map(id => deleteTrade(id)));
      onTradesChange(prev => prev.filter(t => !selected.has(t.id)));
      setSelected(new Set());
    } catch(e) { console.error(e); }
  };

  const exportCSV = () => {
    const csv = [["Date","Outcome","RR","PnL"],...trades.map(t=>[t.date,t.pnl>0?"win":t.pnl<0?"loss":"be",t.rr,t.pnl])].map(r=>r.join(",")).join("\n");
    const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="trades.csv"; a.click();
  };

  // ─── Search & sort ────────────────────────────────────────────────────────

  const searched = useMemo(() => {
    if (!search.trim()) return rangeFiltered;
    const q = search.trim().toLowerCase();
    return rangeFiltered.filter(t => {
      const display = fmtDateDisplay(t.date).toLowerCase();
      const raw = String(t.date || "").toLowerCase();
      return display.includes(q) || raw.includes(q);
    });
  }, [rangeFiltered, search]);

  const sorted = useMemo(() => [...searched].sort((a,b) => {
    let av=a[sortCol], bv=b[sortCol];
    if (sortCol==="date") { av=new Date(av); bv=new Date(bv); }
    if (sortCol==="pnl"||sortCol==="rr") { av=parseFloat(av); bv=parseFloat(bv); }
    return sortDir==="asc"?(av>bv?1:-1):(av<bv?1:-1);
  }), [searched, sortCol, sortDir]);

  const toggleSort = col => { if(sortCol===col) setSortDir(d=>d==="asc"?"desc":"asc"); else { setSortCol(col); setSortDir("desc"); } };
  const toggleSelect = id => setSelected(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const allSelected = sorted.length>0 && sorted.every(t=>selected.has(t.id));
  const toggleAll = () => {
    if (allSelected) setSelected(prev=>{ const n=new Set(prev); sorted.forEach(t=>n.delete(t.id)); return n; });
    else setSelected(prev=>{ const n=new Set(prev); sorted.forEach(t=>n.add(t.id)); return n; });
  };

  const thStyle = { padding: "14px 18px", fontSize: 12, fontWeight: 600, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", border: `1px solid ${D.border}`, background: `${D.bg}90`, userSelect: "none" };
  const tdStyle = { padding: "14px 18px", fontSize: 14, border: `1px solid ${D.border}`, verticalAlign: "middle" };

  const addTradeButton = (
    <button onClick={openAddPanel} style={{ padding:"13px 28px", background:D.text, color:D.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:15, cursor:"pointer" }}>
      + Add Trade
    </button>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

      {active && (
        topBarSlot
          ? createPortal(addTradeButton, topBarSlot)
          : <div style={{ display:"flex", justifyContent:"flex-end" }}>{addTradeButton}</div>
      )}

      {/* Header */}
      <div style={{ fontSize:17, fontWeight:700, color:D.text }}>Trade Data</div>

      {/* Statistics */}
      {stats ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:12 }}>
          <StatCard D={D} label="Net PnL" value={fmt(stats.totalPnl)} sub={`${stats.totalTrades} trades`} color={stats.totalPnl >= 0 ? D.green : D.red} />
          <StatCard D={D} label="Winrate" value={fmtPct(stats.winRate)} sub={`${stats.wins}W / ${stats.losses}L / ${stats.bes}BE`} ring={{ percent: stats.winRate * 100, color: stats.winRate >= 0.5 ? D.green : D.red }} />
          <StatCard D={D} label="Win / Loss Ratio" value={stats.avgRR > 0 ? `${stats.avgRR.toFixed(2)}R` : "—"} />
          <StatCard D={D} label="Expectancy" value={fmt(stats.expectancy)} sub="" color={stats.expectancy >= 0 ? D.green : D.red} />
        </div>
      ) : (
        <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:D.radius ?? 4, padding:32, textAlign:"center", color:D.textMuted, fontSize:14 }}>
          {trades.length === 0 ? "No trades yet — add your first trade to see statistics." : "No trades in the selected date range."}
        </div>
      )}

      {/* Table */}
      <div style={{ display:"flex", flexDirection:"column", background:D.card, border:`1px solid ${D.border}`, borderRadius:12, overflow:"hidden" }}>

        {/* Toolbar */}
        <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:12, padding:"16px 20px", borderBottom:`1px solid ${D.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search date"
              style={{ padding:"8px 14px", background:D.bg, border:`1px solid ${D.border}`, borderRadius:8, color:D.text, fontSize:13, outline:"none", width:220 }}
            />
            <TimeRangePicker range={timeRange} onChange={onTimeRangeChange} trades={trades} D={D} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {selected.size>0 && (
              <button onClick={deleteSelected} style={{ padding:"8px 16px", background:`${D.red}18`, border:`1px solid ${D.red}40`, borderRadius:8, color:D.red, cursor:"pointer", fontSize:13, fontWeight:600 }}>
                Delete {selected.size}
              </button>
            )}
            <button onClick={exportCSV} disabled={!trades.length} style={{ padding:"8px 16px", background:"transparent", border:`1px solid ${D.border}`, borderRadius:8, color:D.textMuted, cursor:"pointer", fontSize:13, fontWeight:500, opacity: trades.length ? 1 : 0.4 }}>
              Export CSV
            </button>
          </div>
        </div>

        {/* Grid table */}
        {sorted.length === 0 ? (
          <div style={{ padding:48, textAlign:"center", color:D.textMuted, fontSize:14 }}>
            {trades.length === 0 ? "No trades yet." : "No trades match your search/range."}
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width:44 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor:"pointer", accentColor:D.text, width:17, height:17 }} />
                  </th>
                  <th style={{ ...thStyle, cursor:"pointer" }} onClick={() => toggleSort("date")}>
                    Date {sortCol==="date" ? (sortDir==="asc" ? " ↑" : " ↓") : ""}
                  </th>
                  <th style={{ ...thStyle, cursor:"pointer" }} onClick={() => toggleSort("rr")}>
                    RR {sortCol==="rr" ? (sortDir==="asc" ? " ↑" : " ↓") : ""}
                  </th>
                  <th style={{ ...thStyle, cursor:"pointer" }} onClick={() => toggleSort("pnl")}>
                    PnL {sortCol==="pnl" ? (sortDir==="asc" ? " ↑" : " ↓") : ""}
                  </th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign:"right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t,i) => {
                  const color = outcomeColor(t.pnl);
                  const isSelected = selected.has(t.id);
                  const isHighlighted = highlightIds.has(t.id);
                  return (
                    <tr
                      key={t.id||i}
                      ref={el => { if (el) rowRefs.current[t.id] = el; }}
                      style={{
                        background: isHighlighted ? `${D.blue}25` : isSelected ? `${D.border}20` : "transparent",
                        transition: "background 0.6s ease",
                      }}
                    >
                      <td style={tdStyle}>
                        <input type="checkbox" checked={isSelected} onChange={()=>toggleSelect(t.id)} style={{ cursor:"pointer", accentColor:D.text, width:17, height:17 }} />
                      </td>
                      <td style={{ ...tdStyle, fontFamily:"monospace", color:D.text, fontWeight:500 }}>
                        {fmtDateDisplay(t.date)}
                      </td>
                      <td style={{ ...tdStyle, fontFamily:"monospace", color:D.textMuted, fontWeight:500 }}>
                        {t.rr>0?`${parseFloat(t.rr).toFixed(1)}R`:"—"}
                      </td>
                      <td style={{ ...tdStyle, fontFamily:"monospace", fontWeight:700, color }}>
                        {t.pnl>=0?`+$${t.pnl.toLocaleString()}`:`-$${Math.abs(t.pnl).toLocaleString()}`}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display:"inline-block", padding:"5px 13px", borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:"0.05em", background:`${color}15`, color, border:`1px solid ${color}30` }}>
                          {outcomeLabel(t.pnl)}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign:"right" }}>
                        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                          <button onClick={()=>openEditPanel(t)} style={{ background:"transparent", border:"none", color:D.textMuted, cursor:"pointer", fontSize:13, padding:"4px 8px", fontWeight:500 }}>Edit</button>
                          <button onClick={()=>remove(t.id)} style={{ background:"transparent", border:"none", color:D.textMuted, cursor:"pointer", fontSize:19, lineHeight:1, padding:"0 4px" }}>×</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ padding:"14px 22px", borderTop:`1px solid ${D.border}`, fontSize:12, color:D.textMuted, fontWeight:500 }}>
          Showing {sorted.length} of {trades.length} trades total
        </div>
      </div>

      <TradePanel
        open={panelOpen}
        mode={panelMode}
        form={form}
        onChange={setForm}
        onClose={closePanel}
        onSubmit={submit}
        saving={saving}
        D={D}
        outcomeColor={outcomeColor}
        outcomeLabel={outcomeLabel}
      />
    </div>
  );
}
