import React, { useEffect, useMemo, useState } from "react";
import { useAppearance } from "../../appearance";
import { Icon, IconName } from "../Icon";

export interface SidebarNavItem {
  key: string;
  label: string;
  icon: IconName;
  badge?: number | string;
  // group — opsional, dipakai untuk render section header.
  // Item tanpa group masuk ke group default 'Navigasi'.
  group?: string;
}

export interface SidebarProps {
  variant: "admin" | "ppat-user";
  items: SidebarNavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  onClose?: () => void;
  brandTitle: string;
  brandSubtitle: string;
}

// groupItems — group items berdasarkan `group` property, preserve insertion order.
// Item tanpa group masuk ke default 'Navigasi'.
function groupItems(items: SidebarNavItem[]): Array<[string, SidebarNavItem[]]> {
  const order: string[] = [];
  const map = new Map<string, SidebarNavItem[]>();
  for (const item of items) {
    const g = item.group || "Navigasi";
    if (!map.has(g)) {
      map.set(g, []);
      order.push(g);
    }
    map.get(g)!.push(item);
  }
  return order.map((g) => [g, map.get(g)!]);
}

export const Sidebar: React.FC<SidebarProps> = ({ variant, items, activeKey, onNavigate, onClose, brandTitle, brandSubtitle }) => {
  const appearance = useAppearance();
  const groupedItems = useMemo(() => groupItems(items), [items]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const isAdmin = variant === "admin";
  const sidebarVariant = appearance.components.sidebar.variant;
  const compact = appearance.components.sidebar.density === "compact";
  const logoSrc = appearance.assets.logo_mark_url || appearance.assets.logo_url;

  const adminLight = isAdmin && sidebarVariant !== "brand_dark";
  const bg = isAdmin
    ? sidebarVariant === "neutral"
      ? "bg-white"
      : sidebarVariant === "brand_light"
        ? "bg-paper-cream"
        : "bg-sidebar-admin"
    : "bg-paper-cream";
  const textMuted = isAdmin && !adminLight ? "text-white/60" : "text-ink-muted";
  const brandText = isAdmin && !adminLight ? "text-white" : "text-brand";
  const accentLabel = isAdmin && !adminLight ? "text-white/70" : "text-accent";
  const hover = isAdmin
    ? adminLight
      ? "hover:bg-white hover:text-brand-deep"
      : "hover:bg-sidebar-adminHover hover:text-white"
    : "hover:bg-white hover:text-brand-deep";
  const activeClass = isAdmin
    ? adminLight
      ? "bg-white text-brand-deep shadow-[0_4px_12px_rgba(15,30,61,0.05)]"
      : "bg-sidebar-adminActive text-white"
    : "bg-white text-brand-deep shadow-[0_4px_12px_rgba(15,30,61,0.05)]";
  const idleText = isAdmin && !adminLight ? "text-white/80" : "text-ink-tertiary";
  const logoBg = isAdmin && !adminLight ? "bg-white/10 text-white" : "bg-brand-deep text-white";
  const headerPadding = compact ? "px-4 py-4" : "px-5 py-5";
  const navPadding = compact ? "px-2 pb-3" : "px-3 pb-4";
  const itemPadding = compact ? "px-2.5 py-2 text-[12.5px]" : "px-3 py-2.5 text-[13px]";
  const footerPadding = compact ? "px-4 py-3" : "px-5 py-4";

  useEffect(() => {
    const activeGroup = groupedItems.find(([, itemsInGroup]) =>
      itemsInGroup.some((item) => item.key === activeKey),
    )?.[0];
    if (!activeGroup) return;
    setCollapsedGroups((prev) => {
      if (!prev[activeGroup]) return prev;
      return { ...prev, [activeGroup]: false };
    });
  }, [activeKey, groupedItems]);

  const toggleGroup = (groupLabel: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  return (
    <aside className={`flex h-full w-[240px] flex-col ${bg} border-r ${isAdmin && !adminLight ? "border-brand-deep/40" : "border-line-cream"}`}>
      <div className={`flex items-center gap-3 ${headerPadding}`}>
        <div className={`flex ${compact ? "h-9 w-9" : "h-10 w-10"} items-center justify-center overflow-hidden rounded-xl ${logoBg}`}>
          {logoSrc ? (
            <img src={logoSrc} alt="" className="h-full w-full object-contain p-1.5" />
          ) : (
            <Icon name="building" size={18} />
          )}
        </div>
        <div className="min-w-0">
          <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${accentLabel}`}>{brandSubtitle}</div>
          <div className={`truncate text-sm font-semibold tracking-[-0.01em] ${brandText}`}>{brandTitle}</div>
        </div>
        {onClose && (
          <button
            type="button"
            className={`ml-auto md:hidden ${isAdmin ? "text-white/70 hover:text-white" : "text-ink-tertiary hover:text-brand-deep"}`}
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <Icon name="x" size={18} />
          </button>
        )}
      </div>

      <nav className={`mt-2 flex-1 overflow-y-auto ${navPadding}`}>
        {groupedItems.map(([groupLabel, itemsInGroup], gi) => {
          const isCollapsed = !!collapsedGroups[groupLabel];
          const groupID = `sidebar-group-${groupLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          return (
            <div key={groupLabel} className={gi === 0 ? "" : "mt-4"}>
              <button
                type="button"
                onClick={() => toggleGroup(groupLabel)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${textMuted} ${
                  isAdmin && !adminLight ? "hover:bg-white/10 hover:text-white" : "hover:bg-white hover:text-brand-deep"
                }`}
                aria-expanded={!isCollapsed}
                aria-controls={groupID}
              >
                <span className="flex-1 text-left">{groupLabel}</span>
                <Icon
                  name={isCollapsed ? "chevronRight" : "chevronDown"}
                  size={13}
                  className="shrink-0"
                  aria-hidden
                />
              </button>
              {!isCollapsed && (
                <ul id={groupID} className="mt-1 flex flex-col gap-1">
                  {itemsInGroup.map((item) => {
                    const isActive = item.key === activeKey;
                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          onClick={() => onNavigate(item.key)}
                          className={`group flex w-full items-center gap-3 rounded-lg ${itemPadding} font-medium transition ${
                            isActive ? activeClass : `${idleText} ${hover}`
                          }`}
                        >
                          <Icon name={item.icon} size={16} />
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge !== undefined && item.badge !== 0 && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isAdmin ? "bg-white/15 text-white" : "bg-accent/10 text-accent"
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>
          );
        })}
      </nav>

      <div className={`${footerPadding} text-[10px] ${textMuted} border-t ${isAdmin && !adminLight ? "border-white/10" : "border-line-cream"}`}>
        {brandTitle}
      </div>
    </aside>
  );
};
