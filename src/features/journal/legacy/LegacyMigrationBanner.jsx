import { useState } from "react";
import { updateJournalEntry } from "../../../services/supabase/journal";
import { sortEntries } from "../entryUtils";
import { buildLegacyContent, needsMigration } from "./legacyContent";

// ─── Legacy entry migration ───────────────────────────────────────────────────
// Everything in this folder only exists to carry entries written under the old
// form (Daily Bias / Notes / Takeaway / three screenshot slots) into the current
// editor document. Once every entry has been migrated (the banner below stops
// showing), this folder, its two call sites in JournalPage.jsx and the legacy
// columns in services/supabase/journal.js can be deleted.

export function useLegacyMigration(entries, setEntries) {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState(null); // {done, total, failed} while/after running
  const pendingCount = entries.filter(needsMigration).length;

  // One-time (per entry) upgrade of old-format rows into the new editor's
  // `content` document. Runs sequentially and reports progress as it goes;
  // a failure on one entry doesn't stop the rest, and is counted separately
  // so nothing looks silently skipped.
  const run = async () => {
    const toMigrate = entries.filter(needsMigration);
    if (toMigrate.length === 0) return;
    setMigrating(true);
    setResult({ done: 0, total: toMigrate.length, failed: 0 });

    let done = 0, failed = 0;
    for (const e of toMigrate) {
      try {
        const content = buildLegacyContent(e);
        const updated = await updateJournalEntry(e.id, {
          day:          e.day,
          time_entered: e.time_entered,
          pnl:          e.pnl,
          tod_time:     e.tod_time,
          content,
        });
        setEntries(prev => sortEntries(prev.map(x => x.id === e.id ? updated : x)));
      } catch (err) {
        failed += 1;
      }
      done += 1;
      setResult({ done, total: toMigrate.length, failed });
    }
    setMigrating(false);
  };

  return { pendingCount, migrating, result, run, dismiss: () => setResult(null) };
}

export function LegacyMigrationBanner({ D, migration }) {
  const { pendingCount, migrating, result, run, dismiss } = migration;
  return (
    <>
      {!migrating && !result && pendingCount > 0 && (
        <div style={{
          background: `${D.blue}12`, border: `1px solid ${D.blue}30`, borderRadius: 10,
          padding: "11px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 13, color: D.text }}>
            {pendingCount} older {pendingCount === 1 ? "entry" : "entries"} can be upgraded to the new editor — nothing is deleted, this just brings the old notes/images into it.
          </span>
          <button
            onClick={run}
            style={{ marginLeft: "auto", background: D.blue, color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Migrate now
          </button>
        </div>
      )}
      {migrating && (
        <div style={{ background: `${D.blue}12`, border: `1px solid ${D.blue}30`, borderRadius: 10, padding: "11px 18px", fontSize: 13, color: D.text }}>
          Migrating entry {result?.done ?? 0} of {result?.total ?? 0}…
        </div>
      )}
      {!migrating && result && (
        <div style={{
          background: `${D.blue}12`, border: `1px solid ${D.blue}30`, borderRadius: 10,
          padding: "11px 18px", display: "flex", alignItems: "center", gap: 14,
        }}>
          <span style={{ fontSize: 13, color: D.text }}>
            Migrated {result.done - result.failed} of {result.total} older {result.total === 1 ? "entry" : "entries"}.
            {result.failed > 0 && <span style={{ color: D.red }}> {result.failed} failed — you can try "Migrate now" again for those.</span>}
          </span>
          <button onClick={() => dismiss()} style={{ marginLeft: "auto", background: "transparent", color: D.textMuted, border: "none", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
        </div>
      )}
    </>
  );
}
