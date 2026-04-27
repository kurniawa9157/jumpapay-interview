import DOMPurify from "dompurify";
import type { BentoRow } from "../../types/builder.types";
import { containerInnerClass, normalizeContainerWidth } from "./BlockContainer";

const GAP_MAP: Record<string, string> = {
  none: "0",
  small: "8px",
  medium: "16px",
  large: "24px",
};
const SHADOW_MAP: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  md: "0 4px 6px rgba(0,0,0,0.1)",
  lg: "0 10px 15px rgba(0,0,0,0.1)",
};

export function CardGridBlock({ props: p }: { props: Record<string, unknown> }) {
  const rows = (p.bentoRows as BentoRow[]) || [];
  const gap = GAP_MAP[p.gap as string] || "16px";
  const width = normalizeContainerWidth(p.containerWidth);

  return (
    <section
      id={(p.sectionId as string) || undefined}
      className="relative"
      style={{
        backgroundColor: p.sectionBg as string,
        backgroundImage: p.sectionBgImage ? `url(${p.sectionBgImage})` : undefined,
        backgroundSize: (p.sectionBgSize as string) || "cover",
        backgroundPosition: (p.sectionBgPosition as string) || "center",
        backgroundRepeat: (p.sectionBgRepeat as string) || "no-repeat",
        backgroundAttachment: p.sectionBgFixed ? "fixed" : undefined,
      }}
    >
      {!!p.sectionBgImage && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: p.sectionOverlayColor as string }}
        />
      )}
      <div
        className={`relative py-8 ${containerInnerClass(width)}`}
        style={{ display: "flex", flexDirection: "column", gap }}
      >
        {rows.map((row, ri) => (
          <div
            key={ri}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${row.cols}, 1fr)`,
              gap,
            }}
            className="[&>div]:col-span-1 max-md:!grid-cols-1"
          >
            {row.cells.map((cell, ci) => (
              <div
                key={ci}
                style={{
                  backgroundColor: p.cardBg as string,
                  color: p.textColor as string,
                  borderColor: p.borderColor as string,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderRadius: Number(p.borderRadius) || 8,
                  boxShadow: SHADOW_MAP[p.cardShadow as string] || "none",
                  padding: `${Number(p.cardPadding || 3) * 8}px`,
                }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(cell || ""),
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
