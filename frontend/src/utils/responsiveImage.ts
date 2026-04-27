// responsiveImage — helper untuk derive variant URL dari single URL string.
// Backend MediaService generate 3 variant (/uploads/thumb/, /uploads/medium/,
// /uploads/large/) saat upload image. Helper ini build srcset attributes
// supaya browser auto-pilih size sesuai viewport + pixel density.
//
// Pakai untuk field gambar yang stored sebagai URL string (mis. cover_image
// post, src ImageBlock, image_url slider item). Untuk MediaFile DTO yang
// sudah include url_thumb/medium/large dari API, akses langsung field-nya
// tanpa helper ini.

export interface ResponsiveImgAttrs {
  src: string;
  srcSet?: string;
  sizes?: string;
}

// Build srcset untuk URL upload. Kalau URL bukan dari /uploads/ (eksternal,
// CDN, dst) return src saja. Default sizes assume image fill viewport on
// mobile, max 1200px on desktop — override via param `sizes` kalau context
// beda (mis. card grid → "(max-width: 768px) 100vw, 400px").
export function buildSrcSet(
  url: string | null | undefined,
  sizes: string = "(max-width: 800px) 100vw, 1200px",
): ResponsiveImgAttrs {
  if (!url) return { src: "" };
  // Eksternal URL — pass through.
  if (!url.startsWith("/uploads/")) {
    return { src: url };
  }
  // Sudah variant URL — pass through (jangan double-derive).
  if (/^\/uploads\/(thumb|medium|large)\//.test(url)) {
    return { src: url };
  }
  const filename = url.substring("/uploads/".length);
  // Browser pick variant berdasarkan sizes vs viewport. Default src medium
  // untuk fallback browser tanpa srcset support.
  return {
    src: `/uploads/medium/${filename}`,
    srcSet: [
      `/uploads/thumb/${filename} 300w`,
      `/uploads/medium/${filename} 800w`,
      `/uploads/large/${filename} 1600w`,
    ].join(", "),
    sizes,
  };
}
