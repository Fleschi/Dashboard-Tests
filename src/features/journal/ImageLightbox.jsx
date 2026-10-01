import { useEffect } from "react";
import { createPortal } from "react-dom";

export function ImageLightbox({ src, onClose }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  if (!src) return null;

  // Portaled to <body> with a z-index above the full-screen editor (1500) and
  // the slash menu (2100) — otherwise, rendered in the tab's own tree, it
  // ends up behind the editor when an image is opened from inside it.
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2500,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 48, cursor: "zoom-out",
      }}
    >
      <button
        onClick={onClose}
        title="Close"
        style={{
          position: "fixed", top: 20, right: 24, zIndex: 2501,
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)",
          color: "#fff", fontSize: 20, lineHeight: 1, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        ×
      </button>
      <img
        src={src}
        alt="Journal attachment"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: "90vw", maxHeight: "90vh",
          width: "auto", height: "auto",
          objectFit: "contain", borderRadius: 8,
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          cursor: "default", display: "block",
        }}
      />
    </div>,
    document.body
  );
}
