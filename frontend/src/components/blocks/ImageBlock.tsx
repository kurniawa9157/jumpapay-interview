const SHADOW_MAP: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  md: "0 4px 6px rgba(0,0,0,0.1)",
  lg: "0 10px 15px rgba(0,0,0,0.1)",
};
const WIDTH_MAP: Record<string, string> = {
  full: "100%",
  "75%": "75%",
  "50%": "50%",
  "25%": "25%",
};
const ALIGN_MAP: Record<string, string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

export function ImageBlock({ props: p }: { props: Record<string, unknown> }) {
  if (!p.src) return null;

  return (
    <section
      id={(p.sectionId as string) || undefined}
      className="py-4 px-4"
      style={{
        backgroundColor: p.bgColor as string,
        display: "flex",
        justifyContent: ALIGN_MAP[p.align as string] || "center",
      }}
    >
      <img
        src={p.src as string}
        alt={(p.alt as string) || ""}
        style={{
          width: WIDTH_MAP[p.width as string] || "100%",
          maxWidth: "100%",
          boxShadow: SHADOW_MAP[p.shadow as string] || "none",
          borderRadius: 8,
        }}
      />
    </section>
  );
}
