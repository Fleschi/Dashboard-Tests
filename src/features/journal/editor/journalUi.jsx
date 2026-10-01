// Small shared pieces for the journal's custom blocks (image gallery, tags):
// the design context, the popover look shared with the date picker and the
// selection/slash menus, and a few icons.

import { createContext, useContext, useEffect } from "react";
import { FONT_FAMILY } from "../../../theme/fonts";

export const MENU_FONT = FONT_FAMILY;

// Provided by JournalEditor. Custom node views render inside EditorContent,
// so they read the current design tokens from here instead of via props.
export const JournalContext = createContext({ D: null, editable: true });
export const useJournal = () => useContext(JournalContext);

export const popoverStyle = (D) => ({
  background: D.card, border: `1px solid ${D.border}`, borderRadius: 12,
  padding: 6, boxShadow: "0 12px 32px rgba(0,0,0,0.28)", fontFamily: MENU_FONT,
});

// Closes a popover on outside mousedown or Escape.
export function useOutsideClose(ref, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

export function Icon({ children, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  );
}
export const IconPlus    = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const IconX       = (p) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>;
export const IconCheck   = (p) => <Icon {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>;
export const IconPencil  = (p) => <Icon {...p}><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" /></Icon>;
export const IconTrash   = (p) => <Icon {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" /></Icon>;
export const IconChevron = (p) => <Icon {...p}><path d="M7 10l5 5 5-5" /></Icon>;
export const IconSettings = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </Icon>
);
export const IconImages  = (p) => (
  <Icon {...p}>
    <rect x="3" y="6" width="14" height="12" rx="2" />
    <path d="M7 6V5a2 2 0 012-2h10a2 2 0 012 2v9a2 2 0 01-2 2h-2" />
    <circle cx="8" cy="10.5" r="1.3" /><path d="M17 15l-3.5-3.5L6 18" />
  </Icon>
);
