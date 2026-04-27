import React from "react";
import {
  type BuilderComponent,
  type BentoRow,
} from "../../../types/builder.types";

interface Props {
  component: BuilderComponent;
}

// CanvasPreview — render placeholder kompak per block type untuk canvas
// builder. Tidak fetch master data (master fetch hanya saat public render
// supaya canvas tetap fast). Cukup tampilkan visual hint.
export const CanvasPreview: React.FC<Props> = ({ component: comp }) => {
  const p = comp.props;

  switch (comp.type) {
    case "navbar":
      return (
        <div
          className="flex items-center justify-between rounded px-4 py-2"
          style={{ backgroundColor: p.bgColor as string }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: p.textColor as string }}
          >
            {(p.brandTitle as string) || "Brand"}
          </span>
          <span className="text-xs text-ink-muted">Menu items…</span>
        </div>
      );

    case "slider":
      return (
        <div className="flex h-24 items-center justify-center rounded bg-paper-cream text-sm text-ink-muted">
          Hero / Slider area
        </div>
      );

    case "html_block":
      return (
        <div
          className="max-h-24 overflow-hidden rounded p-3 text-sm"
          style={{
            backgroundColor: p.bgColor as string,
            color: p.textColor as string,
          }}
          dangerouslySetInnerHTML={{
            __html: (p.html as string) || "<p>HTML content…</p>",
          }}
        />
      );

    case "card_grid": {
      const rows = (p.bentoRows as BentoRow[]) || [
        { cols: 2, cells: ["", ""] },
      ];
      return (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${row.cols}, 1fr)` }}
            >
              {row.cells.map((_, j) => (
                <div
                  key={j}
                  className="flex h-12 items-center justify-center rounded border border-line-sand bg-paper-cream/40 p-2 text-xs text-ink-muted"
                >
                  Cell {j + 1}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    case "image_block":
      return p.src ? (
        <img
          src={p.src as string}
          alt={(p.alt as string) || ""}
          className="mx-auto max-h-24 rounded"
        />
      ) : (
        <div className="flex h-20 items-center justify-center rounded bg-paper-cream text-sm text-ink-muted">
          Image placeholder
        </div>
      );

    case "article_grid":
      return (
        <div>
          <p
            className="mb-2 text-sm font-semibold"
            style={{ color: p.titleColor as string }}
          >
            {(p.title as string) || "Article Grid"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="flex h-16 items-center justify-center rounded bg-paper-cream/40 p-2 text-xs text-ink-muted"
              >
                Article {n}
              </div>
            ))}
          </div>
        </div>
      );

    case "footer":
      return (
        <div
          className="rounded p-3 text-center text-sm"
          style={{
            backgroundColor: p.bgColor as string,
            color: p.textColor as string,
          }}
        >
          Footer content
        </div>
      );

    default:
      return (
        <div className="text-sm text-ink-muted">Unknown component</div>
      );
  }
};
