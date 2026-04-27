import { useEffect } from "react";

// Hook untuk tangani keyboard & backdrop close pada modal custom.
// - ESC key → onClose
// - Optional: body scroll lock saat modal terbuka
//
// Dipakai di 4 modal admin yang masih custom (belum migrasi ke IDDS Modal).
// Kalau suatu saat migrasi, bisa dicopot karena IDDS Modal sudah handle ini.
export function useModalClose(onClose: () => void, opts: { lockScroll?: boolean } = {}) {
  const { lockScroll = true } = opts;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);

    // Body scroll lock — cegah halaman scroll saat modal open.
    const prevOverflow = document.body.style.overflow;
    if (lockScroll) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKey);
      if (lockScroll) {
        document.body.style.overflow = prevOverflow;
      }
    };
  }, [onClose, lockScroll]);
}
