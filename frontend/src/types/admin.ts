// Session type yang dipakai AuthenticatedShell + UserChip untuk render
// avatar + nama user yang sedang login. Foundation version — generic.
export interface AdminSession {
  name: string;
  role: string;
  avatarInitial: string;
}
