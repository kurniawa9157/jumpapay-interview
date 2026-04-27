import { useEffect } from "react";

// Sederhana global guard registry — komponen yang punya unsaved state
// (mis. builder) memanggil useNavigationGuard(isDirty) untuk register.
// Parent layout (AdminLayout) panggil shouldBlockNavigation() sebelum
// navigate via sidebar; kalau true → tampil ConfirmDialog.
//
// Trade-off: pakai module-level Set, bukan React Context. Reason:
// guard biasanya dibutuhkan di level lebih rendah (deep inside view)
// dan parent (top-level layout) hanya read. Context akan butuh
// provider di paling atas + consumer dari mana saja, lebih ribet
// dibanding singleton ini. Cukup untuk single-instance app SPA.

type Guard = () => boolean; // true = ada unsaved (block navigate)

const guards = new Set<Guard>();

const register = (g: Guard): (() => void) => {
  guards.add(g);
  return () => {
    guards.delete(g);
  };
};

// shouldBlockNavigation — return true kalau ada guard yang report dirty.
export const shouldBlockNavigation = (): boolean => {
  for (const g of guards) {
    try {
      if (g()) return true;
    } catch {
      /* swallow */
    }
  }
  return false;
};

// useNavigationGuard — komponen call dengan boolean isDirty. Saat dirty,
// guard di-register; saat clean / unmount, guard di-cleanup otomatis.
export function useNavigationGuard(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;
    return register(() => true);
  }, [isDirty]);
}
