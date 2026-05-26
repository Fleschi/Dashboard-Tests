import { useState, useMemo, useEffect, useRef } from "react";
import { C } from "../utils/ui";
import { loadPropFirms, savePropFirm, updatePropFirm, deletePropFirm } from "../utils/supabase";
import { fitStudentT, sampleStudentT } from "../utils/calculations";

const DEFAULT_FIRM = (id) => ({
  id, name: `Prop Firm ${id}`,
  evalAccountSize: 100000, evalProfitTarget: 8, evalMaxDrawdown: 10,
  evalDrawdownType: "static", evalDailyLossLimit: 5, evalMinTradingDays: 10,
  evalTrailingLock: false, evalTimeLimitEnabled: false, evalTimeLimitDays: 30,
  costModel: "one_time", evalCost: 500, consistencyEnabled: false, consistencyMaxDayPct: 30,
  fundedMaxDrawdown: 5, fundedDrawdownType: "trailing", fundedDailyLossLimit: 4,
  fundedProfitSplit: 80, fundedMinPayout: 500, fundedMinWinDays: 10,
  fundedMinProfitPerTrade: 0, fundedActivationFee: 0, fundedResetCost: 300, fundedTrailingLock: false,
});

const DRAWDOWN_LABELS = {
  static: "Static (from initial balance)",
  trailing: "Trailing (from equity peak)",
  eod_trailing: "EOD Trailing (end-of-day peak)",
};

// ── Simulation ────────────────────────────────────────────────────────────────

function simulateFirm(firm, rawTrades, simCount = 2000) {
  if (!rawTrades?.length) return null;
  const acct = firm.evalAccountSize;
  const evalMaxDD = acct * (firm.evalMaxDrawdown / 100);
  const evalDailyLim = firm.evalDailyLossLimit > 0 ? acct * (firm.evalDailyLossLimit / 100) : Infinity;
  const evalTarget = acct * (firm.evalProfitTarget / 100);
  const maxTrades = firm.evalTimeLimitEnabled ? firm.evalTimeLimitDays * 10 : 5000;
  const fundedMaxDD = acct * (firm.fundedMaxDrawdown / 100);
  const fundedDailyLim = firm.fundedDailyLossLimit > 0 ? acct * (firm.fundedDailyLossLimit / 100) : Infinity;
  const dist = fitStudentT(rawTrades.map(t => t.pnl));
  const BASE_ACCOUNT = 50000;
  const historicalLosses = rawTrades.filter(t => t.pnl < 0).map(t => Math.abs(t.pnl));
  const avgHistoricalLoss = historicalLosses.length > 0 ? historicalLosses.reduce((a, b) => a + b, 0) / historicalLosses.length : 250;
  const scaleFactor = (acct * (avgHistoricalLoss / BASE_ACCOUNT)) / avgHistoricalLoss;
  const weeklyMap = {};
  for (const t of rawTrades) {
    const d = new Date(t.date); if (isNaN(d)) continue;
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const wk = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    weeklyMap[`${d.getFullYear()}-W${wk}`] = (weeklyMap[`${d.getFullYear()}-W${wk}`] || 0) + 1;
  }
  const weeks = Object.keys(weeklyMap).length;
  const tradesPerWeek = weeks > 0 ? rawTrades.length / weeks : 5;
  const tradesPerDay = tradesPerWeek / 5;
  const wins = rawTrades.filter(t => t.pnl > 0), losses = rawTrades.filter(t => t.pnl < 0);
  const winRate = (wins.length + losses.length) > 0 ? wins.length / (wins.length + losses.length) : 0;
  const avgWin = wins.length ? wins.reduce((a, t) => a + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, t) => a + t.pnl, 0) / losses.length : 0;
  const expectancy = winRate * avgWin + (1 - winRate) * avgLoss;
  const scaledExpectancy = expectancy * (acct / BASE_ACCOUNT);
  const tradesPerMonth = tradesPerWeek * 4;
  const grossMonthlyPnl = scaledExpectancy * tradesPerMonth;
  const avgMonthlyPayout = grossMonthlyPnl >= firm.fundedMinPayout ? grossMonthlyPnl * (firm.fundedProfitSplit / 100) : 0;

  let evalPassed = 0, tradesToPassList = [], fundedFailures = 0, fundedMonthsActive = [];
  for (let s = 0; s < simCount; s++) {
    let equity = 0, peak = 0, breached = false, passed = false;
    let tradeCount = 0, dayPnl = 0, tradesThisDay = 0, daysRun = 0;
    for (let tr = 0; tr < maxTrades; tr++) {
      const pnl = sampleStudentT(dist) * scaleFactor;
      equity += pnl; dayPnl += pnl; tradesThisDay++; tradeCount++;
      if (tradesThisDay >= tradesPerDay) {
        if (dayPnl < -evalDailyLim) { breached = true; break; }
        daysRun++; dayPnl = 0; tradesThisDay = 0;
      }
      if (equity > peak) peak = equity;
      const evalEffPeak = (firm.evalTrailingLock && firm.evalDrawdownType !== "static") ? Math.min(peak, 0) : peak;
      const dd = firm.evalDrawdownType === "static" ? -equity : evalEffPeak - equity;
      if (dd >= evalMaxDD) { breached = true; break; }
      if (!passed && equity >= evalTarget && daysRun >= firm.evalMinTradingDays) { passed = true; tradesToPassList.push(tradeCount); break; }
    }
    if (!passed || breached) continue;
    evalPassed++;
    let fEquity = 0, fPeak = 0, monthsThisSim = 0;
    const trailingLock = firm.fundedTrailingLock && firm.fundedDrawdownType !== "static";
    const tradesPerMonthSim = Math.round(tradesPerDay * 5 * 4);
    for (let month = 0; month < 12; month++) {
      let monthFailed = false, mDayPnl = 0, mTradesThisDay = 0;
      for (let tr = 0; tr < tradesPerMonthSim; tr++) {
        const pnl = sampleStudentT(dist) * scaleFactor;
        fEquity += pnl; mDayPnl += pnl; mTradesThisDay++;
        if (mTradesThisDay >= tradesPerDay) {
          if (mDayPnl < -fundedDailyLim) { monthFailed = true; break; }
          mDayPnl = 0; mTradesThisDay = 0;
        }
        if (fEquity > fPeak) fPeak = fEquity;
        const effPeak = trailingLock ? Math.min(fPeak, 0) : fPeak;
        const fDD = firm.fundedDrawdownType === "static" ? -fEquity : effPeak - fEquity;
        if (fDD >= fundedMaxDD) { monthFailed = true; break; }
      }
      if (monthFailed) { fundedFailures++; break; }
      monthsThisSim++;
    }
    fundedMonthsActive.push(monthsThisSim);
  }

  const passRate = evalPassed / simCount;
  const avgTradesToPass = tradesToPassList.length ? tradesToPassList.reduce((a, b) => a + b, 0) / tradesToPassList.length : null;
  const avgDaysToPass = avgTradesToPass != null ? avgTradesToPass / tradesPerDay : null;
  const avgWeeksToPass = avgTradesToPass != null ? avgTradesToPass / tradesPerWeek : null;
  const fundedFailRate = evalPassed > 0 ? fundedFailures / evalPassed : 0;
  const avgMonthsActive = fundedMonthsActive.length ? fundedMonthsActive.reduce((a, b) => a + b, 0) / fundedMonthsActive.length : 0;
  const upfrontCost = (firm.costModel === "one_time" ? firm.evalCost : 0) + firm.fundedActivationFee;
  const monthlyCost = firm.costModel === "subscription" ? firm.evalCost : 0;
  const expectedResetsPerYear = fundedFailRate * (12 / Math.max(avgMonthsActive, 1));
  const grossMonthly = avgMonthlyPayout * passRate * (1 - fundedFailRate);
  const netMonthly = grossMonthly - monthlyCost - expectedResetsPerYear * firm.fundedResetCost / 12;
  const net6m = grossMonthly * 6 - upfrontCost - monthlyCost * 6 - expectedResetsPerYear * firm.fundedResetCost * 0.5;
  const netAnnual = grossMonthly * 12 - upfrontCost - monthlyCost * 12 - expectedResetsPerYear * firm.fundedResetCost;
  const breakEvenMonths = netMonthly > 0 ? upfrontCost / netMonthly : null;
  return { passRate, failRate: 1 - passRate, avgTradesToPass, avgDaysToPass, avgWeeksToPass, tradesPerWeek, fundedFailRate, avgMonthsActive, avgMonthlyPayout, grossMonthlyPnl, tradesPerMonth, upfrontCost, breakEvenMonths, net6m, netAnnual, expectedResetsPerYear };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Toggle({ on, onChange, color, D }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width: 38, height: 20, borderRadius: 10, background: on ? color : D.border, cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.15s" }}>
      <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: on ? 21 : 3, transition: "left 0.15s" }} />
    </div>
  );
}

function NumField({ label, fkey, value, onChange, inputStyle, labelStyle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      <input type="number" value={value} onChange={e => onChange(fkey, parseFloat(e.target.value) || 0)} style={inputStyle} />
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ firm, onUpdate, onClose, D }) {
  const [f, setF] = useState(firm);
  const upd = (key, val) => setF(prev => ({ ...prev, [key]: val }));

  const inputStyle = { padding: "6px 10px", background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6, color: D.text, fontSize: 13, fontFamily: "monospace", width: "100%" };
  const labelStyle = { fontSize: 11, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 };

  return (
    // Overlay
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      {/* Modal */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, width: "min(780px, 95vw)", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
          <input value={f.name} onChange={e => upd("name", e.target.value)} style={{ ...inputStyle, fontSize: 15, fontWeight: 600, width: "auto", flex: 1, marginRight: 16 }} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: D.textMuted, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>

        {/* Two-column body */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, overflow: "auto", flex: 1 }}>

          {/* Evaluation */}
          <div style={{ padding: 24, borderRight: `1px solid ${D.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: D.blue, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Evaluation / Challenge</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Account Size ($)" fkey="evalAccountSize" value={f.evalAccountSize} />
              <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Profit Target (%)" fkey="evalProfitTarget" value={f.evalProfitTarget} />
              <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Max Drawdown (%)" fkey="evalMaxDrawdown" value={f.evalMaxDrawdown} />
              <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Daily Loss Limit (%)" fkey="evalDailyLossLimit" value={f.evalDailyLossLimit} />
              <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Min Trading Days" fkey="evalMinTradingDays" value={f.evalMinTradingDays} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Drawdown Type</label>
              <select value={f.evalDrawdownType} onChange={e => upd("evalDrawdownType", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {Object.entries(DRAWDOWN_LABELS).map(([val, lbl]) => <option key={val} value={val} style={{ background: D.card }}>{lbl}</option>)}
              </select>
            </div>

            {(f.evalDrawdownType === "trailing" || f.evalDrawdownType === "eod_trailing") && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Toggle on={f.evalTrailingLock} onChange={v => upd("evalTrailingLock", v)} color={D.blue} D={D} />
                <span style={{ fontSize: 12, color: f.evalTrailingLock ? D.blue : D.textMuted }}>Trailing DD locks at starting balance</span>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Cost Model</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {[["one_time", "One-time fee"], ["subscription", "Monthly fee"]].map(([val, lbl]) => (
                  <button key={val} onClick={() => upd("costModel", val)} style={{ flex: 1, padding: "6px 0", borderRadius: 6, cursor: "pointer", fontSize: 12, border: `1px solid ${f.costModel === val ? D.blue : D.border}`, background: f.costModel === val ? `${D.blue}18` : "transparent", color: f.costModel === val ? D.blue : D.textMuted }}>
                    {lbl}
                  </button>
                ))}
              </div>
              <input type="number" value={f.evalCost} onChange={e => upd("evalCost", parseFloat(e.target.value) || 0)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Toggle on={f.evalTimeLimitEnabled} onChange={v => upd("evalTimeLimitEnabled", v)} color={D.blue} D={D} />
                <span style={{ fontSize: 12, color: f.evalTimeLimitEnabled ? D.blue : D.textMuted }}>Time Limit</span>
              </div>
              {f.evalTimeLimitEnabled && <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Max days to pass" fkey="evalTimeLimitDays" value={f.evalTimeLimitDays} />}
            </div>

            <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: f.consistencyEnabled ? 10 : 0 }}>
                <Toggle on={f.consistencyEnabled} onChange={v => upd("consistencyEnabled", v)} color={D.blue} D={D} />
                <span style={{ fontSize: 12, color: f.consistencyEnabled ? D.blue : D.textMuted }}>Consistency Rule</span>
              </div>
              {f.consistencyEnabled && <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Max single day % of total profit" fkey="consistencyMaxDayPct" value={f.consistencyMaxDayPct} />}
            </div>
          </div>

          {/* Funded */}
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: D.blue, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Funded Account</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Max Drawdown (%)" fkey="fundedMaxDrawdown" value={f.fundedMaxDrawdown} />
              <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Daily Loss Limit (%)" fkey="fundedDailyLossLimit" value={f.fundedDailyLossLimit} />
              <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Profit Split (%)" fkey="fundedProfitSplit" value={f.fundedProfitSplit} />
              <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Min Payout ($)" fkey="fundedMinPayout" value={f.fundedMinPayout} />
              <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Min Winning Days" fkey="fundedMinWinDays" value={f.fundedMinWinDays ?? 10} />
              <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Min Profit / Trade ($)" fkey="fundedMinProfitPerTrade" value={f.fundedMinProfitPerTrade ?? 0} />
              <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Activation Fee ($)" fkey="fundedActivationFee" value={f.fundedActivationFee} />
              <NumField onChange={upd} inputStyle={inputStyle} labelStyle={labelStyle} label="Reset Cost ($)" fkey="fundedResetCost" value={f.fundedResetCost} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Drawdown Type</label>
              <select value={f.fundedDrawdownType} onChange={e => upd("fundedDrawdownType", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {Object.entries(DRAWDOWN_LABELS).map(([val, lbl]) => <option key={val} value={val} style={{ background: D.card }}>{lbl}</option>)}
              </select>
            </div>

            {(f.fundedDrawdownType === "trailing" || f.fundedDrawdownType === "eod_trailing") && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Toggle on={f.fundedTrailingLock} onChange={v => upd("fundedTrailingLock", v)} color={D.blue} D={D} />
                <span style={{ fontSize: 12, color: f.fundedTrailingLock ? D.blue : D.textMuted }}>Trailing DD locks at starting balance</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${D.border}`, display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "8px 18px", background: "transparent", border: `1px solid ${D.border}`, borderRadius: 8, color: D.textMuted, cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={() => { onUpdate(f); onClose(); }} style={{ padding: "8px 18px", background: D.text, border: "none", borderRadius: 8, color: D.bg, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PropFirm({ stats, design }) {
  const D = design || C;
  const rawTrades = useMemo(() => stats?.rawTrades || [], [stats]);
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingFirm, setEditingFirm] = useState(null);
  const saveTimeout = useRef({});

  useEffect(() => {
    loadPropFirms().then(loaded => {
      setFirms(loaded.length > 0 ? loaded : [DEFAULT_FIRM(1), DEFAULT_FIRM(2)]);
      setLoading(false);
    }).catch(() => { setFirms([DEFAULT_FIRM(1), DEFAULT_FIRM(2)]); setLoading(false); });
  }, []);

  const results = useMemo(() => {
    if (!rawTrades?.length) return [];
    return firms.map(f => simulateFirm(f, rawTrades, 2000));
  }, [firms, rawTrades]);

  const autoSave = (updatedFirm) => {
    const key = updatedFirm._dbId || updatedFirm.id;
    if (saveTimeout.current[key]) clearTimeout(saveTimeout.current[key]);
    saveTimeout.current[key] = setTimeout(async () => {
      setSaving(true);
      try {
        if (updatedFirm._dbId) { await updatePropFirm(updatedFirm._dbId, updatedFirm); }
        else { const saved = await savePropFirm(updatedFirm); setFirms(prev => prev.map(f => f.id === updatedFirm.id ? { ...f, _dbId: saved.id } : f)); }
      } catch (e) { console.error(e); }
      setSaving(false);
    }, 600);
  };

  const addFirm = async () => {
    const nf = DEFAULT_FIRM(Date.now());
    setFirms(prev => [...prev, nf]);
    try { const saved = await savePropFirm(nf); setFirms(prev => prev.map(f => f.id === nf.id ? { ...f, _dbId: saved.id } : f)); } catch (e) { console.error(e); }
  };

  const removeFirm = async (i) => {
    if (firms.length <= 1) return;
    const firm = firms[i];
    setFirms(firms.filter((_, idx) => idx !== i));
    if (firm._dbId) { try { await deletePropFirm(firm._dbId); } catch (e) { console.error(e); } }
  };

  const handleUpdate = (updated) => {
    setFirms(prev => prev.map(f => f.id === updated.id ? updated : f));
    autoSave(updated);
  };

  if (loading) return <div style={{ color: D.textMuted, padding: 40, textAlign: "center" }}>Loading...</div>;

  const fmtUSD = n => (!n && n !== 0) ? "—" : n >= 0 ? `+$${Math.round(n).toLocaleString()}` : `-$${Math.abs(Math.round(n)).toLocaleString()}`;
  const fmtPct = n => `${(n * 100).toFixed(1)}%`;
  const fmtD   = n => n ? `${n.toFixed(0)}d` : "—";



  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Edit Modal */}
      {editingFirm && (
        <EditModal
          firm={editingFirm} D={D}
          onUpdate={handleUpdate}
          onClose={() => setEditingFirm(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, color: D.textMuted }}>
          {rawTrades.length} trades · 2,000 runs
          {saving && <span style={{ color: D.textMuted, marginLeft: 10 }}>saving...</span>}
        </div>
        <button onClick={addFirm} style={{ padding: "8px 18px", background: "transparent", border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          + Add Firm
        </button>
      </div>

      {rawTrades.length === 0 && (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 24, textAlign: "center", color: D.textMuted, fontSize: 13 }}>
          Add trades in the Data tab first to run simulations.
        </div>
      )}

      {/* Firm table — single grid so ALL dividers align perfectly */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, overflow: "hidden" }}>

        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "180px 1px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 80px", alignItems: "center", padding: "10px 20px", borderBottom: `1px solid ${D.border}`, background: D.bg }}>
          <div />
          <div />
          {["Pass Rate","Fail Rate","Avg to pass","Funded fail","Avg payout/mo","Months active","Cost"].map(label => (
            <div key={label} style={{ fontSize: 10, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, padding: "0 16px" }}>{label}</div>
          ))}
          <div />
        </div>

        {/* One row per firm */}
        {firms.map((firm, i) => {
          const r = results[i];
          const stats = r && rawTrades.length > 0 ? [
            [fmtPct(r.passRate),                                        r.passRate > 0.5 ? D.green : D.red],
            [fmtPct(r.failRate),                                        D.red],
            [fmtD(r.avgDaysToPass),                                     D.text],
            [fmtPct(r.fundedFailRate),                                  r.fundedFailRate > 0.3 ? D.red : D.textMuted],
            [fmtUSD(r.avgMonthlyPayout),                                r.avgMonthlyPayout > 0 ? D.green : D.red],
            [r.avgMonthsActive ? `${r.avgMonthsActive.toFixed(1)}mo` : "—", D.text],
            [`$${r.upfrontCost.toLocaleString()}`,                      D.textMuted],
          ] : null;

          return (
            <div key={firm.id} style={{
              display: "grid",
              gridTemplateColumns: "180px 1px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 80px",
              alignItems: "center",
              borderBottom: i < firms.length - 1 ? `1px solid ${D.border}` : "none",
              padding: "0 20px",
            }}>
              {/* Name + actions */}
              <div style={{ padding: "14px 0" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: D.text, marginBottom: 5 }}>{firm.name}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setEditingFirm(firm)} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, border: `1px solid ${D.border}`, background: "transparent", color: D.textMuted, cursor: "pointer" }}>Edit</button>
                  {firms.length > 1 && <button onClick={() => removeFirm(i)} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, border: `1px solid ${D.border}`, background: "transparent", color: D.red, cursor: "pointer" }}>Remove</button>}
                </div>
              </div>

              {/* Vertical separator */}
              <div style={{ height: 40, background: D.border }} />

              {/* Stat cells */}
              {stats ? stats.map(([value, color], idx) => (
                <div key={idx} style={{ padding: "14px 16px", borderRight: idx < stats.length - 1 ? `1px solid ${D.border}` : "none" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "monospace" }}>{value}</div>
                </div>
              )) : (
                <div style={{ gridColumn: "span 7", padding: "14px 16px", color: D.textMuted, fontSize: 13 }}>
                  Add trades to see results
                </div>
              )}

              {/* Empty last col spacer */}
              <div />
            </div>
          );
        })}
      </div>

      {/* Comparison */}
      {firms.length > 1 && results.filter(Boolean).length > 1 && rawTrades.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: D.text, marginTop: 4 }}>Comparison</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(firms.length, 4)}, 1fr)`, gap: 14 }}>
            {firms.map((firm, i) => {
              const r = results[i];
              if (!r) return null;
              return (
                <div key={firm.id} style={{ background: D.card, borderRadius: 10, padding: 16, borderTop: `2px solid ${D.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: D.text, marginBottom: 10 }}>{firm.name}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: r.passRate > 0.5 ? D.green : D.red }}>{fmtPct(r.passRate)}</div>
                  <div style={{ fontSize: 11, color: D.textMuted, marginBottom: 10 }}>pass rate</div>
                  {[
                    ["12m net",     fmtUSD(r.netAnnual),  r.netAnnual > 0 ? D.green : D.red],
                    ["Break-even",  r.breakEvenMonths ? `${r.breakEvenMonths.toFixed(1)} mo` : "—", D.text],
                    ["Cost",        `$${r.upfrontCost.toLocaleString()}`, D.textMuted],
                    ["Funded fail", fmtPct(r.fundedFailRate), D.red],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: `1px solid ${D.border}` }}>
                      <span style={{ color: D.textMuted }}>{k}</span>
                      <span style={{ fontFamily: "monospace", color: c }}>{v}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}