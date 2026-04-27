import { useState, useEffect } from "react";
import { Icon } from "../Icon";
import { getPublicTemplateByID } from "../../api/public";
import { useLandingAuth } from "../LandingAuthContext";

const PADDING_MAP: Record<string, string> = { sm: "py-2", md: "py-3", lg: "py-4" };

interface MenuItem {
  id: number;
  label: string;
  url: string;
  target?: "_self" | "_blank";
  parent_id?: number | null;
  children?: MenuItem[];
}

// Build flat list dengan parent_id → tree dengan children[]. Top-level =
// item yang parent_id null/undefined.
function buildMenuTree(flat: MenuItem[]): MenuItem[] {
  const byId = new Map<number, MenuItem>();
  flat.forEach((m) => byId.set(m.id, { ...m, children: [] }));
  const roots: MenuItem[] = [];
  byId.forEach((m) => {
    if (m.parent_id && byId.has(m.parent_id)) {
      byId.get(m.parent_id)!.children!.push(m);
    } else {
      roots.push(m);
    }
  });
  return roots;
}

export function NavbarBlock({ props: p }: { props: Record<string, unknown> }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
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
        const flat: MenuItem[] = (tpl.values || [])
          .filter((v) => v.key.startsWith("item_"))
          .sort((a, b) => a.order - b.order)
          .map((v) => {
            try {
              const obj = JSON.parse(v.value || "{}");
              return {
                id: v.id,
                label: String(obj.label || ""),
                url: String(obj.url || ""),
                target: obj.target === "_blank" ? "_blank" : "_self",
                parent_id: obj.parent_id ?? null,
              } as MenuItem;
            } catch {
              return null;
            }
          })
          .filter((x): x is MenuItem => !!x);
        setMenuItems(buildMenuTree(flat));
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
          {menuItems.map((item) => {
            const hasChildren = !!item.children && item.children.length > 0;
            if (!hasChildren) {
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target={item.target || "_self"}
                  rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                  className="text-sm hover:opacity-80 transition-opacity"
                  style={{ color: textColor }}
                >
                  {item.label}
                </a>
              );
            }
            const open = openSubmenu === item.id;
            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => setOpenSubmenu(item.id)}
                onMouseLeave={() => setOpenSubmenu((cur) => (cur === item.id ? null : cur))}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm hover:opacity-80 transition-opacity"
                  style={{ color: textColor }}
                  aria-expanded={open}
                  onClick={() => setOpenSubmenu(open ? null : item.id)}
                >
                  {item.label}
                  <Icon name="chevronDown" size={11} />
                </button>
                {open && (
                  <div
                    className="absolute left-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-md bg-white shadow-[0_10px_30px_rgba(15,30,61,0.18)] ring-1 ring-black/5"
                    style={{ color: "#333" }}
                  >
                    {item.children!.map((child) => (
                      <a
                        key={child.id}
                        href={child.url}
                        target={child.target || "_self"}
                        rel={child.target === "_blank" ? "noopener noreferrer" : undefined}
                        className="block px-4 py-2 text-sm hover:bg-paper-cream"
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
          {menuItems.map((item) => (
            <div key={item.id}>
              <a
                href={item.url}
                target={item.target || "_self"}
                rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                className="block py-2 text-sm"
                style={{ color: textColor }}
              >
                {item.label}
              </a>
              {item.children && item.children.length > 0 && (
                <div className="ml-4 space-y-1 border-l-2 pl-3" style={{ borderColor: `${textColor}30` }}>
                  {item.children.map((child) => (
                    <a
                      key={child.id}
                      href={child.url}
                      target={child.target || "_self"}
                      rel={child.target === "_blank" ? "noopener noreferrer" : undefined}
                      className="block py-1.5 text-[13px] opacity-80"
                      style={{ color: textColor }}
                    >
                      {child.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
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
