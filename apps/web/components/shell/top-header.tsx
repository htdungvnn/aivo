"use client";

/**
 * TopHeader - Sticky header with breadcrumb, search, and user menu
 */

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Search,
  Bell,
  RefreshCw,
  Sun,
  Moon,
  ChevronDown,
  Settings,
  User,
  Shield,
  LogOut,
  HelpCircle,
  Command,
} from "lucide-react";

interface TopHeaderProps {
  title: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

export function TopHeader({
  title,
  user,
  onMenuToggle,
  showMenuButton = false,
}: TopHeaderProps) {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notificationCount] = useState(3);
  const [isSyncing, setIsSyncing] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close user menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isSearchOpen]);

  // Keyboard shortcut for search
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("light", isDarkMode);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    // Simulate sync
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSyncing(false);
  };

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md px-4 lg:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Page Title / Breadcrumb */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-[var(--color-foreground)] lg:text-xl">
            {title}
          </h1>
        </div>
      </div>

      {/* Center - Search (Desktop) */}
      <div className="hidden lg:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-tertiary)]" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search..."
            className={cn(
              "h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] pl-10 pr-16 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-tertiary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]",
              "transition-all duration-200"
            )}
            onFocus={() => setIsSearchOpen(true)}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex h-5 items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-elevated)] px-1.5 text-xs text-[var(--color-muted-foreground)]">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Mobile Search Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Search"
          onClick={() => setIsSearchOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Sync Status */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSync}
          aria-label={isSyncing ? "Syncing..." : "Sync now"}
          className={cn(isSyncing && "animate-spin")}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("h-5 w-5", isSyncing && "animate-spin")} />
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-error)] text-[10px] font-medium text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </Button>

        {/* User Menu */}
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-[var(--color-elevated)] transition-colors"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
            >
              <Avatar src={user.avatar} fallback={user.name} size="sm" />
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-[var(--color-muted-foreground)] transition-transform hidden sm:block",
                  isUserMenuOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] overflow-hidden animate-fade-in-scale">
                {/* User Info */}
                <div className="border-b border-[var(--color-border)] p-4">
                  <p className="font-medium text-[var(--color-foreground)]">
                    {user.name}
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {user.email}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-foreground)]"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-foreground)]"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <Link
                    href="/security"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-foreground)]"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Shield className="h-4 w-4" />
                    Security
                  </Link>
                  <Link
                    href="/help"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-foreground)]"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Help & Support
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-[var(--color-border)] p-2">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-muted)]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm">Sign In</Button>
          </Link>
        )}
      </div>

      {/* Mobile Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[var(--color-overlay-dark)]"
            onClick={() => setIsSearchOpen(false)}
          />
          <div className="relative bg-[var(--color-surface)] p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-tertiary)]" />
              <input
                type="search"
                placeholder="Search AIVO..."
                className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] pl-12 pr-4 text-base text-[var(--color-foreground)] placeholder:text-[var(--color-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                autoFocus
              />
            </div>
            <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
              Search for workouts, meals, insights, and more...
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
