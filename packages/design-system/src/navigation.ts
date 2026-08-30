/**
 * AIVO Design System - Navigation Configuration
 * Typed navigation structure for landing page
 */

export interface NavItem {
  id: string;
  label: string;
  href: string;
  description?: string;
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
