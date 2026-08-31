/**
 * AIVO Design System - Navigation Configuration
 * Typed navigation structure for landing page and app
 */

export interface NavItem {
  id: string;
  label: string;
  href: string;
  description?: string;
  icon?: string;
  badge?: string | number;
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export interface SocialLink {
  platform: "twitter" | "instagram" | "facebook" | "linkedin" | "github";
  url: string;
  label: string;
}

// =============================================================================
// Landing Page Navigation
// =============================================================================

export const mainNav: NavItem[] = [
  {
    id: "features",
    label: "Features",
    href: "#features",
  },
  {
    id: "how-it-works",
    label: "How it works",
    href: "#how-it-works",
  },
  {
    id: "pricing",
    label: "Pricing",
    href: "#pricing",
  },
  {
    id: "faq",
    label: "FAQ",
    href: "#faq",
  },
];

export const footerNav: NavSection[] = [
  {
    id: "product",
    title: "Product",
    items: [
      {
        id: "features",
        label: "Features",
        href: "#features",
      },
      {
        id: "pricing",
        label: "Pricing",
        href: "#pricing",
      },
      {
        id: "mobile",
        label: "Mobile App",
        href: "#platform",
      },
      {
        id: "changelog",
        label: "Changelog",
        href: "/changelog",
      },
    ],
  },
  {
    id: "company",
    title: "Company",
    items: [
      {
        id: "about",
        label: "About",
        href: "/about",
      },
      {
        id: "blog",
        label: "Blog",
        href: "/blog",
      },
      {
        id: "careers",
        label: "Careers",
        href: "/careers",
      },
      {
        id: "contact",
        label: "Contact",
        href: "/contact",
      },
    ],
  },
  {
    id: "legal",
    title: "Legal",
    items: [
      {
        id: "privacy",
        label: "Privacy Policy",
        href: "/privacy",
      },
      {
        id: "terms",
        label: "Terms of Service",
        href: "/terms",
      },
      {
        id: "cookies",
        label: "Cookie Policy",
        href: "/cookies",
      },
      {
        id: "hipaa",
        label: "Health Data Policy",
        href: "/health-data",
      },
    ],
  },
];

export const socialLinks: SocialLink[] = [
  {
    platform: "twitter",
    url: "https://twitter.com/aivoapp",
    label: "Follow AIVO on Twitter",
  },
  {
    platform: "instagram",
    url: "https://instagram.com/aivoapp",
    label: "Follow AIVO on Instagram",
  },
  {
    platform: "facebook",
    url: "https://facebook.com/aivoapp",
    label: "Follow AIVO on Facebook",
  },
  {
    platform: "linkedin",
    url: "https://linkedin.com/company/aivoapp",
    label: "Follow AIVO on LinkedIn",
  },
];

export const authNav = {
  signIn: {
    label: "Sign in",
    href: "/login",
  },
  signUp: {
    label: "Get Started",
    href: "/login",
  },
} as const;

// =============================================================================
// App Navigation - Desktop
// =============================================================================

export const appNavOverview: NavItem[] = [
  {
    id: "today",
    label: "Today",
    href: "/dashboard",
    description: "Daily overview and recommendations",
  },
  {
    id: "plan",
    label: "Daily Plan",
    href: "/plan",
    description: "Your personalized daily schedule",
  },
  {
    id: "coach",
    label: "AI Coach",
    href: "/coach",
    description: "Chat with your AI health coach",
  },
];

export const appNavHealth: NavItem[] = [
  {
    id: "readiness",
    label: "Readiness",
    href: "/health/readiness",
    description: "Your daily readiness score",
  },
  {
    id: "nutrition",
    label: "Nutrition",
    href: "/health/nutrition",
    description: "Track meals and macros",
  },
  {
    id: "workouts",
    label: "Workouts",
    href: "/health/workouts",
    description: "Your workout plan",
  },
  {
    id: "sleep",
    label: "Sleep",
    href: "/health/sleep",
    description: "Sleep quality and patterns",
  },
  {
    id: "activity",
    label: "Activity",
    href: "/health/activity",
    description: "Steps and movement",
  },
  {
    id: "hydration",
    label: "Hydration",
    href: "/health/hydration",
    description: "Water intake tracking",
  },
  {
    id: "body",
    label: "Body Metrics",
    href: "/health/body",
    description: "Weight and measurements",
  },
  {
    id: "habits",
    label: "Habits",
    href: "/health/habits",
    description: "Daily habit tracking",
  },
];

export const appNavInsights: NavItem[] = [
  {
    id: "progress",
    label: "Progress",
    href: "/progress",
    description: "Analytics and trends",
  },
  {
    id: "reports",
    label: "Health Reports",
    href: "/reports",
    description: "Weekly and monthly reports",
  },
];

export const appNavAccount: NavItem[] = [
  {
    id: "integrations",
    label: "Integrations",
    href: "/integrations",
    description: "Connected devices and apps",
  },
  {
    id: "profile",
    label: "Profile",
    href: "/profile",
    description: "Your account details",
  },
  {
    id: "security",
    label: "Security",
    href: "/security",
    description: "Privacy and security settings",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    description: "App preferences",
  },
];

export const appNavAdmin: NavItem[] = [
  {
    id: "admin-users",
    label: "Users",
    href: "/admin/users",
    description: "User management",
  },
  {
    id: "admin-audit",
    label: "Audit Log",
    href: "/admin/audit",
    description: "Security audit log",
  },
  {
    id: "admin-reports",
    label: "Reports",
    href: "/admin/reports",
    description: "System reports",
  },
  {
    id: "admin-system",
    label: "System",
    href: "/admin/system",
    description: "System health",
  },
];

// =============================================================================
// App Navigation - Mobile (Bottom Tab)
// =============================================================================

export const mobileNavItems: NavItem[] = [
  {
    id: "today",
    label: "Today",
    href: "/dashboard",
  },
  {
    id: "plan",
    label: "Plan",
    href: "/plan",
  },
  {
    id: "coach",
    label: "Coach",
    href: "/coach",
  },
  {
    id: "progress",
    label: "Progress",
    href: "/progress",
  },
  {
    id: "more",
    label: "More",
    href: "/settings",
  },
];

// =============================================================================
// Navigation Helpers
// =============================================================================

/**
 * Get navigation section by ID
 */
export function getNavSection(id: string): NavSection | undefined {
  return footerNav.find((section) => section.id === id);
}

/**
 * Get nav item by ID from all app navigation
 */
export function getNavItem(id: string): NavItem | undefined {
  const allItems = [
    ...appNavOverview,
    ...appNavHealth,
    ...appNavInsights,
    ...appNavAccount,
    ...appNavAdmin,
  ];
  return allItems.find((item) => item.id === id);
}

/**
 * Check if a path is active
 */
export function isPathActive(path: string, href: string): boolean {
  if (href === "/dashboard") {
    return path === "/" || path === "/dashboard";
  }
  return path.startsWith(href);
}
