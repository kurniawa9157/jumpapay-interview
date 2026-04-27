import React from "react";

// Container width options — tertukar antar block via prop containerWidth.
// Pakai max-w- + mx-auto + px-4 default, kecuali 'full' yang full-bleed.
//   narrow → ±768px  (artikel teks-heavy)
//   boxed  → ±1024px (mid content / form)
//   wide   → ±1280px (landing default — match max-w-7xl lama)
//   full   → 100%    (hero, slider, banner full-bleed)
export type ContainerWidth = "narrow" | "boxed" | "wide" | "full";

// Map ContainerWidth → Tailwind class. Pakai fungsi (bukan object) supaya
// Tailwind purge bisa scan literal class names di file.
export const containerInnerClass = (w: ContainerWidth = "wide"): string => {
  switch (w) {
    case "narrow":
      return "mx-auto w-full max-w-3xl px-4";
    case "boxed":
      return "mx-auto w-full max-w-5xl px-4";
    case "full":
      return "w-full";
    case "wide":
    default:
      return "mx-auto w-full max-w-7xl px-4";
  }
};

// Backward-compat: HtmlBlock awalnya pakai naming 'container-sm' dst.
// Migrasi nilai lama ke nilai baru saat block render.
export const normalizeContainerWidth = (raw: unknown): ContainerWidth => {
  const v = String(raw || "").trim();
  switch (v) {
    case "container-sm":
      return "narrow";
    case "container":
      return "boxed";
    case "container-lg":
      return "wide";
    case "container-fluid":
      return "full";
    case "narrow":
    case "boxed":
    case "wide":
    case "full":
      return v;
    default:
      return "wide";
  }
};

interface BlockContainerProps {
  width?: ContainerWidth;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

// BlockContainer — wrapper inner content per block. Apply max-width + padding-x.
// Block pakai pattern: <section bg-color><BlockContainer>{content}</BlockContainer></section>
// Section ngambil bg full-bleed; BlockContainer center content sesuai width.
export const BlockContainer: React.FC<BlockContainerProps> = ({
  width,
  className = "",
  style,
  children,
}) => (
  <div className={`${containerInnerClass(width)} ${className}`.trim()} style={style}>
    {children}
  </div>
);
