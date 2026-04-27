import { createContext, useContext } from "react";

// LandingAuthState — minimal auth context yang dipakai oleh public block
// (mis. NavbarBlock) untuk render tombol login/dashboard otomatis tanpa
// perlu admin men-design ulang link manual.
//
// Provider ada di RoleLanding.tsx; consumer pakai useLandingAuth() hook.
// Saat block dirender di luar landing (mis. CanvasPreview di builder),
// hook return null → block render placeholder.
export interface LandingAuthState {
  loggedIn: boolean;
  // canEnterAdmin = is_admin OR punya minimal 1 modul admin permission.
  canEnterAdmin: boolean;
  displayName: string;
  onLogin: () => void;
  onGoAdmin: () => void;
  onAccount: () => void;
  onLogout: () => void;
}

const LandingAuthContext = createContext<LandingAuthState | null>(null);

export const LandingAuthProvider = LandingAuthContext.Provider;

export const useLandingAuth = (): LandingAuthState | null =>
  useContext(LandingAuthContext);
