import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { getPublicTemplateByID } from "../../api/public";

const PADDING_MAP: Record<string, string> = {
  sm: "1.5rem",
  md: "2.5rem",
  lg: "3.5rem",
  xl: "5rem",
};

interface FooterWidget {
  title?: string;
  content?: string;
  type?: string;
}

export function FooterBlock({ props: p }: { props: Record<string, unknown> }) {
  const [widgets, setWidgets] = useState<FooterWidget[]>([]);

  useEffect(() => {
    const footerId = p.footer_id as string | undefined;
    if (!footerId) return;
    getPublicTemplateByID(footerId)
      .then((tpl) => {
        const items = (tpl.values || [])
          .filter((v) => v.key.startsWith("item_"))
          .sort((a, b) => a.order - b.order)
          .map((v) => {
            try {
              return JSON.parse(v.value || "{}") as FooterWidget;
            } catch {
              return { content: v.value } as FooterWidget;
            }
          });
        setWidgets(items);
      })
      .catch(() => {});
  }, [p.footer_id]);

  const padding = PADDING_MAP[p.padding as string] || "3.5rem";

  return (
    <footer
      id={(p.sectionId as string) || undefined}
      className="relative"
      style={{
        backgroundColor: (p.bgColor as string) || "#212529",
        color: (p.textColor as string) || "#ffffff",
        borderTop: p.borderTop ? `2px solid ${p.borderColor}` : undefined,
        backgroundImage: p.bgImage ? `url(${p.bgImage})` : undefined,
        backgroundSize: (p.bgSize as string) || "cover",
        backgroundPosition: (p.bgPosition as string) || "center",
        backgroundAttachment: p.bgFixed ? "fixed" : undefined,
        minHeight: (p.minHeight as string) || undefined,
      }}
    >
      {!!p.bgImage && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: p.overlayColor as string,
            opacity: Number(p.overlayOpacity) || 0,
          }}
        />
      )}
      <div
        className="relative max-w-7xl mx-auto px-4"
        style={{ paddingTop: padding, paddingBottom: padding }}
      >
        {widgets.length > 0 && (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {widgets.map((w, i) => (
              <div key={i}>
                {w.title && (
                  <h4
                    className="font-semibold mb-3"
                    style={{ color: p.headingColor as string }}
                  >
                    {w.title}
                  </h4>
                )}
                {w.content && (
                  <div
                    className="text-sm [&_a]:underline"
                    style={{ color: p.textColor as string }}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(w.content),
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        {!!p.showCopyright && !!p.copyrightText && (
          <div
            className="text-center text-sm pt-4 border-t"
            style={{
              borderColor: `${p.textColor}30`,
              color: p.textColor as string,
              opacity: 0.7,
            }}
          >
            {p.copyrightText as string}
          </div>
        )}
      </div>
    </footer>
  );
}
