export const convertDate = ({ dd, mm, yy, hh, mn }) => {
  if (!dd || !mm || !yy) return null;
  return `20${yy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}T${(hh||"00").padStart(2,"0")}:${(mn||"00").padStart(2,"0")}`;
};

export const isoToParts = (iso) => {
  if (!iso) return { dd:"", mm:"", yy:"", hh:"", mn:"" };
  const [datePart="", timePart=""] = iso.split("T");
  const [y="",m="",d=""] = datePart.split("-");
  const [hh="",mn2=""] = timePart.split(":");
  return { dd:d.slice(0,2), mm:m.slice(0,2), yy:y.slice(2,4), hh:hh.slice(0,2), mn:mn2.slice(0,2) };
};

export const EMPTY_PARTS = () => ({ dd:"", mm:"", yy:"", hh:"", mn:"" });

// Human-readable preview shown live while filling in the segmented date —
// turns raw digit entry into a confirmed, readable moment (e.g. "Thu, 4 Sep 2026 · 14:30").
export const humanDateFromParts = (parts) => {
  if (!parts.dd || !parts.mm || !parts.yy) return null;
  const iso = convertDate(parts);
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    + ` · ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

export const fmtDateDisplay = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2,"0");
  const mn = String(d.getMinutes()).padStart(2,"0");
  return `${dd}/${mm}/${yy} · ${hh}:${mn}`;
};
