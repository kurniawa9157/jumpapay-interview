import { useState, useEffect } from "react";
import { Icon } from "../Icon";
import { getPublicTemplateByID } from "../../api/public";
import { useLandingAuth } from "../LandingAuthContext";

const PADDING_MAP: Record<string, string> = { sm: "py-2", md: "py-3", lg: "py-4" };

interface MenuItem {
  label: string;
  url: string;
  children?: MenuItem[];
}

export function NavbarBlock({ props: p }: { props: Record<string, unknown> }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const auth = useLandingAuth();
  // Default true — admin bisa matikan via properties (showAuthButton=false)
  // kalau ingin pasang link login manual di menu items.
  const showAuthButton = p.showAuthButton !== false;

  const authLabel = !auth
    ? "Masuk"
    : !auth.loggedIn
    ? "Masuk"
    : auth.canEnterAdmin
    ? "Dasbor"
    : "Akun Saya";
  const authHandler = () => {
    if (!auth) return;
    if (!auth.loggedIn) auth.onLogin();
    else if (auth.canEnterAdmin) auth.onGoAdmin();
    else auth.onAccount();
  };

  useEffect(() => {
    const menuId = p.menu_navbar_id as string | undefined;
    if (!menuId) return;
    getPublicTemplateByID(menuId)
      .then((tpl) => {
        const items = (tpl.values || [])
          .filter((v) => v.key.startsWith("item_"))
          .sort((a, b) => a.order - b.order)
          .map((v) => {
            try {
              return JSON.parse(v.value || "{}") as MenuItem;
            } catch {
              return null;
            }
          })
          .filter((x): x is MenuItem => !!x);
        setMenuItems(items);
      })
      .catch(() => {});
  }, [p.menu_navbar_id]);

  const bgColor = (p.bgColor as string) || "#ffffff";
  const textColor = (p.textColor as string) || "#333333";
  const padding = PADDING_MAP[p.padding as string] || "py-3";

  return (
    <nav
      id={(p.sectionId as string) || undefined}
      className={`w-full ${padding} px-4 ${p.sticky ? "sticky top-0 z-50" : ""} ${p.shadow ? "shadow-md" : ""}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          {!!p.logoUrl && (
            <img src={p.logoUrl as string} alt="" style={{ width: Number(p.logoWidth) || 120 }} />
          )}
          <span className="font-semibold text-lg" style={{ color: textColor }}>
            {(p.brandTitle as string) || "Brand"}
          </span>
        </a>

        {/* Desktop menu */}
        <div
          className="hidden md:flex items-center gap-6"
          style={{
            justifyContent:
              p.menuAlign === "center"
                ? "center"
                : p.menuAlign === "left"
                ? "flex-start"
                : "flex-end",
          }}
        >
          {menuItems.map((item, i) => (
            <a
              key={i}
              href={item.url}
              className="text-sm hover:opacity-80 transition-opacity"
              style={{ color: textColor }}
            >
              {item.label}
            </a>
          ))}
          {!!p.showCtaButton && (
            <button
              type="button"
              className="px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                backgroundColor: p.btnBgColor as string,
                color: p.btnTextColor as string,
                borderColor: p.btnBorderColor as string,
              }}
            >
              Contact
            </button>
          )}
          {showAuthButton && (
            <button
              type="button"
              onClick={authHandler}
              className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor:
                  (p.btnBgColor as string) || textColor,
                color:
                  (p.btnTextColor as string) || bgColor,
              }}
            >
              <Icon name={auth?.loggedIn && auth.canEnterAdmin ? "dashboard" : "user"} size={13} />
              {authLabel}
            </button>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <Icon name={mobileOpen ? "x" : "menu"} size={24} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden mt-3 space-y-2 border-t pt-3"
          style={{ borderColor: `${textColor}20` }}
        >
          {menuItems.map((item, i) => (
            <a
              key={i}
              href={item.url}
              className="block py-2 text-sm"
              style={{ color: textColor }}
            >
              {item.label}
            </a>
          ))}
          {showAuthButton && (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                authHandler();
              }}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor:
                  (p.btnBgColor as string) || textColor,
                color:
                  (p.btnTextColor as string) || bgColor,
              }}
            >
              <Icon name={auth?.loggedIn && auth.canEnterAdmin ? "dashboard" : "user"} size={13} />
              {authLabel}
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
