import { useState, useEffect } from "react";
import { listPublicPosts } from "../../api/public";
import type { Post } from "../../types/cms";

const SHADOW_MAP: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  md: "0 4px 6px rgba(0,0,0,0.1)",
  lg: "0 10px 15px rgba(0,0,0,0.1)",
};

export function ArticleGridBlock({ props: p }: { props: Record<string, unknown> }) {
  const [articles, setArticles] = useState<Post[]>([]);

  useEffect(() => {
    listPublicPosts({ limit: Number(p.limit) || 6, type: "post" })
      .then((res) => setArticles(res.posts || []))
      .catch(() => {});
  }, [p.limit]);

  const cols = Number(p.cols) || 3;
  const hoverClass =
    p.hoverEffect === "lift"
      ? "hover:-translate-y-1"
      : p.hoverEffect === "scale"
      ? "hover:scale-[1.02]"
      : "";

  return (
    <section
      id={(p.sectionId as string) || undefined}
      className="relative py-12 px-4"
      style={{
        backgroundColor: p.sectionBg as string,
        backgroundImage: p.bgImage ? `url(${p.bgImage})` : undefined,
        backgroundSize: (p.bgSize as string) || "cover",
        backgroundPosition: (p.bgPosition as string) || "center",
        backgroundAttachment: p.bgFixed ? "fixed" : undefined,
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
      <div className="relative max-w-7xl mx-auto">
        {!!p.title && (
          <h2
            className="text-2xl font-bold mb-6"
            style={{ color: p.titleColor as string }}
          >
            {p.title as string}
          </h2>
        )}
        <div
          className="grid gap-6 max-md:!grid-cols-1"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {articles.map((article) => (
            <a
              key={article.id}
              href={`/news/${article.slug}`}
              className={`block rounded-lg overflow-hidden transition-all duration-300 ${hoverClass}`}
              style={{
                backgroundColor: p.cardBg as string,
                boxShadow: SHADOW_MAP[p.cardShadow as string] || "none",
                borderRadius: Number(p.cardRadius) || 8,
              }}
            >
              {article.cover_image && (
                <div
                  className="overflow-hidden"
                  style={{
                    paddingBottom: `${p.imageRatio || 60}%`,
                    position: "relative",
                  }}
                >
                  <img
                    src={article.cover_image}
                    alt={article.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h3
                  className="font-semibold text-sm line-clamp-2"
                  style={{ color: p.cardTextColor as string }}
                >
                  {article.title}
                </h3>
                {article.excerpt && (
                  <p
                    className="text-xs mt-1 line-clamp-2"
                    style={{ color: p.metaColor as string }}
                  >
                    {article.excerpt}
                  </p>
                )}
                <p
                  className="text-xs mt-2"
                  style={{ color: p.metaColor as string }}
                >
                  {new Date(article.published_at || article.created_at).toLocaleDateString(
                    "id-ID",
                    { year: "numeric", month: "short", day: "numeric" },
                  )}
                </p>
              </div>
            </a>
          ))}
        </div>
        {articles.length === 0 && (
          <p className="text-center text-sm text-ink-muted py-8">
            Belum ada artikel. Buat di admin → Posts.
          </p>
        )}
      </div>
    </section>
  );
}
