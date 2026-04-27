import React from "react";
import { Badge as IddsBadge, type BadgeVariant as IddsBadgeVariant } from "@idds/react";

// API wrapper dipertahankan (variant kita: success|warn|info|danger|neutral)
// supaya call-site tidak perlu diubah. Internal delegasi ke IDDS Badge
// dengan type 'soft' + rounded 'full' (pill) — matching visual lama.

export type BadgeVariant = "success" | "warn" | "info" | "danger" | "neutral";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantMap: Record<BadgeVariant, IddsBadgeVariant> = {
  success: "success",
  warn: "warning",
  info: "info",
  danger: "error",
  neutral: "neutral",
};

export const Badge: React.FC<BadgeProps> = ({ variant = "neutral", children, className }) => (
  <IddsBadge
    variant={variantMap[variant]}
    type="soft"
    size="sm"
    rounded="full"
    className={className}
  >
    {children}
  </IddsBadge>
);
