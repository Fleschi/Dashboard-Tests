// Single image ("/image"): the standard Tiptap `image` node (same node name, so
// existing entries, the image counter, thumbnails and the Excel export keep
// working) upgraded with the same controls as the image gallery -- a
// Small / Medium / Large size from the same popup menu, and a caption line
// under the picture.
//
// Stored on the node: attrs { src, alt, size, caption }. Images saved before
// this existed have no size/caption; they load as "large" (full column width,
// which is how they always displayed) with an empty caption.

import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useJournal, MENU_FONT } from "../journalUi";
import { BlockMenu } from "./ImageGalleryBlock";

// Max width per size; "large" fills the column.
const SINGLE_IMAGE_WIDTHS = { small: 240, medium: 420, large: "100%" };

function SingleImageView({ node, updateAttributes, deleteNode, selected }) {
  const { D, editable } = useJournal();
  const { src, alt, caption } = node.attrs;
  const size = SINGLE_IMAGE_WIDTHS[node.attrs.size] !== undefined ? node.attrs.size : "large";

  return (
    <NodeViewWrapper className="journal-block" contentEditable={false} style={{ margin: "14px 0", fontFamily: MENU_FONT }}>
      <div style={{ position: "relative", width: "100%", maxWidth: SINGLE_IMAGE_WIDTHS[size] }}>
        <img
          className="journal-image" src={src} alt={alt || ""} draggable={false}
          style={{
            width: "100%", height: "auto", display: "block", margin: 0,
            borderRadius: 8, border: `1px solid ${D.border}`, cursor: "zoom-in",
            outline: selected ? `2px solid ${D.text}` : "none", outlineOffset: 2,
          }}
        />
        {editable && (
          <div style={{ position: "absolute", top: 8, right: 8 }}>
            <BlockMenu
              D={D} size={size} label="Image" deleteLabel="Delete image"
              onSize={id => updateAttributes({ size: id })}
              onDelete={deleteNode}
            />
          </div>
        )}
        {(editable || caption) && (
          <input
            className="journal-block-input"
            value={caption || ""}
            placeholder={editable ? "Add a caption..." : ""}
            readOnly={!editable}
            aria-label="Image caption"
            onChange={e => updateAttributes({ caption: e.target.value })}
            style={{ width: "100%", marginTop: 4, fontSize: 13, color: D.textMuted }}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const SingleImage = Image.extend({
  // Not draggable: a draggable wrapper would hijack text selection in the caption field (same as the gallery).
  draggable: false,

  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: "large",
        parseHTML: el => el.getAttribute("data-size") || "large",
        renderHTML: a => ({ "data-size": a.size || "large" }),
      },
      caption: {
        default: "",
        parseHTML: el => el.getAttribute("data-caption") || "",
        renderHTML: a => (a.caption ? { "data-caption": a.caption } : {}),
      },
    };
  },
  addNodeView() { return ReactNodeViewRenderer(SingleImageView); },
});
