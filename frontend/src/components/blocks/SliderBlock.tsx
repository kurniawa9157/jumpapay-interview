import { useState, useEffect, useCallback } from "react";
import { Icon } from "../Icon";
import { getPublicTemplateByID } from "../../api/public";

interface SlideItem {
  image_url?: string;
  caption?: string;
  subtitle?: string;
  link?: string;
}

export function SliderBlock({ props: p }: { props: Record<string, unknown> }) {
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const sliderId = p.slider_id as string | undefined;
    if (!sliderId) return;
    getPublicTemplateByID(sliderId)
      .then((tpl) => {
        const items = (tpl.values || [])
          .filter((v) => v.key.startsWith("item_"))
          .sort((a, b) => a.order - b.order)
          .map((v) => {
            try {
              return JSON.parse(v.value || "{}") as SlideItem;
            } catch {
              return { image_url: v.value } as SlideItem;
            }
          });
        setSlides(items);
      })
      .catch(() => {});
  }, [p.slider_id]);

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % Math.max(slides.length, 1)),
    [slides.length],
  );
  const prev = useCallback(
    () =>
      setCurrent((c) =>
        slides.length === 0 ? 0 : (c - 1 + slides.length) % slides.length,
      ),
    [slides.length],
  );

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [slides.length, next]);

  const height =
    p.height === "fullscreen"
      ? "100vh"
      : p.height === "auto"
      ? "auto"
      : (p.height as string) || "400px";

  if (slides.length === 0) {
    return (
      <div
        id={(p.sectionId as string) || undefined}
        className="bg-paper-cream flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-ink-muted text-sm">Slider belum punya slide. Buat di admin → Sliders.</p>
      </div>
    );
  }

  const slide = slides[current];

  return (
    <div
      id={(p.sectionId as string) || undefined}
      className="relative overflow-hidden"
      style={{ height, borderRadius: Number(p.borderRadius) || 0 }}
    >
      {/* Slide image */}
      {slide.image_url && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            backgroundImage: `url(${slide.image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: (p.overlayColor as string) || "#000000",
          opacity: Number(p.overlayOpacity) || 0,
        }}
      />

      {/* Caption */}
      {(slide.caption || slide.subtitle) && (
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          {slide.caption && (
            <h2
              className="font-serif text-3xl md:text-5xl font-bold tracking-tight"
              style={{ color: (p.captionColor as string) || "#ffffff" }}
            >
              {slide.caption}
            </h2>
          )}
          {slide.subtitle && (
            <p
              className="mt-3 max-w-2xl text-base md:text-lg"
              style={{ color: (p.captionColor as string) || "#ffffff" }}
            >
              {slide.subtitle}
            </p>
          )}
          {slide.link && (
            <a
              href={slide.link}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-white/90 px-5 py-2.5 text-sm font-semibold text-brand"
            >
              Selengkapnya <Icon name="arrowRight" size={14} />
            </a>
          )}
        </div>
      )}

      {/* Arrows */}
      {!!p.showArrows && slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 transition"
            style={{ color: (p.arrowColor as string) || "#ffffff" }}
            aria-label="Sebelumnya"
          >
            <Icon name="chevronLeft" size={20} />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 transition"
            style={{ color: (p.arrowColor as string) || "#ffffff" }}
            aria-label="Selanjutnya"
          >
            <Icon name="chevronRight" size={20} />
          </button>
        </>
      )}

      {/* Indicators */}
      {!!p.showIndicators && slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${i === current ? "w-6" : "w-2"}`}
              style={{
                backgroundColor: (p.indicatorColor as string) || "#ffffff",
                opacity: i === current ? 1 : 0.5,
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
