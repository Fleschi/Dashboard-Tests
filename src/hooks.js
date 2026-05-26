import { useState, useEffect, useMemo } from "react";
import { calcStats } from "./utils/calculations";
import { loadTrades, loadForwardTrades } from "./utils/supabase";
import { loadDesign } from "./modules/Settings";
import { DEFAULT_DESIGN, MOBILE_BREAKPOINT } from "./constants.jsx";

// ─── useTradeData ─────────────────────────────────────────────────────────────
// Loads backtesting + forward trades from Supabase on mount.

export function useTradeData() {
  const [backTrades, setBackTrades] = useState([]);
  const [fwdTrades,  setFwdTrades]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadTrades("backtesting"), loadForwardTrades()])
      .then(([bt, ft]) => { setBackTrades(bt); setFwdTrades(ft); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const backStats = useMemo(
    () => backTrades.length > 0 ? calcStats(backTrades) : null,
    [backTrades]
  );

  return { backTrades, setBackTrades, fwdTrades, setFwdTrades, backStats, loading, error };
}

// ─── useIsMobile ──────────────────────────────────────────────────────────────

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return isMobile;
}

// ─── useDesign ────────────────────────────────────────────────────────────────

export function useDesign() {
  return useState(() => loadDesign() || DEFAULT_DESIGN);
}

// ─── useNavigation ────────────────────────────────────────────────────────────
// Manages mode (backtesting/forward), per-mode active tabs, and settings overlay.

export function useNavigation() {
  const [mode,      setMode]      = useState("backtesting");
  const [backTab,   setBackTab]   = useState("overview");
  const [fwdTab,    setFwdTab]    = useState("fwd-overview");
  const [globalTab, setGlobalTab] = useState(null);

  const isForward = mode === "forward";
  const tab       = globalTab || (isForward ? fwdTab : backTab);

  const setTab = (id) => {
    if (id === "settings") { setGlobalTab("settings"); return; }
    setGlobalTab(null);
    if (isForward) setFwdTab(id); else setBackTab(id);
  };

  const switchMode = (m) => { setMode(m); setGlobalTab(null); };

  return { mode, isForward, tab, setTab, switchMode, globalTab };
}
