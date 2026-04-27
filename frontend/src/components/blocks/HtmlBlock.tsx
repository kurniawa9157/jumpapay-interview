import DOMPurify from "dompurify";

const PADDING_MAP: Record<string, string> = {
  none: "0",
  small: "1rem",
  medium: "2rem",
  large: "3rem",
  xlarge: "5rem",
};
const WIDTH_MAP: Record<string, string> = {
  "container-sm": "640px",
  container: "1024px",
  "container-lg": "1280px",
  "container-fluid": "100%",
};

export function HtmlBlock({ props: p }: { props: Record<string, unknown> }) {
  const padding = PADDING_MAP[p.padding as string] || "2rem";
  const maxWidth = WIDTH_MAP[p.containerWidth as string] || "1024px";
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
      <div className="relative" style={{ maxWidth, margin: "0 auto", padding }}>
        <div
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize((p.html as string) || ""),
          }}
        />
      </div>
      {!!p.customCSS && <style>{p.customCSS as string}</style>}
    </section>
  );
}
