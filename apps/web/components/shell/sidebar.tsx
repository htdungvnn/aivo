"use client";

/**
 * Sidebar - Desktop navigation sidebar
 * Collapsible navigation with sections
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  appNavOverview,
  appNavHealth,
  appNavInsights,
  appNavAccount,
  appNavAdmin,
  isPathActive,
  type NavItem,
} from "../../../../packages/design-system/src";

// Icons
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Heart,
  Utensils,
  Dumbbell,
  Moon,
  Footprints,
  Droplets,
  Scale,
  CheckCircle,
  TrendingUp,
  FileText,
  Link2,
  User,
  Shield,
  Settings,
  Users,
  ScrollText,
  BarChart3,
  Server,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  "layout-dashboard": LayoutDashboard,
  "calendar-days": CalendarDays,
  "message-square": MessageSquare,
  heart: Heart,
  utensils: Utensils,
  dumbbell: Dumbbell,
  moon: Moon,
  footprints: Footprints,
  droplets: Droplets,
  scale: Scale,
  "check-circle": CheckCircle,
  "trending-up": TrendingUp,
  "file-text": FileText,
  link: Link2,
  user: User,
  shield: Shield,
  settings: Settings,
  users: Users,
  "scroll-text": ScrollText,
  "bar-chart": BarChart3,
  server: Server,
};

function getIcon(iconName: string): React.ElementType {
  return iconMap[iconName] || LayoutDashboard;
}

interface SidebarNavItemProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onHover?: (hovering: boolean) => void;
}

function SidebarNavItem({ item, isActive, collapsed, onHover }: SidebarNavItemProps) {
  const Icon = getIcon(item.icon || "layout-dashboard");

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
          : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-foreground)]",
        collapsed && "justify-center px-2"
      )}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-[var(--color-primary)]" />
      )}

      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          isActive ? "text-[var(--color-primary)]" : "text-[var(--color-tertiary)] group-hover:text-[var(--color-muted-foreground)]"
        )}
      />

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <Badge variant="primary" size="sm">
              {item.badge}
            </Badge>
          )}
        </>
      )}

      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-2 hidden rounded-md bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-foreground)] shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity whitespace-nowrap z-50">
          {item.label}
          {item.description && (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              {item.description}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}

interface SidebarSectionProps {
  title: string;
  items: NavItem[];
  currentPath: string;
  collapsed: boolean;
}

function SidebarSection({ title, items, currentPath, collapsed }: SidebarSectionProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="space-y-1">
      {!collapsed && (
        <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-tertiary)]">
          {title}
        </h3>
      )}
      {items.map((item) => (
        <SidebarNavItem
          key={item.id}
          item={item}
          isActive={isPathActive(currentPath, item.href)}
          collapsed={collapsed}
          onHover={setHovered}
        />
      ))}
    </div>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  isAdmin?: boolean;
}

export function Sidebar({ collapsed, onToggle, user, isAdmin = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-[var(--color-border)] px-4",
            collapsed && "justify-center px-2"
          )}
        >
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]">
              <Zap className="h-5 w-5 text-[var(--color-primary-foreground)]" />
            </div>
            {!collapsed && (
              <span className="text-xl font-bold tracking-tight text-[var(--color-foreground)]">
                AIVO
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scrollbar-thin">
          <SidebarSection
            title="Overview"
            items={appNavOverview}
            currentPath={pathname}
            collapsed={collapsed}
          />

          <SidebarSection
            title="Health"
            items={appNavHealth}
            currentPath={pathname}
            collapsed={collapsed}
          />

          <SidebarSection
            title="Insights"
            items={appNavInsights}
            currentPath={pathname}
            collapsed={collapsed}
          />

          <SidebarSection
            title="Account"
            items={appNavAccount}
            currentPath={pathname}
            collapsed={collapsed}
          />

          {isAdmin && (
            <SidebarSection
              title="Admin"
              items={appNavAdmin}
              currentPath={pathname}
              collapsed={collapsed}
            />
          )}
        </nav>

        {/* User Section */}
        <div className="border-t border-[var(--color-border)] p-3">
          {user ? (
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg p-2",
                collapsed && "justify-center"
              )}
            >
              <Avatar
                src={user.avatar}
                fallback={user.name}
                size="sm"
              />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                    {user.email}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={cn(
                "flex items-center gap-3 rounded-lg p-2 text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-foreground)]",
                collapsed && "justify-center"
              )}
            >
              <User className="h-5 w-5" />
              {!collapsed && <span className="text-sm">Sign In</span>}
            </Link>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={onToggle}
            className={cn(
              "mt-2 flex w-full items-center gap-3 rounded-lg p-2 text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-foreground)]",
              collapsed && "justify-center"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
