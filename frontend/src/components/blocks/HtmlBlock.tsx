import DOMPurify from "dompurify";
import { BlockContainer, normalizeContainerWidth } from "./BlockContainer";

const PADDING_MAP: Record<string, string> = {
  none: "0",
  small: "1rem",
  medium: "2rem",
  large: "3rem",
  xlarge: "5rem",
};

export function HtmlBlock({ props: p }: { props: Record<string, unknown> }) {
  const padding = PADDING_MAP[p.padding as string] || "2rem";
  const width = normalizeContainerWidth(p.containerWidth);
  const hideClass = `${p.hideOnMobile ? "hidden md:block" : ""} ${
    p.hideOnDesktop ? "md:hidden" : ""
  }`.trim();

  return (
    <section
      id={(p.sectionId as string) || undefined}
      className={`relative ${hideClass}`}
      style={{
        backgroundColor: p.bgColor as string,
        color: p.textColor as string,
        backgroundImage: p.bgImage ? `url(${p.bgImage})` : undefined,
        backgroundSize: (p.bgSize as string) || "cover",
        backgroundPosition: (p.bgPosition as string) || "center",
        backgroundRepeat: (p.bgRepeat as string) || "no-repeat",
        backgroundAttachment: p.bgFixed ? "fixed" : undefined,
        marginTop: `${p.marginTop || 0}rem`,
        marginBottom: `${p.marginBottom || 0}rem`,
      }}
    >
      {!!p.bgImage && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: p.overlayColor as string }}
        />
      )}
      <BlockContainer width={width} className="relative" style={{ paddingTop: padding, paddingBottom: padding }}>
        <div
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize((p.html as string) || ""),
          }}
        />
      </BlockContainer>
      {!!p.customCSS && <style>{p.customCSS as string}</style>}
    </section>
  );
}
