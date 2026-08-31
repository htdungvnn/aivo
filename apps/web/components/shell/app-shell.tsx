"use client";

/**
 * AppShell - Main application layout wrapper
 * Provides responsive sidebar, header, and content area
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { MobileNavigation } from "./mobile-navigation";
import { TopHeader } from "./top-header";
import { cn } from "@/lib/utils";

interface AppShellContextValue {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within AppShell");
  }
  return context;
}

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  roles?: string[];
}

export function AppShell({ children, user, roles = [] }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      
      // Auto-collapse sidebar on tablet
      if (width >= 768 && width < 1024) {
        setSidebarCollapsed(true);
      }
      
      // Always show sidebar on desktop
      if (width >= 1024) {
        setSidebarCollapsed(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Determine page title based on pathname
  const getPageTitle = useCallback(() => {
    const pathMap: Record<string, string> = {
      "/dashboard": "Today",
      "/plan": "Daily Plan",
      "/coach": "AI Coach",
      "/health/readiness": "Readiness",
      "/health/nutrition": "Nutrition",
      "/health/workouts": "Workouts",
      "/health/sleep": "Sleep",
      "/health/activity": "Activity",
      "/health/hydration": "Hydration",
      "/health/body": "Body Metrics",
      "/health/habits": "Habits",
      "/progress": "Progress",
      "/reports": "Health Reports",
      "/notifications": "Notifications",
      "/integrations": "Integrations",
      "/profile": "Profile",
      "/security": "Security",
      "/settings": "Settings",
      "/admin/users": "User Management",
      "/admin/audit": "Audit Log",
      "/admin/reports": "System Reports",
      "/admin/system": "System Health",
    };

    // Check exact match first
    if (pathMap[pathname]) {
      return pathMap[pathname];
    }

    // Check partial matches
    for (const [path, title] of Object.entries(pathMap)) {
      if (pathname.startsWith(path + "/")) {
        return title;
      }
    }

    return "AIVO";
  }, [pathname]);

  const contextValue: AppShellContextValue = {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
  };

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className="min-h-screen bg-[var(--color-background)]">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
            user={user}
            isAdmin={roles.includes("admin")}
          />
        )}

        {/* Main Content Area */}
        <div
          className={cn(
            "transition-all duration-300",
            !isMobile && !sidebarCollapsed && "lg:ml-64",
            !isMobile && sidebarCollapsed && "lg:ml-20"
          )}
        >
          {/* Top Header */}
          <TopHeader
            title={getPageTitle()}
            user={user}
            onMenuToggle={toggleSidebar}
            showMenuButton={isMobile || isTablet}
          />

          {/* Page Content */}
          <main
            className={cn(
              "min-h-[calc(100vh-64px)] pb-20 lg:pb-8",
              isMobile ? "pt-2 px-4" : "pt-6 px-6 lg:px-8"
            )}
          >
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileNavigation currentPath={pathname} />}
      </div>
    </AppShellContext.Provider>
  );
}

export { Sidebar } from "./sidebar";
export { MobileNavigation } from "./mobile-navigation";
export { TopHeader } from "./top-header";
