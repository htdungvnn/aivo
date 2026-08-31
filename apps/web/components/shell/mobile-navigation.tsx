"use client";

/**
 * MobileNavigation - Bottom tab navigation for mobile
 * Fixed position at bottom of screen
 */

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { mobileNavItems, isPathActive } from "../../../../packages/design-system/src";

// Icons
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  TrendingUp,
  MoreHorizontal,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  "layout-dashboard": LayoutDashboard,
  "calendar-days": CalendarDays,
  "message-square": MessageSquare,
  "trending-up": TrendingUp,
  "more-horizontal": MoreHorizontal,
};

function getIcon(iconName: string): React.ElementType {
  return iconMap[iconName] || LayoutDashboard;
}

interface MobileNavItemProps {
  item: (typeof mobileNavItems)[number];
  isActive: boolean;
}

function MobileNavItem({ item, isActive }: MobileNavItemProps) {
  const Icon = getIcon(item.icon || "layout-dashboard");

  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-2 px-4 transition-colors touch-target",
        isActive
          ? "text-[var(--color-primary)]"
          : "text-[var(--color-muted-foreground)]"
      )}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
    >
      <div className="relative">
        <Icon
          className={cn(
            "h-6 w-6 transition-transform",
            isActive && "scale-110"
          )}
        />
        {/* Active indicator dot */}
        {isActive && (
          <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--color-primary)]" />
        )}
      </div>
      <span className="text-xs font-medium">{item.label}</span>
    </Link>
  );
}

interface MobileNavigationProps {
  currentPath: string;
}

export function MobileNavigation({ currentPath }: MobileNavigationProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md lg:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2">
        {mobileNavItems.map((item) => (
          <MobileNavItem
            key={item.id}
            item={item}
            isActive={isPathActive(currentPath, item.href)}
          />
        ))}
      </div>

      {/* Safe area padding for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-[var(--color-surface)]" />
    </nav>
  );
}
